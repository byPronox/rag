import pytest
from fastapi import Request, HTTPException
from jose import jwt
from unittest.mock import MagicMock
from api.deps import get_token_from_request, get_current_user, get_current_admin
from security.jwt_handler import verify_password, get_password_hash, create_access_token, generate_api_key
from config.settings import settings

def test_password_hashing():
    pwd = "MySuperSecretPassword123"
    hashed = get_password_hash(pwd)
    assert pwd != hashed
    assert verify_password(pwd, hashed) is True
    assert verify_password("WrongPassword", hashed) is False

def test_api_key_generation():
    key = generate_api_key()
    assert key.startswith("sk_live_")
    assert len(key) > 40

def test_get_token_from_cookie():
    request = MagicMock(spec=Request)
    request.cookies.get.return_value = "Bearer valid_token_123"
    token = get_token_from_request(request)
    assert token == "valid_token_123"

def test_get_token_from_header():
    request = MagicMock(spec=Request)
    request.cookies.get.return_value = None
    request.headers.get.return_value = "Bearer header_token_456"
    token = get_token_from_request(request)
    assert token == "header_token_456"

def test_get_token_missing():
    request = MagicMock(spec=Request)
    request.cookies.get.return_value = None
    request.headers.get.return_value = None
    with pytest.raises(HTTPException) as exc:
        get_token_from_request(request)
    assert exc.value.status_code == 401

def test_get_current_user_success(mock_db_session, mock_tenant_user):
    token = jwt.encode({"sub": mock_tenant_user.email, "tv": mock_tenant_user.token_version}, "dummy_secret", algorithm="HS256")
    
    settings.SECRET_KEY = "dummy_secret"
    settings.ALGORITHM = "HS256"
    
    mock_db_session.query.return_value.filter.return_value.first.return_value = mock_tenant_user
    
    user = get_current_user(token=token, db=mock_db_session)
    assert user.email == "tenant@company.com"

def test_get_current_user_invalid_token(mock_db_session):
    with pytest.raises(HTTPException):
        get_current_user(token="invalid.token.here", db=mock_db_session)

def test_get_current_user_expired_session(mock_db_session, mock_tenant_user):
    token = jwt.encode({"sub": mock_tenant_user.email, "tv": 1}, "dummy_secret", algorithm="HS256")
    mock_tenant_user.token_version = 2
    mock_db_session.query.return_value.filter.return_value.first.return_value = mock_tenant_user
    
    with pytest.raises(HTTPException) as exc:
        get_current_user(token=token, db=mock_db_session)
    assert exc.value.detail == "Session expired. Please log in again."

def test_get_current_admin_success(mock_admin_user):
    admin = get_current_admin(mock_admin_user)
    assert admin.role == "admin"

def test_get_current_admin_forbidden(mock_tenant_user):
    with pytest.raises(HTTPException) as exc:
        get_current_admin(mock_tenant_user)
    assert exc.value.status_code == 403

def test_get_current_user_not_found_in_db(mock_db_session):
    token = jwt.encode({"sub": "ghost@company.com", "tv": 1}, "dummy_secret", algorithm="HS256")
    settings.SECRET_KEY = "dummy_secret"
    settings.ALGORITHM = "HS256"
    
    mock_db_session.query.return_value.filter.return_value.first.return_value = None
    
    with pytest.raises(HTTPException) as exc:
        get_current_user(token=token, db=mock_db_session)
    
    assert exc.value.status_code == 401
    assert exc.value.detail == "Could not validate credentials"