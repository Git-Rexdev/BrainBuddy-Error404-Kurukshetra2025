from fastapi import HTTPException
import fitz  # PyMuPDF
import io
import docx

def extract_text_from_pdf_bytes(b: bytes) -> str:
    try:
        doc = fitz.open(stream=b, filetype="pdf")
        return "\n".join(p.get_text() for p in doc).strip()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PDF extraction error: {e}")

def extract_text_from_docx_bytes(b: bytes) -> str:
    try:
        stream = io.BytesIO(b)
        d = docx.Document(stream)
        return "\n".join(p.text for p in d.paragraphs).strip()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"DOCX extraction error: {e}")
