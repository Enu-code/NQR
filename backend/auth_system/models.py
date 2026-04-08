from django.db import models
from django.utils import timezone
import datetime

class UserOTP(models.Model):
    email = models.EmailField()
    otp_code = models.CharField(max_length=6)
    pending_password = models.CharField(max_length=255, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    is_used = models.BooleanField(default=False)

    def is_valid(self):
        # OTP is valid for 10 minutes and if not used
        expiry_time = self.created_at + datetime.timedelta(minutes=10)
        return not self.is_used and timezone.now() < expiry_time

    def __str__(self):
        return f"{self.email} - {self.otp_code}"
