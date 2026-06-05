from pydantic import BaseModel, Field
from datetime import datetime, timezone
from typing import Optional

class AIAgent(BaseModel):
    agent_id: str = Field(default_factory=lambda: f"agent_{datetime.now(timezone.utc).timestamp()}")
    agent_name: str
    voice_type: str  # "Male", "Female", "Neural"
    language: str    # "English", "Hindi", "Marathi"
    greeting_message: str
    external_voice_name: Optional[str] = None
    is_active: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class AIAgentCreate(BaseModel):
    agent_name: str
    voice_type: str
    language: str
    greeting_message: str
    external_voice_name: Optional[str] = None
