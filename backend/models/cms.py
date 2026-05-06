from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class CMSContent(BaseModel):
    content_id: str
    page: str  # landing, about, terms, privacy
    section: str  # hero, featured_properties, categories, cta
    content_type: str  # text, image, list
    content_data: dict
    is_active: bool = True
    created_at: datetime
    updated_at: datetime

class HeroSection(BaseModel):
    title: str
    subtitle: str
    background_image: str
    cta_text: str
    cta_link: str

class FeaturedProperty(BaseModel):
    property_id: str
    display_order: int

class CMSUpdate(BaseModel):
    content_data: dict
    is_active: Optional[bool] = None