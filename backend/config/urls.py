from django.contrib import admin
from django.urls import path, include
from usuarios.views import EstudianteListCreateView

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/', include('usuarios.urls')),
    path('api/estudiantes/', EstudianteListCreateView.as_view(), name='estudiantes-list-create'),
]
