from django.contrib import admin
from django.urls import path, include
from usuarios.views import (
    EstudianteListCreateView,
    EstudianteDetailView,
    EstudianteFotoView,
    ConductorListCreateView,
    ConductorDetailView,
    ApoderadoListCreateView,
    ApoderadoDetailView,
    DashboardStatsView
)

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/', include('usuarios.urls')),
    path('api/estudiantes/', EstudianteListCreateView.as_view(), name='estudiantes-list-create'),
    path('api/estudiantes/<int:estudiante_id>/', EstudianteDetailView.as_view(), name='estudiante-detail'),
    path('api/estudiantes/<int:estudiante_id>/foto/', EstudianteFotoView.as_view(), name='estudiante-foto'),
    path('api/conductores/', ConductorListCreateView.as_view(), name='conductores-list-create'),
    path('api/conductores/<int:conductor_id>/', ConductorDetailView.as_view(), name='conductor-detail'),
    path('api/apoderados/', ApoderadoListCreateView.as_view(), name='apoderados-list-create'),
    path('api/apoderados/<int:apoderado_id>/', ApoderadoDetailView.as_view(), name='apoderado-detail'),
    path('api/dashboard/stats/', DashboardStatsView.as_view(), name='dashboard-stats'),
]


