from django.contrib import admin
from django.urls import path, include
from usuarios.views import (
    EstudianteListCreateView,
    EstudianteDetailView,
    EstudianteFotoView,
    EstudianteSinAsignarListView,
    ConductorListCreateView,
    ConductorDetailView,
    ConductorEstudiantesListView,
    ConductorAsignarEstudiantesView,
    ConductorDesasignarEstudianteView,
    ApoderadoListCreateView,
    ApoderadoDetailView,
    CambiarPasswordView,
    DashboardStatsView,
    RegistrarFCMTokenView,
    NotificacionListView,
    MarcarNotificacionLeidaView,
    MarcarTodasNotificacionesLeidasView,
    RutaIniciarView,
    RutaEscanearQRView,
    RutaFinalizarView,
    EmergenciaCrearView,
    AvisoSistemaView
)

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/', include('usuarios.urls')),
    path('api/estudiantes/', EstudianteListCreateView.as_view(), name='estudiantes-list-create'),
    path('api/estudiantes/sin-asignar/', EstudianteSinAsignarListView.as_view(), name='estudiantes-sin-asignar'),
    path('api/estudiantes/<int:estudiante_id>/', EstudianteDetailView.as_view(), name='estudiante-detail'),
    path('api/estudiantes/<int:estudiante_id>/foto/', EstudianteFotoView.as_view(), name='estudiante-foto'),
    path('api/conductores/', ConductorListCreateView.as_view(), name='conductores-list-create'),
    path('api/conductores/<int:conductor_id>/', ConductorDetailView.as_view(), name='conductor-detail'),
    path('api/conductores/<int:conductor_id>/estudiantes/', ConductorEstudiantesListView.as_view(), name='conductor-estudiantes-list'),
    path('api/conductores/<int:conductor_id>/asignar-estudiantes/', ConductorAsignarEstudiantesView.as_view(), name='conductor-asignar-estudiantes'),
    path('api/conductores/<int:conductor_id>/desasignar-estudiante/', ConductorDesasignarEstudianteView.as_view(), name='conductor-desasignar-estudiante'),
    path('api/apoderados/', ApoderadoListCreateView.as_view(), name='apoderados-list-create'),
    path('api/apoderados/<int:apoderado_id>/', ApoderadoDetailView.as_view(), name='apoderado-detail'),
    path('api/apoderados/<int:apoderado_id>/cambiar-password/', CambiarPasswordView.as_view(), name='apoderado-cambiar-password'),
    path('api/dashboard/stats/', DashboardStatsView.as_view(), name='dashboard-stats'),

    # Notificaciones & FCM
    path('api/notificaciones/fcm-token/', RegistrarFCMTokenView.as_view(), name='fcm-token-register'),
    path('api/notificaciones/', NotificacionListView.as_view(), name='notificaciones-list'),
    path('api/notificaciones/<int:notificacion_id>/marcar-leido/', MarcarNotificacionLeidaView.as_view(), name='notificacion-marcar-leido'),
    path('api/notificaciones/marcar-todas-leidas/', MarcarTodasNotificacionesLeidasView.as_view(), name='notificaciones-marcar-todas-leidas'),
    path('api/notificaciones/aviso-sistema/', AvisoSistemaView.as_view(), name='notificaciones-aviso-sistema'),

    # Acciones de Ruta & Emergencias (Generan Push automáticamente)
    path('api/rutas/iniciar/', RutaIniciarView.as_view(), name='rutas-iniciar'),
    path('api/rutas/escanear-qr/', RutaEscanearQRView.as_view(), name='rutas-escanear-qr'),
    path('api/rutas/finalizar/', RutaFinalizarView.as_view(), name='rutas-finalizar'),
    path('api/emergencias/', EmergenciaCrearView.as_view(), name='emergencias-crear'),
]


