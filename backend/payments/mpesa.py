import re
import base64
import requests
from django.conf import settings
from django.utils import timezone


class MpesaClient:
    def __init__(self):
        self.consumer_key = getattr(settings, 'MPESA_CONSUMER_KEY', '')
        self.consumer_secret = getattr(settings, 'MPESA_CONSUMER_SECRET', '')
        self.shortcode = getattr(settings, 'MPESA_SHORTCODE', '174379')
        # Standard Daraja Sandbox Passkey Fallback
        self.passkey = getattr(
            settings, 
            'MPESA_PASSKEY', 
            'bfb279f69b5996aa54549371572b73d6382f6654e0193004017e781e93945b99'
        )
        self.env = getattr(settings, 'MPESA_ENV', 'sandbox')
        # Default mock mode to False so actual Sandbox API calls are attempted
        self.mock_mode = getattr(settings, 'MPESA_MOCK_MODE', False)

        if self.env == 'production':
            self.base_url = "https://api.safaricom.co.ke"
        else:
            self.base_url = "https://sandbox.safaricom.co.ke"

    def get_access_token(self):
        if self.mock_mode:
            return "MOCK_ACCESS_TOKEN"

        url = f"{self.base_url}/oauth/v1/generate?grant_type=client_credentials"
        try:
            response = requests.get(url, auth=(self.consumer_key, self.consumer_secret), timeout=10)
            response.raise_for_status()
            return response.json().get('access_token')
        except Exception as e:
            return None

    def stk_push(self, phone_number, amount, callback_url, account_reference="GrowthEngine", desc="VCF Batch Unlock"):
        # Format phone to Daraja standard (254XXXXXXXXX)
        clean_phone = re.sub(r'\D', '', str(phone_number))
        if clean_phone.startswith('0'):
            clean_phone = '254' + clean_phone[1:]
        elif clean_phone.startswith('254'):
            pass
        elif len(clean_phone) == 9:
            clean_phone = '254' + clean_phone

        numeric_amount = max(1, int(round(float(amount))))

        if self.mock_mode:
            timestamp = int(timezone.now().timestamp())
            mock_checkout_id = f"ws_CO_MOCK_{timestamp}"
            return {
                "ResponseCode": "0",
                "ResponseDescription": "Success. Request accepted for processing (MOCK MODE).",
                "MerchantRequestID": f"MOCK_MERCHANT_{timestamp}",
                "CheckoutRequestID": mock_checkout_id,
                "CustomerMessage": f"[MOCK] Simulated STK Push sent to {clean_phone} for KES {numeric_amount}.00",
                "is_mock": True
            }

        access_token = self.get_access_token()
        if not access_token:
            return {
                "ResponseCode": "1",
                "errorMessage": "Unable to authenticate with M-Pesa gateway. Check Consumer Key and Secret."
            }

        timestamp = timezone.localtime(timezone.now()).strftime('%Y%m%d%H%M%S')
        password = base64.b64encode(f"{self.shortcode}{self.passkey}{timestamp}".encode()).decode('utf-8')

        headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json"
        }
        payload = {
            "BusinessShortCode": self.shortcode,
            "Password": password,
            "Timestamp": timestamp,
            "TransactionType": "CustomerPayBillOnline",
            "Amount": numeric_amount,
            "PartyA": clean_phone,
            "PartyB": self.shortcode,
            "PhoneNumber": clean_phone,
            "CallBackURL": callback_url,
            "AccountReference": str(account_reference)[:12],
            "TransactionDesc": str(desc)[:13]
        }

        url = f"{self.base_url}/mpesa/stkpush/v1/processrequest"
        try:
            res = requests.post(url, json=payload, headers=headers, timeout=15)
            return res.json()
        except requests.exceptions.RequestException as e:
            return {
                "ResponseCode": "1",
                "errorMessage": "M-Pesa API connection error. Please try again."
            }

    def stk_push_query(self, checkout_request_id):
        """
        Queries Safaricom directly to verify the real-time status of an STK Push transaction.
        """
        if self.mock_mode:
            return {
                "ResponseCode": "0",
                "ResultCode": "0",
                "ResultDesc": "The service request is processed successfully (MOCK QUERY).",
                "is_mock": True
            }

        access_token = self.get_access_token()
        if not access_token:
            return {
                "ResponseCode": "1",
                "ResultCode": "1",
                "errorMessage": "Unable to authenticate with M-Pesa gateway."
            }

        timestamp = timezone.localtime(timezone.now()).strftime('%Y%m%d%H%M%S')
        password = base64.b64encode(f"{self.shortcode}{self.passkey}{timestamp}".encode()).decode('utf-8')

        headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json"
        }
        payload = {
            "BusinessShortCode": self.shortcode,
            "Password": password,
            "Timestamp": timestamp,
            "CheckoutRequestID": str(checkout_request_id)
        }

        url = f"{self.base_url}/mpesa/stkpushquery/v1/query"
        try:
            res = requests.post(url, json=payload, headers=headers, timeout=15)
            return res.json()
        except requests.exceptions.RequestException as e:
            return {
                "ResponseCode": "1",
                "ResultCode": "1",
                "errorMessage": "M-Pesa query connection error. Please try again."
            }