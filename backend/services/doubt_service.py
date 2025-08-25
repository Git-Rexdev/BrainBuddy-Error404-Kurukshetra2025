from fastapi import HTTPException
from services.llm_client import flash_25

def get_answer_from_text(question_text: str) -> str:
    prompt = f"""
    You are a study assistant for students.
    The following question was extracted from an image:

    {question_text}

    Provide a clear, step-by-step, student-friendly answer.
    """
    try:
        resp = flash_25.generate_content(prompt)
        return (resp.text or "No answer generated.").strip()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gemini error: {e}")
