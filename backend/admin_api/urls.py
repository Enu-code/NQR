from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    UserViewSet, QRCodeViewSet, LeadViewSet, ScanViewSet,
    PlatformStatsView, PasswordResetView, UserSettingsView, admin_login_view
)
router = DefaultRouter()
router.register(r'api/admin/users', UserViewSet, basename='admin-users')
router.register(r'api/admin/qrs', QRCodeViewSet, basename='admin-qrs')
router.register(r'api/admin/leads', LeadViewSet, basename='admin-leads')
router.register(r'api/admin/scans', ScanViewSet, basename='admin-scans')
router.register(r'qrs', QRCodeViewSet, basename='qrs')
router.register(r'leads', LeadViewSet, basename='leads')

urlpatterns = [
    # Explicit paths first (higher priority)
    path('api/admin/login/', admin_login_view, name='admin-login'),
    path('api/admin/stats/', PlatformStatsView.as_view(), name='admin-stats'),
    path('api/admin/password-reset/', PasswordResetView.as_view(), name='admin-password-reset'),
    path('api/user/settings/', UserSettingsView.as_view(), name='user-settings'),

    # Router logic
    path('', include(router.urls)),
]
