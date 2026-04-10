from rest_framework import serializers
from django.contrib.auth.models import User
from qr_engine.models import QRCode, Lead, Scan

class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False)
    
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'is_staff', 'is_active', 'date_joined', 'password']
        read_only_fields = ['date_joined']

    def create(self, validated_data):
        password = validated_data.pop('password', None)
        user = super().create(validated_data)
        if password:
            user.set_password(password)
            user.save()
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        user = super().update(instance, validated_data)
        if password:
            user.set_password(password)
            user.save()
        return user

class QRCodeSerializer(serializers.ModelSerializer):
    owner_email = serializers.EmailField(source='owner.email', read_only=True)
    
    class Meta:
        model = QRCode
        fields = ['id', 'qr_id', 'url', 'config', 'created_at', 'owner', 'owner_email']
        read_only_fields = ['created_at']

class LeadSerializer(serializers.ModelSerializer):
    qr_id_display = serializers.CharField(source='qr.qr_id', read_only=True)
    
    class Meta:
        model = Lead
        fields = ['id', 'name', 'email', 'phone', 'qr', 'qr_id_display', 'owner_email', 'created_at']
        read_only_fields = ['created_at']

class ScanSerializer(serializers.ModelSerializer):
    class Meta:
        model = Scan
        fields = '__all__'
        read_only_fields = ['timestamp']
