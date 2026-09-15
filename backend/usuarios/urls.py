from django.urls import path

from apoderados.views import RegistroApoderadoView
from usuarios.views import RegistroDelegadoView
from autenticacion.views import (
    LoginView,
    SolicitarRecuperacionView,
    ConfirmarRecuperacionView,
)

urlpatterns = [
    path(
        'registro/',
        RegistroApoderadoView.as_view(),
        name='registro-apoderado'
    ),

    path(
        'registro-delegado/',
        RegistroDelegadoView.as_view(),
        name='registro-delegado'
    ),

    path(
        'login/',
        LoginView.as_view(),
        name='login'
    ),

    path(
        'password-reset/',
        SolicitarRecuperacionView.as_view(),
        name='solicitar-recuperacion'
    ),

    path(
        'password-reset/confirm/',
        ConfirmarRecuperacionView.as_view(),
        name='confirmar-recuperacion'
    ),
]