from django.contrib import admin
from django.urls import path, include
from usuarios.views import EstudianteListCreateView, EstudianteDetailView, EstudianteFotoView

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/', include('usuarios.urls')),
    path('api/estudiantes/', EstudianteListCreateView.as_view(), name='estudiantes-list-create'),
    path('api/estudiantes/<int:estudiante_id>/', EstudianteDetailView.as_view(), name='estudiante-detail'),
    path('api/estudiantes/<int:estudiante_id>/foto/', EstudianteFotoView.as_view(), name='estudiante-foto'),
]
