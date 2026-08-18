from rest_framework import serializers
from django.contrib.auth import authenticate
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
            raise serializers.ValidationError("Este correo electrónico ya está registrado.")
        return normalized_email

    def validate_rut(self, value):
        cleaned_rut = value.strip()
        if PerfilApoderado.objects.filter(rut=cleaned_rut).exists():
            raise serializers.ValidationError("Este RUT ya está registrado.")
        return cleaned_rut

    def create(self, validated_data):
        nombre = validated_data['nombre']
        apellido = validated_data['apellido']
        rut = validated_data['rut']
        email = validated_data['email']
        telefono = validated_data.get('telefono', '')
        password = validated_data['password']

        usuario = Usuario.objects.create_user(
            username=email,
            email=email,
            password=password,
            first_name=nombre,
            last_name=apellido,
            rol='apoderado'
        )

        PerfilApoderado.objects.create(
            usuario=usuario,
            rut=rut,
            telefono=telefono
        )

        return usuario


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)

    def validate(self, data):
        email = data.get('email', '').lower().strip()
        password = data.get('password', '')

        if not email or not password:
            raise serializers.ValidationError("Debe ingresar correo y contraseña.")

        user = authenticate(username=email, password=password)

        if not user:
            # Fallback check if user exists by email
            try:
                user_obj = Usuario.objects.get(email=email)
                if user_obj.check_password(password):
                    user = user_obj
            except Usuario.DoesNotExist:
                pass

        if not user:
            raise serializers.ValidationError("Correo electrónico o contraseña incorrectos.")

        if not user.is_active:
            raise serializers.ValidationError("Esta cuenta de usuario está desactivada.")

        data['user'] = user
        return data


class UsuarioResponseSerializer(serializers.ModelSerializer):
    rut = serializers.SerializerMethodField()
    telefono = serializers.SerializerMethodField()

    class Meta:
        model = Usuario
        fields = ['id', 'email', 'first_name', 'last_name', 'rol', 'rut', 'telefono']

    def get_rut(self, obj):
        if hasattr(obj, 'perfil_apoderado'):
            return obj.perfil_apoderado.rut
        return None

    def get_telefono(self, obj):
        if hasattr(obj, 'perfil_apoderado'):
            return obj.perfil_apoderado.telefono
        return None


class EstudianteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Estudiante
        fields = [
            'id',
            'nombre',
            'apellido',
            'rut',
            'fecha_nacimiento',
            'colegio',
            'curso',
            'direccion_principal',
            'direccion_alternativa',
            'persona_autorizada',
            'rut_persona_autorizada',
            'created_at',
            'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def validate_rut(self, value):
        cleaned_rut = value.strip()
        if Estudiante.objects.filter(rut=cleaned_rut).exists():
            raise serializers.ValidationError("Este RUT de estudiante ya está registrado.")
        return cleaned_rut
