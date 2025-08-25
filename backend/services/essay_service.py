import os
from dotenv import load_dotenv
from joblib import load
from fastapi import HTTPException
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import StrOutputParser

load_dotenv()

# Load ML model once at import
try:
    _essay_model = load("models/essay_grader.joblib")
except Exception as e:
    raise RuntimeError(f"Failed to load essay_grader.joblib: {e}")

_llm = ChatGoogleGenerativeAI(
    model="gemini-2.5-flash",
    temperature=0.2,
    google_api_key=os.getenv("GOOGLE_API_KEY"),
)
_parser = StrOutputParser()
_prompt = PromptTemplate(
    template=(
        "You are an English Language expert. "
        "Analyze the essay:\n{essay}\n\n"
        "This essay has a score of {score}. "
        "Explain in 2 lines why this score was assigned. "
        "If you did not receive the essay, say you did not receive it."
    ),
    input_variables=["essay", "score"],
)
_chain = _prompt | _llm | _parser

def predict_score_and_explain(essay: str):
    try:
        score = float(_essay_model.predict([essay])[0])
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Model prediction error: {e}")
    try:
        explanation = _chain.invoke({"essay": essay, "score": score})
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"LLM error: {e}")

    return {"essay": essay, "predicted_score": score, "explanation": explanation}
