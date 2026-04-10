from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    UserViewSet, QRCodeViewSet, LeadViewSet, ScanViewSet,
    PlatformStatsView, PasswordResetView, UserSettingsView
)
router = DefaultRouter()
router.register(r'admin/users', UserViewSet, basename='admin-users')
router.register(r'admin/qrs', QRCodeViewSet, basename='admin-qrs')
router.register(r'admin/leads', LeadViewSet, basename='admin-leads')
router.register(r'admin/scans', ScanViewSet, basename='admin-scans')
router.register(r'qrs', QRCodeViewSet, basename='qrs')
router.register(r'leads', LeadViewSet, basename='leads')

urlpatterns = [
    path('', include(router.urls)),
    path('admin/stats', PlatformStatsView.as_view(), name='admin-stats'),
    path('admin/password-reset', PasswordResetView.as_view(), name='admin-password-reset'),
    path('user/settings', UserSettingsView.as_view(), name='user-settings'),
]
