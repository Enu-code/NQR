from django.urls import path
from . import views

# QR Engine Core Routes
urlpatterns = [
    path('generate/',          views.generate_qr, name='generate_qr'),
    path('list/',              views.list_qrs,    name='list_qrs'),
    path('save',               views.save_qr,     name='save_qr_no_slash'),
    path('save/',              views.save_qr,     name='save_qr'),
    path('<str:qr_id>/delete/', views.delete_qr,  name='delete_qr'),
]
