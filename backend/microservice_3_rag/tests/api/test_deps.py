from unittest.mock import MagicMock

import pytest
from fastapi import HTTPException

from api.deps import get_active_company, validate_tenant_api_key


def db_with(*fetchone_results):
    db = MagicMock()
    db.execute.return_value.fetchone.side_effect = list(fetchone_results)
    return db


def test_validate_tenant_api_key_missing():
    with pytest.raises(HTTPException) as exc:
        validate_tenant_api_key(x_api_key="", db=MagicMock())
    assert exc.value.status_code == 401
    assert exc.value.detail == "API Key missing"


def test_validate_tenant_api_key_invalid_or_inactive_user():
    db = db_with(None)
    with pytest.raises(HTTPException) as exc:
        validate_tenant_api_key(x_api_key="wrong_key", db=db)
    assert exc.value.status_code == 401
    assert "u.is_active = true" in str(db.execute.call_args.args[0])


def test_validate_tenant_api_key_success():
    result = validate_tenant_api_key(x_api_key="valid", db=db_with((99,), ("sk-groq", False, "Supreme")))
    assert result == {"user_id": 99, "groq_api_key": "sk-groq", "supreme_prompt": "Supreme"}


def test_validate_tenant_api_key_no_global_settings():
    result = validate_tenant_api_key(x_api_key="valid", db=db_with((99,), None))
    assert result["groq_api_key"] is None and result["supreme_prompt"] is None


def test_maintenance_mode_returns_503():
    with pytest.raises(HTTPException) as exc:
        validate_tenant_api_key(x_api_key="valid", db=db_with((99,), ("sk", True, "S")))
    assert exc.value.status_code == 503


def test_get_active_company():
    company = get_active_company(db_with(("prompt", "openai/gpt-oss-20b", "Hola", "#fff", "Bot")), 99, "7")
    assert company["system_prompt"] == "prompt" and company["llm_model"] == "openai/gpt-oss-20b"


def test_get_active_company_not_found():
    with pytest.raises(HTTPException) as exc:
        get_active_company(db_with(None), 99, "7")
    assert exc.value.status_code == 404
