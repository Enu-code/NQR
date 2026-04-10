from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/', include('auth_system.urls')),
    path('api/qr/', include('qr_engine.urls')),
    path('', include('admin_api.urls')),
]
