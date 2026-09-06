from app.utils.security import create_access_token, decode_access_token, hash_password, verify_password


def test_password_hashing():
    """Verify password hashing and matching."""
    raw = "StrongPassword2026!"
    hashed = hash_password(raw)
    assert hashed != raw
    assert verify_password(raw, hashed) is True
    assert verify_password("WrongPassword", hashed) is False


def test_jwt_token_generation_and_decoding():
    """Verify JWT token encoding and payload extraction."""
    payload = {"sub": "usr_test_123", "email": "test@careerx.io", "role": "seeker"}
    token = create_access_token(payload)
    assert isinstance(token, str)

    decoded = decode_access_token(token)
    assert decoded is not None
    assert decoded["sub"] == "usr_test_123"
    assert decoded["email"] == "test@careerx.io"
    assert decoded["role"] == "seeker"
