from django.contrib.auth.models import AbstractUser
from django.db import models

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
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Estudiante: {self.nombre} {self.apellido} ({self.rut})"
