from django.urls import path
from . import views

urlpatterns = [
    path('request-otp/', views.request_otp, name='request_otp'),
    path('verify-otp/', views.verify_otp, name='verify_otp'),
]
