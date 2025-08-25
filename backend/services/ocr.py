from fastapi import UploadFile, HTTPException
from PIL import Image
import pytesseract
import io

async def extract_text_from_image(uploaded_file: UploadFile) -> str:
    try:
        data = await uploaded_file.read()
        image = Image.open(io.BytesIO(data))
        text = pytesseract.image_to_string(image)
        return (text or "").strip()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"OCR error: {e}")
