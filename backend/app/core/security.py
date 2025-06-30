import base64
from datetime import datetime, timedelta

from cryptography.fernet import Fernet
from jose import JWTError, jwt
from passlib.context import CryptContext

from app.core.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: timedelta | None = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

def verify_token(token: str) -> dict | None:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload
    except JWTError:
        return None


def _get_encryption_key() -> bytes:
    """Generate or get encryption key from SECRET_KEY"""
    # Use the first 32 bytes of the base64-encoded SECRET_KEY
    key_material = settings.SECRET_KEY.encode()[:32]
    # Pad to 32 bytes if needed
    key_material = key_material.ljust(32, b'0')
    return base64.urlsafe_b64encode(key_material)


def encrypt_data(data: str) -> str:
    """Encrypt sensitive data like Apprise URLs"""
    if not data:
        return data

    fernet = Fernet(_get_encryption_key())
    encrypted_data = fernet.encrypt(data.encode())
    return base64.urlsafe_b64encode(encrypted_data).decode()


def decrypt_data(encrypted_data: str) -> str:
    """Decrypt sensitive data like Apprise URLs"""
    if not encrypted_data:
        return encrypted_data

    try:
        fernet = Fernet(_get_encryption_key())
        decoded_data = base64.urlsafe_b64decode(encrypted_data.encode())
        decrypted_data = fernet.decrypt(decoded_data)
        return decrypted_data.decode()
    except Exception as e:
        raise ValueError(f"Failed to decrypt data: {str(e)}")
