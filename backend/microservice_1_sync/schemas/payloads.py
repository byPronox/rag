"""Contrato de mensajes Odoo -> MS1. Un mensaje inválido es un error permanente (va a parking)."""
from typing import Any, List, Literal, Optional

from pydantic import BaseModel, ConfigDict, Field, ValidationError, field_validator

MAX_PRICE = 99_999_999.99   # NUMERIC(10, 2)
MAX_TAX = 999.99            # NUMERIC(5, 2)


class PayloadError(ValueError):
    """El mensaje no cumple el contrato."""


class _BasePayload(BaseModel):
    model_config = ConfigDict(extra="ignore")
    api_key: Optional[str] = None
    webhook_url: Optional[str] = None
    event_ts: Optional[int] = Field(default=None, gt=0)


class ProductPayload(_BasePayload):
    action: Literal["create", "update", "sync"]
    variant_id: int = Field(gt=0)
    template_id: Any = None
    sku: Optional[str] = Field(default=None, max_length=100)
    display_name: str = Field(min_length=1)
    description: Optional[str] = None
    company_id: Any = None
    company_name: Optional[str] = Field(default=None, max_length=255)
    category: Optional[str] = Field(default=None, max_length=100)
    accessories: Optional[str] = ""
    alternatives: Optional[str] = ""
    website_url: Optional[str] = None
    image_128_url: Optional[str] = None
    image_512_url: Optional[str] = None
    image_1920_url: Optional[str] = None
    currency: Optional[str] = Field(default=None, max_length=10)
    stock: Optional[float] = None
    price_excluded: Optional[float] = Field(default=None, ge=0, le=MAX_PRICE)
    price_included: Optional[float] = Field(default=None, ge=0, le=MAX_PRICE)
    tax_percent: Optional[float] = Field(default=None, ge=0, le=MAX_TAX)


class DeletePayload(_BasePayload):
    action: Literal["delete"]
    variant_id: int = Field(gt=0)


class Company(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(min_length=1)
    name: str = Field(min_length=1, max_length=255)

    @field_validator("id", mode="before")
    @classmethod
    def _id_to_str(cls, value):
        if isinstance(value, int) and not isinstance(value, bool):
            return str(value)
        return value


class SyncCompaniesPayload(_BasePayload):
    action: Literal["sync_companies"]
    companies: List[Company]


class ReconcilePayload(_BasePayload):
    action: Literal["reconcile"]
    variant_ids: List[int]
    event_ts: int = Field(gt=0)


_MODELS = {
    "create": ProductPayload,
    "update": ProductPayload,
    "sync": ProductPayload,
    "delete": DeletePayload,
    "sync_companies": SyncCompaniesPayload,
    "reconcile": ReconcilePayload,
}


def validate_payload(data):
    """Valida el mensaje según su acción. Lanza PayloadError con un detalle legible."""
    action = data.get("action")
    model = _MODELS.get(action)
    if model is None:
        raise PayloadError(f"Unknown action '{action}'.")
    try:
        model.model_validate(data)
    except ValidationError as e:
        details = "; ".join(
            f"{'.'.join(str(p) for p in err['loc'])}: {err['msg']}" for err in e.errors())
        raise PayloadError(f"Invalid payload for action '{action}': {details}") from e