from django.contrib import admin
from django.urls import path, include

from usuarios.views import (
    DelegadoPerfilView,
    DelegadoAdminListCreateView,
    DelegadoAdminDetailView,
)

from estudiantes.views import (
    EstudianteListCreateView,
    EstudianteDetailView,
    EstudianteFotoView,
    EstudianteSinAsignarListView,
    DelegadoEstudiantesListView,
    DelegadoDesvincularEstudianteView,
)

from conductor.views import (
    ConductorListCreateView,
    ConductorDetailView,
    ConductorEstudiantesListView,
    ConductorAsignarEstudiantesView,
    ConductorDesasignarEstudianteView,
)

from apoderados.views import (
    ApoderadoListCreateView,
    ApoderadoDetailView,
    CambiarPasswordView,
)

from vehiculos.views import (
    FurgonListCreateView,
    FurgonDetailView,
)

from rutas.views import (
    RutaListCreateView,
    RutaDetailView,
)

from notificaciones.views import (
    RegistrarFCMTokenView,
    NotificacionListView,
    MarcarNotificacionLeidaView,
    MarcarTodasNotificacionesLeidasView,
    RutaIniciarView,
    RutaEscanearQRView,
    RutaFinalizarView,
    EmergenciaCrearView,
    AvisoSistemaView,
)

from usuarios.views import (
    DelegadoPerfilView,
    DelegadoAdminListCreateView,
    DelegadoAdminDetailView,
    DashboardStatsView,
)

urlpatterns = [
    path('admin/', admin.site.urls),

    path('api/auth/', include('usuarios.urls')),

    path('api/estudiantes/', EstudianteListCreateView.as_view()),
    path('api/estudiantes/sin-asignar/', EstudianteSinAsignarListView.as_view()),
    path('api/estudiantes/<int:estudiante_id>/', EstudianteDetailView.as_view()),
    path('api/estudiantes/<int:estudiante_id>/foto/', EstudianteFotoView.as_view()),

    path('api/conductores/', ConductorListCreateView.as_view()),
    path('api/conductores/<int:conductor_id>/', ConductorDetailView.as_view()),
    path('api/conductores/<int:conductor_id>/estudiantes/', ConductorEstudiantesListView.as_view()),
    path('api/conductores/<int:conductor_id>/asignar-estudiantes/', ConductorAsignarEstudiantesView.as_view()),
    path('api/conductores/<int:conductor_id>/desasignar-estudiante/', ConductorDesasignarEstudianteView.as_view()),

    path('api/apoderados/', ApoderadoListCreateView.as_view()),
    path('api/apoderados/<int:apoderado_id>/', ApoderadoDetailView.as_view()),
    path('api/apoderados/<int:apoderado_id>/cambiar-password/', CambiarPasswordView.as_view()),

    path('api/delegados/', DelegadoAdminListCreateView.as_view()),
    path('api/delegados/<int:delegado_id>/', DelegadoAdminDetailView.as_view()),
    path('api/delegados/perfil/', DelegadoPerfilView.as_view()),
    path('api/delegados/estudiantes/', DelegadoEstudiantesListView.as_view()),
    path('api/delegados/desvincular-estudiante/', DelegadoDesvincularEstudianteView.as_view()),

    path('api/furgones/', FurgonListCreateView.as_view()),
    path('api/furgones/<int:pk>/', FurgonDetailView.as_view()),

    path('api/rutas-admin/', RutaListCreateView.as_view()),
    path('api/rutas-admin/<int:pk>/', RutaDetailView.as_view()),

    path('api/notificaciones/fcm-token/', RegistrarFCMTokenView.as_view()),
    path('api/notificaciones/', NotificacionListView.as_view()),
    path('api/notificaciones/<int:notificacion_id>/marcar-leido/', MarcarNotificacionLeidaView.as_view()),
    path('api/notificaciones/marcar-todas-leidas/', MarcarTodasNotificacionesLeidasView.as_view()),
    path('api/notificaciones/aviso-sistema/', AvisoSistemaView.as_view()),

    path('api/rutas/iniciar/', RutaIniciarView.as_view()),
    path('api/rutas/escanear-qr/', RutaEscanearQRView.as_view()),
    path('api/rutas/finalizar/', RutaFinalizarView.as_view()),

    path('api/emergencias/', EmergenciaCrearView.as_view()),

    path('api/dashboard/stats/', DashboardStatsView.as_view(), name='dashboard-stats'),
]