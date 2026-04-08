import segno
from django.http import HttpResponse, JsonResponse
from django.views.decorators.csrf import csrf_exempt
import io

@csrf_exempt
def generate_qr(request):
    url = request.GET.get('url', 'https://neverno.in')
    try:
        # Create the QR
        qrcode = segno.make_qr(url)
        
        # Buffer to hold SVG data
        out = io.BytesIO()
        qrcode.save(out, kind='svg', scale=10)
        
        # Return as SVG
        return HttpResponse(out.getvalue(), content_type="image/svg+xml")
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)
