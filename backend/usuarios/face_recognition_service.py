import os
import base64
import numpy as np
import cv2
from django.conf import settings
from .models import Estudiante, PerfilApoderado, PerfilDelegado

# Rutas absolutas a los modelos ONNX dentro del backend
BASE_PATH = getattr(settings, 'BASE_DIR', os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
MODELS_DIR = os.path.join(BASE_PATH, 'usuarios', 'models_onnx')

DETECTOR_MODEL = os.path.join(MODELS_DIR, 'face_detection_yunet_2026may.onnx')
RECOGNITION_MODEL = os.path.join(MODELS_DIR, 'face_recognition_sface_2021dec.onnx')

class FaceRecognitionEngine:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(FaceRecognitionEngine, cls).__new__(cls)
            cls._instance._init_models()
        return cls._instance

    def _init_models(self):
        if not os.path.exists(DETECTOR_MODEL) or not os.path.exists(RECOGNITION_MODEL):
            print(f"[FaceRecognitionEngine] ERROR: No se encontraron los modelos ONNX en {DETECTOR_MODEL} o {RECOGNITION_MODEL}")
            self.detector = None
            self.recognizer = None
            return

        try:
            self.detector = cv2.FaceDetectorYN.create(
                DETECTOR_MODEL,
                "",
                (320, 320),
                0.9,
                0.3,
                5000
            )
            self.recognizer = cv2.FaceRecognizerSF.create(
                RECOGNITION_MODEL,
                ""
            )
            print("[FaceRecognitionEngine] Modelos YuNet + SFace cargados exitosamente.")
        except Exception as e:
            print(f"[FaceRecognitionEngine] Error al inicializar modelos: {e}")
            self.detector = None
            self.recognizer = None

    def extraer_embedding(self, frame):
        """Dada una matriz OpenCV (BGR), detecta rostro y extrae vector SFace (128 floats)."""
        if self.detector is None or self.recognizer is None:
            return None

        if frame is None or frame.size == 0:
            return None

        height, width = frame.shape[:2]
        self.detector.setInputSize((width, height))

        _, faces = self.detector.detect(frame)
        if faces is None or len(faces) == 0:
            return None

        # Tomar el primer rostro detectado (el de mayor confianza)
        face = faces[0]
        aligned_face = self.recognizer.alignCrop(frame, face)
        feature = self.recognizer.feature(aligned_face)
        return feature.flatten().tolist()

    def extraer_embedding_de_bytes(self, image_bytes):
        """Convierte bytes de imagen (JPEG/PNG) o Base64 a matriz OpenCV y extrae embedding."""
        if isinstance(image_bytes, str):
            if ',' in image_bytes:
                image_bytes = image_bytes.split(',')[1]
            image_bytes = base64.b64decode(image_bytes)

        nparr = np.frombuffer(image_bytes, np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        return self.extraer_embedding(frame)

    def procesar_foto_estudiante(self, image_bytes):
        """
        Procesa una imagen recibida para el registro biométrico de un estudiante.
        Validaciones estrictas:
        - 0 rostros -> rechazar.
        - >1 rostros -> rechazar.
        - 1 rostro -> extraer embedding SFace (128 floats).
        """
        if isinstance(image_bytes, str):
            if ',' in image_bytes:
                image_bytes = image_bytes.split(',')[1]
            image_bytes = base64.b64decode(image_bytes)

        if not image_bytes:
            return False, "La imagen proporcionada está vacía o es inválida."

        nparr = np.frombuffer(image_bytes, np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if frame is None or frame.size == 0:
            return False, "No se pudo decodificar el formato de la imagen subida."

        if self.detector is None or self.recognizer is None:
            return False, "El motor biométrico YuNet/SFace no se encuentra inicializado."

        height, width = frame.shape[:2]
        self.detector.setInputSize((width, height))

        _, faces = self.detector.detect(frame)

        if faces is None or len(faces) == 0:
            return False, "No se detectó ningún rostro en la imagen. Por favor sube una foto clara del estudiante."

        num_faces = len(faces)
        if num_faces > 1:
            return False, f"Se detectaron {num_faces} rostros en la imagen. Debe contener únicamente el rostro del estudiante."

        face = faces[0]
        aligned_face = self.recognizer.alignCrop(frame, face)
        feature = self.recognizer.feature(aligned_face)
        embedding = feature.flatten().tolist()
        return True, embedding

    def comparar_embeddings(self, emb1, emb2):
        """Calcula similitud de coseno SFace entre dos vectores de 128 floats."""
        if not emb1 or not emb2 or len(emb1) != 128 or len(emb2) != 128:
            return -1.0

        f1 = np.array(emb1, dtype=np.float32).reshape(1, -1)
        f2 = np.array(emb2, dtype=np.float32).reshape(1, -1)

        score = self.recognizer.match(f1, f2, cv2.FaceRecognizerSF_FR_COSINE)
        return float(score)


def procesar_identificacion_facial(conductor_perfil, imagen_raw, modo='abordar', threshold=0.363):
    """
    Busca coincidencias faciales REALES acotadas únicamente a los estudiantes y personas
    autorizadas de la ruta activa del conductor.
    """
    engine = FaceRecognitionEngine()
    embedding_capturado = engine.extraer_embedding_de_bytes(imagen_raw)

    if not embedding_capturado:
        return {
            'coincidencia': False,
            'motivo': 'no_rostro_detectado',
            'mensaje': 'No se detectó ningún rostro claro en la captura. Por favor, vuelve a enfocar.'
        }

    # 1. Obtener los estudiantes asignados a este conductor
    estudiantes_ruta = Estudiante.objects.filter(conductor=conductor_perfil)
    if not estudiantes_ruta.exists():
        return {
            'coincidencia': False,
            'motivo': 'sin_estudiantes_asignados',
            'mensaje': 'El conductor no tiene estudiantes asignados en su ruta activa.'
        }

    candidatos = []

    if modo == 'abordar':
        # En abordaje, se valida la cara del estudiante
        for est in estudiantes_ruta:
            emb = est.embedding_facial
            # Si no tiene embedding previo pero sí foto, intentar computarlo on-the-fly
            if not emb and est.foto and os.path.exists(est.foto.path):
                try:
                    with open(est.foto.path, 'rb') as f:
                        emb = engine.extraer_embedding_de_bytes(f.read())
                        if emb:
                            est.embedding_facial = emb
                            est.save(update_fields=['embedding_facial'])
                except Exception as ex:
                    print(f"[FaceRecognitionService] Error leyendo foto estudiante {est.id}: {ex}")

            if emb:
                candidatos.append({
                    'tipo': 'ESTUDIANTE',
                    'objeto': est,
                    'embedding': emb,
                    'nombre': f"{est.nombre} {est.apellido}",
                    'rut': est.rut,
                    'estudiante_id': est.id,
                    'estudiante_nombre': f"{est.nombre} {est.apellido}",
                    'colegio': est.colegio,
                    'curso': est.curso
                })

    else:
        # En entrega, se valida la persona autorizada (Apoderado o Delegado autorizado)
        for est in estudiantes_ruta:
            # Apoderado titular
            apoderado = est.apoderado
            if apoderado:
                emb = apoderado.embedding_facial
                if not emb and apoderado.foto and os.path.exists(apoderado.foto.path):
                    try:
                        with open(apoderado.foto.path, 'rb') as f:
                            emb = engine.extraer_embedding_de_bytes(f.read())
                            if emb:
                                apoderado.embedding_facial = emb
                                apoderado.save(update_fields=['embedding_facial'])
                    except Exception as ex:
                        print(f"[FaceRecognitionService] Error leyendo foto apoderado {apoderado.id}: {ex}")

                if emb:
                    candidatos.append({
                        'tipo': 'APODERADO',
                        'objeto': apoderado,
                        'embedding': emb,
                        'nombre': apoderado.usuario.get_full_name() or apoderado.usuario.email,
                        'rut': apoderado.rut,
                        'estudiante_id': est.id,
                        'estudiante_nombre': f"{est.nombre} {est.apellido}",
                        'colegio': est.colegio,
                        'curso': est.curso,
                        'relacion': 'Apoderado Titular'
                    })

            # Delegado autorizado por RUT (si existe)
            if est.rut_persona_autorizada:
                delegado = PerfilDelegado.objects.filter(rut=est.rut_persona_autorizada).first()
                if delegado:
                    emb = delegado.embedding_facial
                    if not emb and delegado.foto and os.path.exists(delegado.foto.path):
                        try:
                            with open(delegado.foto.path, 'rb') as f:
                                emb = engine.extraer_embedding_de_bytes(f.read())
                                if emb:
                                    delegado.embedding_facial = emb
                                    delegado.save(update_fields=['embedding_facial'])
                        except Exception as ex:
                            print(f"[FaceRecognitionService] Error leyendo foto delegado {delegado.id}: {ex}")

                    if emb:
                        candidatos.append({
                            'tipo': 'DELEGADO',
                            'objeto': delegado,
                            'embedding': emb,
                            'nombre': est.persona_autorizada or (delegado.usuario.get_full_name() or delegado.usuario.email),
                            'rut': delegado.rut,
                            'estudiante_id': est.id,
                            'estudiante_nombre': f"{est.nombre} {est.apellido}",
                            'colegio': est.colegio,
                            'curso': est.curso,
                            'relacion': 'Delegado Autorizado'
                        })

    if not candidatos:
        return {
            'coincidencia': False,
            'motivo': 'sin_biometria_registrada',
            'mensaje': 'No hay vectores faciales registrados para los estudiantes o personas autorizadas de esta ruta.'
        }

    # 2. Comparar embedding capturado contra candidatos de la ruta activa
    mejor_coincidencia = None
    mejor_score = -1.0

    for cand in candidatos:
        score = engine.comparar_embeddings(embedding_capturado, cand['embedding'])
        if score > mejor_score:
            mejor_score = score
            mejor_coincidencia = cand

    if mejor_coincidencia and mejor_score >= threshold:
        similitud_porcentaje = round(min(100.0, max(0.0, mejor_score * 100)), 1)
        return {
            'coincidencia': True,
            'score': round(mejor_score, 4),
            'similitud_porcentaje': similitud_porcentaje,
            'tipo_identificado': mejor_coincidencia['tipo'],
            'nombre_identificado': mejor_coincidencia['nombre'],
            'rut_identificado': mejor_coincidencia.get('rut', ''),
            'estudiante_id': mejor_coincidencia['estudiante_id'],
            'estudiante_nombre': mejor_coincidencia['estudiante_nombre'],
            'colegio': mejor_coincidencia.get('colegio', ''),
            'curso': mejor_coincidencia.get('curso', ''),
            'relacion': mejor_coincidencia.get('relacion', 'Estudiante'),
            'mensaje': f"¡Rostro de {mejor_coincidencia['nombre']} identificado exitosamente!"
        }
    else:
        return {
            'coincidencia': False,
            'motivo': 'bajo_umbral',
            'score_maximo': round(mejor_score, 4) if mejor_score > 0 else 0,
            'mensaje': 'Rostro no identificado entre las personas autorizadas de esta ruta.'
        }
