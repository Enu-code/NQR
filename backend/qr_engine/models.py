from django.db import models
from django.contrib.auth.models import User

class QRCode(models.Model):
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name='qrcodes')
    qr_id = models.CharField(max_length=100, unique=True)
    url = models.TextField() # Supports URLs, vCards, and raw text
    config = models.JSONField(default=dict, blank=True) # For branding, colors, etc.
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.qr_id} - {self.url}"

class Lead(models.Model):
    qr = models.ForeignKey(QRCode, on_delete=models.CASCADE, related_name='leads')
    name = models.CharField(max_length=255, blank=True, null=True)
    email = models.EmailField(blank=True, null=True)
    phone = models.CharField(max_length=50, blank=True, null=True)
    owner_email = models.EmailField() # Redundant but matches frontend expectations for quick lookup
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.email or 'Anonymous'} - {self.qr.qr_id}"

class Scan(models.Model):
    qr = models.ForeignKey(QRCode, on_delete=models.CASCADE, related_name='scans')
    timestamp = models.DateTimeField(auto_now_add=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    location = models.CharField(max_length=255, null=True, blank=True)
    device_type = models.CharField(max_length=100, null=True, blank=True)
    status = models.CharField(max_length=50, default='Success')

    def __str__(self):
        return f"{self.qr.qr_id} scanned at {self.timestamp}"
