from django.urls import path
from .views import RegistroApoderadoView, LoginView

urlpatterns = [
    path('registro/', RegistroApoderadoView.as_view(), name='registro-apoderado'),
    path('login/', LoginView.as_view(), name='login'),
]
