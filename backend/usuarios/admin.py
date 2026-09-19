from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import Usuario, PerfilApoderado, PerfilConductor, PerfilDelegado, Estudiante, CodigoRecuperacion, Colegio, Sede, Furgon, Ruta


@admin.register(Colegio)
class ColegioAdmin(admin.ModelAdmin):
    list_display = ('id', 'nombre', 'rbd', 'telefono', 'email_contacto', 'activo', 'created_at')
    search_fields = ('nombre', 'rbd', 'email_contacto')
    list_filter = ('activo',)


@admin.register(Sede)
class SedeAdmin(admin.ModelAdmin):
    list_display = ('id', 'nombre', 'colegio', 'telefono', 'activa', 'created_at')
    search_fields = ('nombre', 'colegio__nombre')
    list_filter = ('colegio', 'activa')


@admin.register(Usuario)
class UsuarioAdmin(UserAdmin):
    list_display = ('email', 'first_name', 'last_name', 'rol', 'colegio', 'is_staff', 'is_active', 'date_joined')
    list_filter = ('rol', 'colegio', 'is_staff', 'is_active')
    search_fields = ('email', 'first_name', 'last_name')
    ordering = ('-date_joined',)
    fieldsets = UserAdmin.fieldsets + (
        ('Rol y Colegio', {'fields': ('rol', 'colegio')}),
    )


@admin.register(PerfilApoderado)
class PerfilApoderadoAdmin(admin.ModelAdmin):
    list_display = ('id', 'usuario', 'colegio', 'rut', 'telefono', 'created_at')
    search_fields = ('usuario__email', 'usuario__first_name', 'usuario__last_name', 'rut', 'telefono')
    list_filter = ('colegio',)
    raw_id_fields = ('usuario',)


@admin.register(PerfilConductor)
class PerfilConductorAdmin(admin.ModelAdmin):
    list_display = ('id', 'usuario', 'colegio', 'rut', 'telefono', 'licencia_conducir', 'created_at')
    search_fields = ('usuario__email', 'usuario__first_name', 'usuario__last_name', 'rut', 'telefono', 'licencia_conducir')
    list_filter = ('colegio',)
    raw_id_fields = ('usuario',)


@admin.register(PerfilDelegado)
class PerfilDelegadoAdmin(admin.ModelAdmin):
    list_display = ('id', 'usuario', 'colegio', 'rut', 'telefono', 'created_at')
    search_fields = ('usuario__email', 'usuario__first_name', 'usuario__last_name', 'rut', 'telefono')
    list_filter = ('colegio',)
    raw_id_fields = ('usuario',)


@admin.register(Estudiante)
class EstudianteAdmin(admin.ModelAdmin):
    list_display = ('id', 'nombre', 'apellido', 'rut', 'colegio', 'sede', 'curso', 'apoderado', 'created_at')
    search_fields = ('nombre', 'apellido', 'rut', 'curso', 'apoderado__usuario__email')
    list_filter = ('colegio', 'sede', 'curso')
    raw_id_fields = ('apoderado', 'conductor')


@admin.register(Furgon)
class FurgonAdmin(admin.ModelAdmin):
    list_display = ('id', 'patente', 'marca_modelo', 'colegio', 'sede', 'capacidad', 'estado', 'created_at')
    search_fields = ('patente', 'marca_modelo', 'conductor_asignado')
    list_filter = ('colegio', 'sede', 'estado')


@admin.register(Ruta)
class RutaAdmin(admin.ModelAdmin):
    list_display = ('id', 'nombre', 'colegio', 'sede', 'conductor', 'estado', 'created_at')
    search_fields = ('nombre', 'conductor')
    list_filter = ('colegio', 'sede', 'estado')


@admin.register(CodigoRecuperacion)
class CodigoRecuperacionAdmin(admin.ModelAdmin):
    list_display = ('usuario', 'codigo', 'creado_en', 'usado')
    search_fields = ('usuario__email', 'codigo')
    list_filter = ('usado',)


