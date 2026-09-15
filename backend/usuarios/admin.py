from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import Usuario, PerfilApoderado, PerfilConductor, Estudiante, CodigoRecuperacion


@admin.register(Usuario)
class UsuarioAdmin(UserAdmin):
    list_display = ('email', 'first_name', 'last_name', 'rol', 'is_staff', 'is_active', 'date_joined')
    list_filter = ('rol', 'is_staff', 'is_active')
    search_fields = ('email', 'first_name', 'last_name')
    ordering = ('-date_joined',)
    fieldsets = UserAdmin.fieldsets + (
        ('Rol Personalizado', {'fields': ('rol',)}),
    )


@admin.register(PerfilApoderado)
class PerfilApoderadoAdmin(admin.ModelAdmin):
    list_display = ('id', 'usuario', 'rut', 'telefono', 'created_at')
    search_fields = ('usuario__email', 'usuario__first_name', 'usuario__last_name', 'rut', 'telefono')
    raw_id_fields = ('usuario',)


@admin.register(PerfilConductor)
class PerfilConductorAdmin(admin.ModelAdmin):
    list_display = ('id', 'usuario', 'rut', 'telefono', 'licencia_conducir', 'created_at')
    search_fields = ('usuario__email', 'usuario__first_name', 'usuario__last_name', 'rut', 'telefono', 'licencia_conducir')
    raw_id_fields = ('usuario',)


@admin.register(Estudiante)
class EstudianteAdmin(admin.ModelAdmin):
    list_display = ('id', 'nombre', 'apellido', 'rut', 'colegio', 'curso', 'apoderado', 'created_at')
    search_fields = ('nombre', 'apellido', 'rut', 'colegio', 'curso', 'apoderado__usuario__email')
    list_filter = ('colegio', 'curso')
    raw_id_fields = ('apoderado',)


@admin.register(CodigoRecuperacion)
class CodigoRecuperacionAdmin(admin.ModelAdmin):
    list_display = ('usuario', 'codigo', 'creado_en', 'usado')
    search_fields = ('usuario__email', 'codigo')
    list_filter = ('usado',)

