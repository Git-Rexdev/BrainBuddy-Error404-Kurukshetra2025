import os
from dotenv import load_dotenv
import google.generativeai as genai

load_dotenv()
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
if not GOOGLE_API_KEY:
    raise RuntimeError("GOOGLE_API_KEY is not set in .env")

genai.configure(api_key=GOOGLE_API_KEY)

# Provide both models if you want to vary by task
flash_15 = genai.GenerativeModel("gemini-1.5-flash")
flash_25 = genai.GenerativeModel("gemini-2.5-flash")
