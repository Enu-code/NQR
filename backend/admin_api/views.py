from rest_framework import viewsets, permissions, status, views
from rest_framework.response import Response
from django.contrib.auth.models import User
from qr_engine.models import QRCode, Lead, Scan
from .serializers import UserSerializer, QRCodeSerializer, LeadSerializer, ScanSerializer
from django.db.models import Count

class IsAdminOrOwner(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        if request.user.is_staff:
            return True
        if hasattr(obj, 'owner'):
            return obj.owner == request.user
        if hasattr(obj, 'qr'):
            return obj.qr.owner == request.user
        return False

class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAdminUser]

class QRCodeViewSet(viewsets.ModelViewSet):
    serializer_class = QRCodeSerializer
    permission_class = [permissions.IsAuthenticated]
    lookup_field = 'qr_id'

    def get_queryset(self):
        if self.request.user.is_staff:
            owner_email = self.request.query_params.get('ownerEmail')
            if owner_email:
                return QRCode.objects.filter(owner__email=owner_email)
            return QRCode.objects.all()
        return QRCode.objects.filter(owner=self.request.user)

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)

class LeadViewSet(viewsets.ModelViewSet):
    serializer_class = LeadSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        if self.request.user.is_staff:
            # Check for ownerEmail filter as used in backend.js
            owner_email = self.request.query_params.get('ownerEmail')
            if owner_email:
                return Lead.objects.filter(owner_email=owner_email)
            return Lead.objects.all()
        return Lead.objects.filter(qr__owner=self.request.user)

    def perform_create(self, serializer):
        # When creating a lead, the owner_email should be the QR owner's email
        qr = serializer.validated_data.get('qr')
        serializer.save(owner_email=qr.owner.email)

class ScanViewSet(viewsets.ModelViewSet):
    serializer_class = ScanSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        if self.request.user.is_staff:
            return Scan.objects.all()
        return Scan.objects.filter(qr__owner=self.request.user)

class PlatformStatsView(views.APIView):
    permission_classes = [permissions.IsAdminUser]

    def get(self, request):
        stats = {
            'totalUsers': User.objects.count(),
            'totalQRs': QRCode.objects.count(),
            'totalLeads': Lead.objects.count(),
        }
        return Response(stats)

class PasswordResetView(views.APIView):
    permission_classes = [permissions.IsAdminUser]

    def post(self, request):
        user_id = request.data.get('user_id')
        new_password = request.data.get('password')
        if not user_id or not new_password:
            return Response({'error': 'User ID and Password required'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            user = User.objects.get(id=user_id)
            user.set_password(new_password)
            user.save()
            return Response({'message': 'Password updated successfully'})
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

class UserSettingsView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        from auth_system.models import UserProfile
        profile, created = UserProfile.objects.get_or_create(user=request.user)
        return Response({'settings': profile.settings})

    def post(self, request):
        from auth_system.models import UserProfile
        profile, created = UserProfile.objects.get_or_create(user=request.user)
        profile.settings = request.data.get('settings', {})
        profile.save()
        return Response({'success': True})
