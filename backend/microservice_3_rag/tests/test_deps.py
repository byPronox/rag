import pytest
from fastapi import HTTPException
from unittest.mock import MagicMock
from api.deps import validate_tenant_api_key

def test_validate_tenant_api_key_missing():
    """Prueba que pasa cuando no se envía la API Key."""
    with pytest.raises(HTTPException) as exc:
        validate_tenant_api_key(x_api_key="", db=MagicMock())
    assert exc.value.status_code == 401
    assert exc.value.detail == "API Key missing"

def test_validate_tenant_api_key_invalid():
    """Prueba que pasa cuando la API Key no existe en la BD."""
    mock_db = MagicMock()
    mock_db.execute.return_value.fetchone.return_value = None
    
    with pytest.raises(HTTPException) as exc:
        validate_tenant_api_key(x_api_key="wrong_key", db=mock_db)
    assert exc.value.status_code == 401
    assert exc.value.detail == "Invalid or inactive API Key"

def test_validate_tenant_api_key_success():
    """Prueba del flujo exitoso con la API Key global configurada."""
    mock_db = MagicMock()
    # fetchone se llama 2 veces: primero para el tenant, luego para la config global
    mock_db.execute.return_value.fetchone.side_effect = [(99,), ("sk-groq-master-123",)]
    
    result = validate_tenant_api_key(x_api_key="valid_key", db=mock_db)
    
    assert result["user_id"] == 99
    assert result["groq_api_key"] == "sk-groq-master-123"

def test_validate_tenant_api_key_no_global_key():
    """Prueba cuando el inquilino existe, pero el superadmin no ha configurado Groq."""
    mock_db = MagicMock()
    mock_db.execute.return_value.fetchone.side_effect = [(99,), None]
    
    result = validate_tenant_api_key(x_api_key="valid_key", db=mock_db)
    assert result["groq_api_key"] is None