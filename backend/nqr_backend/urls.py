from django.contrib import admin
from django.urls import path, include
from qr_engine import views as qr_views

from admin_api.views import admin_login_view

urlpatterns = [
    # 🚨 BULLETPROOF ROUTING: Explicit path at the root level
    path('api/admin/login/', admin_login_view, name='admin-login'),
    
    path('', include('admin_api.urls')),
    path('admin/', admin.site.urls),
    path('api/auth/', include('auth_system.urls')),
    
    # Direct mappings for reliability
    path('api/qr/generate/', qr_views.generate_qr, name='gen_qr'),
    path('api/qr/save/',     qr_views.save_qr,     name='save_qr_direct'),
    path('api/qr/list/',     qr_views.list_qrs,    name='list_qr_direct'),
    path('api/qr/<str:qr_id>/delete/', qr_views.delete_qr, name='delete_qr_direct'),
]
