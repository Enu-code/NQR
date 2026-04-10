import random
import json
from datetime import timedelta
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.core.mail import send_mail
from django.conf import settings
from django.contrib.auth.models import User
from django.contrib.auth import login
from django.contrib.auth.hashers import make_password
from django.utils import timezone
from rest_framework_simplejwt.tokens import RefreshToken
from .models import UserOTP

@csrf_exempt
def request_otp(request):
    """
    Requirements:
    1. Domain Filter: Only @neverno.in
    2. Rate Limiting: 60s cooldown
    3. SES Config: From auth@neverq.in
    """
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            email = data.get('email', '').strip().lower()
            password = data.get('password', '')

            # 1. The Bouncer: Domain Filter
            if not email.endswith('@neverno.in'):
                return JsonResponse({'error': 'Access restricted to @neverno.in accounts.'}, status=403)
            
            if not password:
                return JsonResponse({'error': 'Password is required to proceed.'}, status=400)

            # 2. Rate Limiting (Cost Protection): 60 seconds
            last_otp = UserOTP.objects.filter(email=email).order_by('-created_at').first()
            if last_otp:
                cooldown_period = timezone.now() - last_otp.created_at
                if cooldown_period < timedelta(seconds=60):
                    remaining = 60 - int(cooldown_period.total_seconds())
                    return JsonResponse({'error': f'Please wait {remaining}s before requesting a new code.'}, status=429)

            # Check if user exists (if so, verify password before sending OTP)
            user_exists = User.objects.filter(email=email).exists()
            if user_exists:
                user = User.objects.get(email=email)
                if not user.check_password(password):
                    return JsonResponse({'error': 'Incorrect password details.'}, status=401)

            # Generate 6-digit OTP
            otp_code = str(random.randint(100000, 999999))
            
            # Save to DB
            UserOTP.objects.create(
                email=email, 
                otp_code=otp_code,
                pending_password=make_password(password)
            )

            # 3. Send via SES (using verified identity auth@neverq.in)
            try:
                send_mail(
                    subject='Your NQR Security Code',
                    message=f'Your login code is: {otp_code}\n\nThis code expires in 10 minutes.',
                    from_email='auth@neverq.in',  # STRICT REQ: auth@neverq.in
                    recipient_list=[email],
                    fail_silently=False,
                )
                return JsonResponse({'message': 'OTP sent successfully.'})
            except Exception as e:
                if settings.DEBUG:
                    print(f"SES Error: {str(e)}")
                    return JsonResponse({'message': f'Debug: OTP is {otp_code}'})
                return JsonResponse({'error': 'Failed to deliver security code.'}, status=500)

        except Exception as e:
            return JsonResponse({'error': 'Invalid request parameters.'}, status=400)
    return JsonResponse({'error': 'POST required.'}, status=405)

@csrf_exempt
def verify_otp(request):
    """
    Requirements:
    1. Expiration: 10m via is_valid()
    2. Session Integration: django.contrib.auth.login
    """
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            email = data.get('email', '').strip().lower()
            otp_code = data.get('otp_code', '').strip()
            remember_me = data.get('remember_me', False)

            # Find the most recent OTP record for this email/code
            otp_record = UserOTP.objects.filter(email=email, otp_code=otp_code).last()

            if otp_record and otp_record.is_valid():
                otp_record.is_used = True
                otp_record.save()
                
                # Get or Create User
                user, created = User.objects.get_or_create(username=email, email=email)
                
                # Sync password from the OTP flow if it was updated
                if otp_record.pending_password:
                    user.password = otp_record.pending_password
                    user.save()

                # Start real Django session
                login(request, user)

                # Set session expiry
                if remember_me:
                    request.session.set_expiry(2592000) # 30 days
                else:
                    request.session.set_expiry(0) # Browser close
                
                # Generate JWT
                refresh = RefreshToken.for_user(user)
                
                return JsonResponse({
                    'message': 'Session established.',
                    'token': str(refresh.access_token),
                    'user': {
                        'email': user.email,
                        'name': f"{user.first_name} {user.last_name}".strip() or user.username,
                        'is_new': created,
                        'is_staff': user.is_staff
                    }
                })
            else:
                return JsonResponse({'error': 'Code is invalid or has expired.'}, status=401)

        except Exception as e:
            return JsonResponse({'error': 'Verification failed.'}, status=400)
    return JsonResponse({'error': 'POST required.'}, status=405)
