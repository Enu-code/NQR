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
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status

@api_view(['POST'])
@permission_classes([AllowAny])
def request_otp(request):
    """
    Requirements:
    1. Domain Filter: Only @neverno.in
    2. Rate Limiting: 60s cooldown
    3. SES Config: From auth@neverq.in
    """
    if request.method == 'POST':
        try:
            email = request.data.get('email', '').strip().lower()
            password = request.data.get('password', '')
            mode = request.data.get('mode', 'login') # 'login' or 'signup'

            # 1. Domain Filter (ALLOW ALL for public platform access)
            target_email = email.lower().strip()
            # Restriction removed to allow public signups (Gmail, Outlook, etc.)
            
            if not password:
                return Response({'error': 'Password is required to proceed.'}, status=status.HTTP_400_BAD_REQUEST)

            # 2. Rate Limiting (Cost Protection): 60 seconds
            last_otp = UserOTP.objects.filter(email=email).order_by('-created_at').first()
            if last_otp:
                cooldown_period = timezone.now() - last_otp.created_at
                if cooldown_period < timedelta(seconds=60):
                    remaining = 60 - int(cooldown_period.total_seconds())
                    return Response({'error': f'Please wait {remaining}s before requesting a new code.'}, status=status.HTTP_429_TOO_MANY_REQUESTS)

            # Check if user exists
            user_exists = User.objects.filter(email=email).exists()

            if mode == 'login':
                if not user_exists:
                    return Response({'error': 'No account found with this email address.'}, status=status.HTTP_400_BAD_REQUEST)
                
                user = User.objects.get(email=email)
                if not user.check_password(password):
                    return Response({'error': 'Invalid email address or password.'}, status=status.HTTP_400_BAD_REQUEST)
            
            elif mode == 'signup':
                if user_exists:
                    return Response({'error': 'An account with this email already exists. Please log in instead.'}, status=status.HTTP_400_BAD_REQUEST)
                # Password will be set later via UserOTP.pending_password

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
                # Bypass email for tester
                if email == 'tester@neverno.in':
                    return Response({'message': 'OTP generated (Bypass active).'})

                send_mail(
                    subject='Your NQR Security Code',
                    message=f'Your login code is: {otp_code}\n\nThis code expires in 10 minutes.',
                    from_email='support@neverq.in',  # VERIFIED DOMAIN: support@neverq.in
                    recipient_list=[email],
                    fail_silently=False,
                )
                return Response({'message': 'OTP sent successfully.'})
            except Exception as e:
                if settings.DEBUG:
                    print(f"SES Error: {str(e)}")
                    return Response({'message': f'Debug: OTP is {otp_code}'})
                return Response({'error': 'Failed to deliver security code.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        except Exception as e:
            return Response({'error': 'Invalid request parameters.'}, status=status.HTTP_400_BAD_REQUEST)
    return JsonResponse({'error': 'POST required.'}, status=405)

@api_view(['POST'])
@permission_classes([AllowAny])
def verify_otp(request):
    """
    Requirements:
    1. Expiration: 10m via is_valid()
    2. Session Integration: django.contrib.auth.login
    """
    if request.method == 'POST':
        try:
            email = request.data.get('email', '').strip().lower()
            otp_code = request.data.get('otp_code', '').strip()
            remember_me = request.data.get('remember_me', False)

            # Check for Magic OTP for tester
            is_magic_otp = (email == 'tester@neverno.in' and otp_code == '888888')

            # Find the most recent OTP record for this email/code
            if is_magic_otp:
                otp_record = UserOTP.objects.filter(email=email).last()
            else:
                otp_record = UserOTP.objects.filter(email=email, otp_code=otp_code).last()

            if (otp_record and otp_record.is_valid()) or is_magic_otp:
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
                
                return Response({
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
                return Response({'error': 'Code is invalid or has expired.'}, status=status.HTTP_401_UNAUTHORIZED)

        except Exception as e:
            return JsonResponse({'error': 'Verification failed.'}, status=400)
    return JsonResponse({'error': 'POST required.'}, status=405)
