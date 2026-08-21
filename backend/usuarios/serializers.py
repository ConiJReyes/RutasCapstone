from io import BytesIO

from django.contrib.auth import authenticate
from django.core.files.base import ContentFile
from PIL import Image, ImageOps, UnidentifiedImageError
from rest_framework import serializers

from .models import Usuario, PerfilApoderado, Estudiante


class RegistroApoderadoSerializer(serializers.Serializer):
    nombre = serializers.CharField(max_length=150)
    apellido = serializers.CharField(max_length=150)
    rut = serializers.CharField(max_length=12)
    email = serializers.EmailField()
    telefono = serializers.CharField(max_length=20, required=False, allow_blank=True)
    password = serializers.CharField(write_only=True, min_length=6)

    def validate_email(self, value):
        normalized_email = value.lower().strip()
        if Usuario.objects.filter(email=normalized_email).exists():
            raise serializers.ValidationError('Este correo electrónico ya está registrado.')
        return normalized_email

    def validate_rut(self, value):
        cleaned_rut = value.strip()
        if PerfilApoderado.objects.filter(rut=cleaned_rut).exists():
            raise serializers.ValidationError('Este RUT ya está registrado.')
        return cleaned_rut

    def create(self, validated_data):
        usuario = Usuario.objects.create_user(
            username=validated_data['email'], email=validated_data['email'],
            password=validated_data['password'], first_name=validated_data['nombre'],
            last_name=validated_data['apellido'], rol='apoderado'
        )
        PerfilApoderado.objects.create(usuario=usuario, rut=validated_data['rut'], telefono=validated_data.get('telefono', ''))
        return usuario


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)

    def validate(self, data):
        email = data.get('email', '').lower().strip()
        password = data.get('password', '')
        if not email or not password:
            raise serializers.ValidationError('Debe ingresar correo y contraseña.')
        user = authenticate(username=email, password=password)
        if not user:
            try:
                user_obj = Usuario.objects.get(email=email)
                if user_obj.check_password(password):
                    user = user_obj
            except Usuario.DoesNotExist:
                pass
        if not user:
            raise serializers.ValidationError('Correo electrónico o contraseña incorrectos.')
        if not user.is_active:
            raise serializers.ValidationError('Esta cuenta de usuario está desactivada.')
        data['user'] = user
        return data


class UsuarioResponseSerializer(serializers.ModelSerializer):
    rut = serializers.SerializerMethodField()
    telefono = serializers.SerializerMethodField()

    class Meta:
        model = Usuario
        fields = ['id', 'email', 'first_name', 'last_name', 'rol', 'rut', 'telefono']

    def get_rut(self, obj):
        return obj.perfil_apoderado.rut if hasattr(obj, 'perfil_apoderado') else None

    def get_telefono(self, obj):
        return obj.perfil_apoderado.telefono if hasattr(obj, 'perfil_apoderado') else None


class EstudianteSerializer(serializers.ModelSerializer):
    tiene_foto = serializers.SerializerMethodField(read_only=True)
    MAX_FOTO_BYTES = 5 * 1024 * 1024
    MAX_FOTO_PIXELS = 20_000_000
    FORMATOS_PERMITIDOS = {'JPEG', 'PNG', 'WEBP'}

    class Meta:
        model = Estudiante
        fields = ['id', 'nombre', 'apellido', 'rut', 'fecha_nacimiento', 'colegio', 'curso',
                  'direccion_principal', 'direccion_alternativa', 'persona_autorizada',
                  'rut_persona_autorizada', 'foto', 'tiene_foto', 'created_at', 'updated_at']
        read_only_fields = ['id', 'tiene_foto', 'created_at', 'updated_at']
        extra_kwargs = {'foto': {'write_only': True, 'required': False, 'allow_null': True}}

    def get_tiene_foto(self, obj):
        return bool(obj.foto)

    def validate_rut(self, value):
        cleaned_rut = value.strip()
        if Estudiante.objects.filter(rut=cleaned_rut).exists():
            raise serializers.ValidationError('Este RUT de estudiante ya está registrado.')
        return cleaned_rut

    def validate_foto(self, foto):
        if foto.size > self.MAX_FOTO_BYTES:
            raise serializers.ValidationError('La foto no puede superar los 5 MB.')
        try:
            imagen = Image.open(foto)
            formato = imagen.format
            ancho, alto = imagen.size
            imagen.verify()
        except (UnidentifiedImageError, OSError, ValueError, Image.DecompressionBombError):
            raise serializers.ValidationError('El archivo no es una imagen válida.')
        finally:
            foto.seek(0)
        if formato not in self.FORMATOS_PERMITIDOS:
            raise serializers.ValidationError('Solo se permiten imágenes JPEG, PNG o WebP.')
        if ancho * alto > self.MAX_FOTO_PIXELS:
            raise serializers.ValidationError('La resolución de la foto es demasiado alta.')
        return foto

    @staticmethod
    def _normalizar_foto(foto):
        """Re-codifica la imagen y elimina EXIF, incluida posible geolocalización."""
        foto.seek(0)
        with Image.open(foto) as imagen:
            imagen = ImageOps.exif_transpose(imagen)
            imagen.load()
            if imagen.mode in ('RGBA', 'LA'):
                fondo = Image.new('RGB', imagen.size, 'white')
                fondo.paste(imagen, mask=imagen.getchannel('A'))
                imagen = fondo
            elif imagen.mode != 'RGB':
                imagen = imagen.convert('RGB')
            buffer = BytesIO()
            imagen.save(buffer, format='JPEG', quality=88, optimize=True)
            return ContentFile(buffer.getvalue(), name='foto.jpg')

    def create(self, validated_data):
        foto = validated_data.pop('foto', None)
        estudiante = Estudiante(**validated_data)
        if foto:
            estudiante.foto.save('foto.jpg', self._normalizar_foto(foto), save=False)
        estudiante.save()
        return estudiante


class EstudianteUpdateSerializer(serializers.ModelSerializer):
    """Campos que un apoderado puede actualizar; RUT y foto quedan excluidos."""
    class Meta:
        model = Estudiante
        fields = [
            'nombre', 'apellido', 'fecha_nacimiento', 'colegio', 'curso',
            'direccion_principal', 'direccion_alternativa', 'persona_autorizada',
            'rut_persona_autorizada'
        ]

    def validate(self, attrs):
        if 'rut' in self.initial_data:
            raise serializers.ValidationError({
                'rut': 'El RUT del estudiante no puede modificarse.'
            })
        return attrs
