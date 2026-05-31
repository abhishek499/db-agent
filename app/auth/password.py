import base64
import hashlib

import bcrypt


def _prehash(plain: str) -> bytes:
    """SHA-256 digest keeps input within bcrypt's 72-byte limit."""
    return base64.b64encode(hashlib.sha256(plain.encode()).digest())


def hash_password(plain: str) -> str:
    return bcrypt.hashpw(_prehash(plain), bcrypt.gensalt()).decode()


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(_prehash(plain), hashed.encode())
