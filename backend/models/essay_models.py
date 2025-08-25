from pydantic import BaseModel, Field

class EssayRequest(BaseModel):
    essay: str

    user_id: str | None = Field(None, alias="userId", description="Uploader's user id")
    name: str | None = None

    class Config:
        allow_population_by_field_name = True
        allow_population_by_alias = True

class EssayResponse(BaseModel):
    essay: str
    predicted_score: float
    explanation: str
