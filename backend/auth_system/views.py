import random
import json
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.core.mail import send_mail
from django.conf import settings
from django.contrib.auth.models import User
from django.contrib.auth import login, authenticate
from django.contrib.auth.hashers import make_password
from .models import UserOTP

@csrf_exempt
def request_otp(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            email = data.get('email', '').strip().lower()
            password = data.get('password', '')

            if not email.endswith('@neverno.in'):
                return JsonResponse({'error': 'Access restricted to @neverno.in domain.'}, status=403)
            
            if not password:
                return JsonResponse({'error': 'Password is required.'}, status=400)

            # Check if user exists
            user_exists = User.objects.filter(email=email).exists()
            if user_exists:
                user = User.objects.get(email=email)
                if not user.check_password(password):
                    return JsonResponse({'error': 'Incorrect password for this account.'}, status=401)

            # Generate 6-digit OTP
            otp_code = str(random.randint(100000, 999999))
            
            # Save to DB (storing hashed password pending verification)
            UserOTP.objects.create(
                email=email, 
                otp_code=otp_code,
                pending_password=make_password(password)
            )

            # Send via SES
            try:
                send_mail(
                    subject='Your NQR Login Code',
                    message=f'Your secure login code is: {otp_code}. It will expire in 10 minutes.',
                    from_email='auth@neverno.in',
                    recipient_list=[email],
                    fail_silently=False,
                )
                return JsonResponse({'message': 'OTP sent successfully.'})
            except Exception as e:
                if settings.DEBUG:
                    print(f"DEBUG OTP for {email}: {otp_code}")
                    return JsonResponse({'message': 'OTP generated (see server logs).', 'debug_otp': otp_code})
                return JsonResponse({'error': 'Failed to send email.'}, status=500)

        except Exception as e:
            return JsonResponse({'error': str(e)}, status=400)
    return JsonResponse({'error': 'POST request required.'}, status=405)

@csrf_exempt
def verify_otp(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            email = data.get('email', '').strip().lower()
            otp_code = data.get('otp_code', '').strip()
            remember_me = data.get('remember_me', False)

            otp_record = UserOTP.objects.filter(email=email, otp_code=otp_code).last()

            if otp_record and otp_record.is_valid():
                otp_record.is_used = True
                otp_record.save()
                
                # Get or Create User
                user, created = User.objects.get_or_create(username=email, email=email)
                
                # If newly created OR if we want to sync password from the flow
                if otp_record.pending_password:
                    user.password = otp_record.pending_password
                    user.save()

                # Establish real Django session
                login(request, user)

                # Handle session expiry
                if remember_me:
                    request.session.set_expiry(2592000) # 30 days
                else:
                    request.session.set_expiry(0) # Browser close
                
                return JsonResponse({
                    'message': 'Login successful.',
                    'user': {
                        'email': user.email,
                        'username': user.username,
                        'is_new': created
                    }
                })
            else:
                return JsonResponse({'error': 'Invalid or expired OTP.'}, status=401)

        except Exception as e:
            return JsonResponse({'error': str(e)}, status=400)
    return JsonResponse({'error': 'POST request required.'}, status=405)
