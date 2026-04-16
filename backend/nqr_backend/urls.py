from django.contrib import admin
from django.urls import path, include
from qr_engine import views as qr_views

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/', include('auth_system.urls')),
    
    # Direct mappings for reliability
    path('api/qr/generate/', qr_views.generate_qr, name='gen_qr'),
    path('api/qr/save/',     qr_views.save_qr,     name='save_qr_direct'),
    path('api/qr/list/',     qr_views.list_qrs,    name='list_qr_direct'),
    path('api/qr/<str:qr_id>/delete/', qr_views.delete_qr, name='delete_qr_direct'),
    
    path('', include('admin_api.urls')),
]
