import pytest
from fastapi import HTTPException
from unittest.mock import MagicMock
from api.deps import validate_tenant_api_key

def test_validate_tenant_api_key_missing():
    with pytest.raises(HTTPException) as exc:
        validate_tenant_api_key(x_api_key="", db=MagicMock())
    
    assert exc.value.status_code == 401
    assert exc.value.detail == "API Key missing"

def test_validate_tenant_api_key_invalid():
    mock_db = MagicMock()
    mock_db.execute.return_value.fetchone.return_value = None
    
    with pytest.raises(HTTPException) as exc:
        validate_tenant_api_key(x_api_key="wrong_key", db=mock_db)
    
    assert exc.value.status_code == 401
    assert exc.value.detail == "Invalid or inactive API Key"

def test_validate_tenant_api_key_success():
    mock_db = MagicMock()
    mock_db.execute.return_value.fetchone.side_effect = [(99,), ("sk-groq-master-123",)]
    
    result = validate_tenant_api_key(x_api_key="valid_key", db=mock_db)
    
    assert result["user_id"] == 99
    assert result["groq_api_key"] == "sk-groq-master-123"

def test_validate_tenant_api_key_no_global_key():
    mock_db = MagicMock()
    mock_db.execute.return_value.fetchone.side_effect = [(99,), None]
    
    result = validate_tenant_api_key(x_api_key="valid_key", db=mock_db)
    
    assert result["groq_api_key"] is None