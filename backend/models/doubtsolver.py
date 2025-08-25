from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.responses import JSONResponse
from PIL import Image
import pytesseract
import google.generativeai as genai
import io
from dotenv import load_dotenv
import os

# Load environment variables
load_dotenv()

# Get API key from environment
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
if not GOOGLE_API_KEY:
    raise RuntimeError("GOOGLE_API_KEY is not set in .env file")

# Configure Gemini
genai.configure(api_key=GOOGLE_API_KEY)
model = genai.GenerativeModel('gemini-1.5-flash')

# Initialize FastAPI app
app = FastAPI(title="Doubt Solver API", description="Extracts text from image and answers via Gemini AI")

# ---------- Helper Functions ----------
def extract_text_from_image(uploaded_file: UploadFile) -> str:
    try:
        image = Image.open(io.BytesIO(uploaded_file.file.read()))
        text = pytesseract.image_to_string(image)
        return text.strip() if text else None
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error during OCR: {e}")

def get_gemini_answer_from_text(question_text: str) -> str:
    prompt = f"""
    You are a study assistant for students. 
    The following question was extracted from an image:

    {question_text}

    Please provide a clear, student-friendly answer.
    """
    try:
        response = model.generate_content(prompt)
        return response.text.strip() if response.text else "❗ No answer generated."
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error with Gemini: {e}")

# ---------- Routes ----------
@app.post("/solve_doubt/")
async def solve_doubt(image: UploadFile = File(...)):
    # Step 1: OCR
    extracted_text = extract_text_from_image(image)
    if not extracted_text:
        raise HTTPException(status_code=400, detail="No text found in image.")
    
    # Step 2: Gemini Answer
    answer = get_gemini_answer_from_text(extracted_text)

    # Response
    return JSONResponse(content={
        "extracted_text": extracted_text,
        "gemini_answer": answer
    })
