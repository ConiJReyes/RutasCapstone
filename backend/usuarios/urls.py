from django.urls import path

from .views import (
    RegistroApoderadoView,
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