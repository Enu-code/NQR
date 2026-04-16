# QR Engine Views - Core Logic
import segno
import json
import uuid
from django.http import HttpResponse, JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth.models import User
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
import io

# ─── JWT helper ──────────────────────────────────────────────────────────────
def get_user_from_request(request):
    """
    Extract and validate the Bearer JWT from the Authorization header.
    Returns the User object on success, or None if invalid/missing.
    """
    auth_header = request.headers.get('Authorization', '')
    if not auth_header.startswith('Bearer '):
        return None
    token = auth_header.split(' ', 1)[1]
    authenticator = JWTAuthentication()
    try:
        validated_token = authenticator.get_validated_token(token)
        return authenticator.get_user(validated_token)
    except (InvalidToken, TokenError):
        return None


# ─── CORS helper ─────────────────────────────────────────────────────────────
def cors_json_response(data, status=200):
    resp = JsonResponse(data, status=status)
    resp['Access-Control-Allow-Origin']  = '*'
    resp['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
    resp['Access-Control-Allow-Methods'] = 'GET, POST, DELETE, OPTIONS'
    return resp


# ─── Generate QR (existing, unchanged) ───────────────────────────────────────
@csrf_exempt
def generate_qr(request):
    url = request.GET.get('url', 'https://neverno.in')
    try:
        qrcode = segno.make_qr(url)
        out = io.BytesIO()
        qrcode.save(out, kind='svg', scale=10)
        resp = HttpResponse(out.getvalue(), content_type="image/svg+xml")
        resp['Access-Control-Allow-Origin'] = '*'
        return resp
    except Exception as e:
        return cors_json_response({'error': str(e)}, status=500)


# ─── List QR codes for the logged-in user ────────────────────────────────────
@csrf_exempt
def list_qrs(request):
    if request.method == 'OPTIONS':
        return cors_json_response({})

    if request.method != 'GET':
        return cors_json_response({'error': 'Method not allowed'}, status=405)

    user = get_user_from_request(request)
    if not user:
        return cors_json_response({'error': 'Unauthorized'}, status=401)

    from .models import QRCode
    qrs = QRCode.objects.filter(owner=user).order_by('-created_at')
    data = [
        {
            'qrId':      qr.qr_id,
            'name':      qr.config.get('name', 'Untitled QR'),
            'type':      qr.config.get('type', 'link'),
            'content':   qr.url,
            'shortUrl':  qr.config.get('shortUrl', f'neverq.in/go/{qr.qr_id}'),
            'createdAt': qr.created_at.isoformat(),
            'options':   qr.config.get('options', {}),
        }
        for qr in qrs
    ]
    return cors_json_response(data)


# ─── Save / create a new QR code ─────────────────────────────────────────────
@csrf_exempt
def save_qr(request):
    if request.method == 'OPTIONS':
        return cors_json_response({})

    if request.method != 'POST':
        return cors_json_response({'error': 'Method not allowed'}, status=405)

    user = get_user_from_request(request)
    if not user:
        return cors_json_response({'error': 'Unauthorized'}, status=401)

    try:
        body = json.loads(request.body)
    except (json.JSONDecodeError, Exception):
        return cors_json_response({'error': 'Invalid JSON body'}, status=400)

    from .models import QRCode
    qr_id   = body.get('qrId')   or str(uuid.uuid4())[:8]
    url     = body.get('content') or body.get('url') or 'https://neverq.in'
    config  = {
        'name':     body.get('name', 'Untitled QR'),
        'type':     body.get('type', 'link'),
        'shortUrl': body.get('shortUrl', f'neverq.in/go/{qr_id}'),
        'options':  body.get('options', {}),
    }

    qr, created = QRCode.objects.update_or_create(
        qr_id=qr_id,
        defaults={'owner': user, 'url': url, 'config': config}
    )

    return cors_json_response({
        'success': True,
        'qrId':    qr.qr_id,
        'created': created,
    })


# ─── Delete a QR code ────────────────────────────────────────────────────────
@csrf_exempt
def delete_qr(request, qr_id):
    if request.method == 'OPTIONS':
        return cors_json_response({})

    if request.method != 'DELETE':
        return cors_json_response({'error': 'Method not allowed'}, status=405)

    user = get_user_from_request(request)
    if not user:
        return cors_json_response({'error': 'Unauthorized'}, status=401)

    from .models import QRCode
    deleted, _ = QRCode.objects.filter(qr_id=qr_id, owner=user).delete()
    if deleted:
        return cors_json_response({'success': True})
    return cors_json_response({'error': 'QR not found'}, status=404)
