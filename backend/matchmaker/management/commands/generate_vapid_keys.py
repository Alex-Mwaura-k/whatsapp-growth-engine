import base64

from cryptography.hazmat.primitives import serialization
from django.core.management.base import BaseCommand
from py_vapid import Vapid


def _b64(data):
    return base64.urlsafe_b64encode(data).rstrip(b'=').decode()


class Command(BaseCommand):
    help = 'Generate a VAPID key pair for Web Push. Store the output in the server .env file.'

    def handle(self, *args, **options):
        vapid = Vapid()
        vapid.generate_keys()
        private = vapid.private_key.private_numbers().private_value.to_bytes(32, 'big')
        public = vapid.public_key.public_bytes(
            serialization.Encoding.X962,
            serialization.PublicFormat.UncompressedPoint,
        )
        self.stdout.write(f'VAPID_PUBLIC_KEY={_b64(public)}')
        self.stdout.write(f'VAPID_PRIVATE_KEY={_b64(private)}')
