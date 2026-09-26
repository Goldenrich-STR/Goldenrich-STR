from datetime import datetime, timezone
from enum import Enum
from typing import List, Optional
from uuid import uuid4

from pydantic import BaseModel, Field, field_validator, model_validator


class PriceRuleType(str, Enum):
    WEEKEND = "WEEKEND"
    SEASON = "SEASON"
    CUSTOM = "CUSTOM"


class AdjustmentType(str, Enum):
    INCREASE = "INCREASE"
    DECREASE = "DECREASE"


class PropertyPriceRule(BaseModel):
    rule_id: str = Field(default_factory=lambda: f"pr_{uuid4().hex[:14]}")
    property_id: str
    rule_type: PriceRuleType
    rule_name: str
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    days_of_week: List[int] = []
    day_adjustments: dict[str, float] = {}
    adjustment_type: AdjustmentType = AdjustmentType.INCREASE
    adjustment_percentage: float = Field(ge=0, le=1000)
    is_active: bool = True
    priority: int = 100
    created_by: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    @field_validator("start_date", "end_date")
    @classmethod
    def valid_iso_date(cls, value):
        if value:
            datetime.strptime(value[:10], "%Y-%m-%d")
            return value[:10]
        return value

    @model_validator(mode="after")
    def valid_range(self):
        if self.rule_type in {PriceRuleType.SEASON, PriceRuleType.CUSTOM}:
            if not self.start_date or not self.end_date:
                raise ValueError("Start and end dates are required")
            if self.end_date < self.start_date:
                raise ValueError("End date must be on or after start date")
        if self.rule_type == PriceRuleType.WEEKEND and not self.days_of_week:
            self.days_of_week = [5, 6]
        return self


class PriceRuleCreate(BaseModel):
    property_ids: List[str]
    rule_type: PriceRuleType
    rule_name: str
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    days_of_week: List[int] = []
    day_adjustments: dict[str, float] = {}
    adjustment_type: AdjustmentType = AdjustmentType.INCREASE
    adjustment_percentage: float = Field(ge=0, le=1000)
    is_active: bool = True


class PriceRuleUpdate(BaseModel):
    rule_name: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    days_of_week: Optional[List[int]] = None
    day_adjustments: Optional[dict[str, float]] = None
    adjustment_type: Optional[AdjustmentType] = None
    adjustment_percentage: Optional[float] = Field(default=None, ge=0, le=1000)
    is_active: Optional[bool] = None


class BulkPriceUpdate(BaseModel):
    property_ids: List[str]
    adjustment_type: AdjustmentType
    adjustment_percentage: float = Field(ge=0, le=100)


class PriceCalculationRequest(BaseModel):
    property_id: str
    date: str

