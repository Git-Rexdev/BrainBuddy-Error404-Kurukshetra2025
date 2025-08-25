from fastapi import HTTPException
from services.llm_client import flash_25

def summarize_text(text: str) -> str:
    prompt = f"""
    You are an AI study assistant.
    Summarize the following educational content for a 10th-grade student.
    Use short sentences, bullet points, and highlight key concepts.
    Generate summary based on the content size or length. 
    It should neither be too short nor be too long just like textbooks.

    Content:
    {text}
    """
    try:
        resp = flash_25.generate_content(prompt)
        return (resp.text or "No summary generated.").strip()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gemini summarization error: {e}")
