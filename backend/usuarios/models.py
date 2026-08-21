from django.contrib.auth.models import AbstractUser
from django.db import models
from uuid import uuid4


def foto_estudiante_upload_to(instance, filename):
    """Genera un nombre no predecible para el archivo privado."""
    return f"fotos_estudiantes/{uuid4().hex}.jpg"

class Usuario(AbstractUser):
    ROLES = (
        ('apoderado', 'Apoderado'),
        ('conductor', 'Conductor'),
        ('admin', 'Administrador'),
    )

    email = models.EmailField(unique=True)
    rol = models.CharField(max_length=20, choices=ROLES, default='apoderado')

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username', 'first_name', 'last_name']

    def save(self, *args, **kwargs):
        if not self.username:
            self.username = self.email
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.email} ({self.get_rol_display()})"


class PerfilApoderado(models.Model):
    usuario = models.OneToOneField(
        Usuario,
        on_delete=models.CASCADE,
        related_name='perfil_apoderado'
    )
    rut = models.CharField(max_length=12, unique=True, null=True, blank=True)
    telefono = models.CharField(max_length=20, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Apoderado: {self.usuario.get_full_name()} ({self.rut})"


class Estudiante(models.Model):
    apoderado = models.ForeignKey(
        PerfilApoderado,
        on_delete=models.CASCADE,
        related_name='estudiantes'
    )
    nombre = models.CharField(max_length=150)
    apellido = models.CharField(max_length=150)
    rut = models.CharField(max_length=12, unique=True)
    fecha_nacimiento = models.DateField()
    colegio = models.CharField(max_length=200)
    curso = models.CharField(max_length=100)
    direccion_principal = models.CharField(max_length=255)
    direccion_alternativa = models.CharField(max_length=255, null=True, blank=True)
    persona_autorizada = models.CharField(max_length=200, null=True, blank=True)
    rut_persona_autorizada = models.CharField(max_length=12, null=True, blank=True)
    foto = models.ImageField(
        upload_to=foto_estudiante_upload_to,
        null=True,
        blank=True,
        help_text='Foto privada del estudiante; nunca se publica como archivo estático.'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Estudiante: {self.nombre} {self.apellido} ({self.rut})"





from django.utils import timezone
from datetime import timedelta


class CodigoRecuperacion(models.Model):

    usuario = models.ForeignKey(
        Usuario,
        on_delete=models.CASCADE,
        related_name='codigos_recuperacion'
    )

    codigo = models.CharField(max_length=6)

    creado_en = models.DateTimeField(auto_now_add=True)

    usado = models.BooleanField(default=False)

    def esta_vigente(self):
        return (
            not self.usado
            and timezone.now() <= self.creado_en + timedelta(minutes=10)
        )

    def __str__(self):
        return f'{self.usuario.email} - {self.codigo}'