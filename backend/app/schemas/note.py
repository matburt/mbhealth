from datetime import datetime

from pydantic import BaseModel


class NoteBase(BaseModel):
    health_data_id: int
    content: str

class NoteCreate(NoteBase):
    pass

class NoteUpdate(BaseModel):
    content: str | None = None

class NoteOut(NoteBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: datetime
    class Config:
        from_attributes = True
