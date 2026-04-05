# backend/ai_adapter.py
import os
import base64
from groq import AsyncGroq
from dotenv import load_dotenv
import dateparser

load_dotenv()

# Initialize the Groq Client (which automatically finds GROQ_API_KEY in your .env)
_client = None
def get_groq_client() -> AsyncGroq:
    global _client
    if _client is None:
        _client = AsyncGroq()
    return _client

import json # Ensure this is at the top of the file

# async def analyze_transcript(transcript: str) -> dict:
#     """Uses Llama-3 to extract intent AND the specific Patient Name mentioned."""
#     try:
#         system_prompt = (
#             "You are a highly precise clinical router. You receive a voice transcript from a dentist.\n"
#             "Task 1: Determine the intent. Options are:\n"
#             "   - 'query': asking a historical question about a patient or clinic.\n"
#             "   - 'update': recording a standard clinical visit note.\n"
#             "   - 'reminder': the doctor wants to be reminded to do something.\n"
#             "   - 'calendar': the doctor is booking an appointment or followup.\n"
#             "   - 'finance': the doctor is noting they charged, collected, or billed an amount.\n"
#             "Task 2: Extract the full name of the patient being referenced. If no specific patient is referenced, return null.\n"
#             "Output strictly as pure JSON in this format:\n"
#             '{"intent": "query" | "update" | "reminder" | "calendar" | "finance", "patient_name": "Full Name" | null}'
#         )
#         client = get_groq_client()
#         chat_completion = await client.chat.completions.create(
#             messages=[
#                 {"role": "system", "content": system_prompt},
#                 {"role": "user", "content": transcript}
#             ],
#             model="llama-3.3-70b-versatile",
#             temperature=0.0,
#             response_format={"type": "json_object"}
#         )
        
#         # Parse the JSON string returned by Llama 3 into a Python Dictionary
#         result = chat_completion.choices[0].message.content
#         return json.loads(result)
        
#     except Exception as e:
#         print(f"Intent Extraction Error: {e}")
#         # Safe Fallback
#         return {"intent": "none", "patient_name": None} 
async def analyze_transcript(transcript: str) -> dict:
    try:
        system_prompt = (
            "You are a highly precise clinical router. You receive a voice transcript from a dentist.\n"
            "Task 1: Determine the intent. Options are: 'query', 'update', 'reminder', 'calendar', 'finance'.\n"
            "Task 2: Extract the full name of the patient being referenced (or null).\n"
            "Task 3: If intent is 'calendar' or 'reminder', extract the spoken date or time (e.g. 'next Thursday', 'in two weeks') into 'date_expression'. Otherwise null.\n"
            "Task 4: If intent is 'calendar' or 'reminder', extract a short summary of WHY into 'reason'. Otherwise null.\n"
            "Output strictly as pure JSON in this format:\n"
            '{"intent": "...", "patient_name": "..." | null, "date_expression": "..." | null, "reason": "..." | null}'
        )
        client = get_groq_client()
        chat_completion = await client.chat.completions.create(
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": transcript}
            ],
            model="llama-3.3-70b-versatile",
            temperature=0.0,
            response_format={"type": "json_object"}
        )
        content = chat_completion.choices[0].message.content
        parsed = json.loads(content)
        
        # --- NEW: Deterministic Math Engine ---
        raw_date = parsed.get("date_expression")
        if raw_date:
            try:
                # Calculates dates relative to TODAY dynamically!
                exact_date = dateparser.parse(raw_date, settings={'PREFER_DATES_FROM': 'future'})
                parsed["calculated_date"] = exact_date.strftime("%Y-%m-%d") if exact_date else raw_date
            except Exception:
                parsed["calculated_date"] = raw_date
        else:
            parsed["calculated_date"] = None
            
        return parsed
    except Exception as e:
        print(f"Error parsing intent: {e}")
        return {"intent": "none", "patient_name": None, "date_expression": None, "reason": None, "calculated_date": None}


async def classify_intent(transcript: str) -> str:
    """Uses Llama-3 to strictly classify if the doctor is asking a question or recording a note."""
    try:
        system_prompt = (
            "You are a highly precise clinical router. You receive a voice transcript from a dentist. You need to extract the intent and patient's name (if there)\n"
            "If the transcript is asking a question or requesting historical information, return strictly the word 'query'.\n"
            "If the transcript is recording a patient observation, diagnosis, or note, return strictly the word 'update'.\n"
            "Respond ONLY with a valid JSON format like this (with double quotes):\n"
            '{"intent": "update", "patient_name": "John Doe"}'
        )
        client = get_groq_client()
        
        chat_completion = await client.chat.completions.create(
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": transcript}
            ],
            model="llama-3.3-70b-versatile", # Groq's lightning fast 8B model
            temperature=0.0
        )
        print("transcript \n", transcript)
        print("intent", chat_completion.choices[0].message.content.strip().lower())
        # Strip just in case the LLM added rogue punctuation
        return chat_completion.choices[0].message.content.strip().lower()
        
    except Exception as e:
        print(f"Intent Router Error: {e}")
        return "update" # Safe fallback


async def transcribe_audio(audio_base64: str) -> str:
    """Takes the WebM audio from React, decodes it, and hits Groq's insanely fast Whisper V3"""
    try:
        # Convert the Base64 string back into raw bytes
        audio_bytes = base64.b64decode(audio_base64)
        
        # Groq expects a tuple (filename, bytes_data, mimetype)
        audio_file = ("audio.webm", audio_bytes, "audio/webm")

        client = get_groq_client()
        
        # Ship to Groq Whisper Model
        transcription = await client.audio.transcriptions.create(
            file=audio_file,
            model="whisper-large-v3",
            response_format="json",
            language="en",
            temperature=0.0 # 0.0 means "Don't be creative, perfectly transcribe the medical terms"
        )
        return transcription.text
    except Exception as e:
        print(f"STT Error: {e}")
        return f"System Error: Could not transcribe audio."

async def query_llm_with_rag(query: str, context: str) -> str:
    """Feeds the Supabase Vector context into Llama3-70b to answer the doctor's query."""
    try:
        system_prompt = (
            "You are a highly precise Dental AI assistant. Answer the doctor's question using ONLY "
            "the provided clinical context. If the answer is not in the context, strictly say 'Information not found in patient history.'\n\n"
            f"Clinical Context:\n{context}"
        )
        client = get_groq_client()
        
        chat_completion = await client.chat.completions.create(
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": query}
            ],
            model="llama-3.3-70b-versatile",
            temperature=0.2 # Very low temperature for high clinical accuracy
        )
        return chat_completion.choices[0].message.content
        
    except Exception as e:
        print(f"LLM Error: {e}")
        return "System Breakdown: Could not reach Reasoning Engine."

async def extract_financial_transactions(text_transcript: str) -> list:
    """Takes a Visit Note and classifies numbers as Quotes or Payments purely via LLM logic."""
    prompt = f"""
    Analyze this clinical note. Extract any financial variables. 
    Return strictly JSON in this exact array format:
    [{{"treatment": "Scaling", "amount": 500, "status": "collected"}}, {{"treatment": "Root Canal Crown", "amount": 2000, "status": "quoted"}}]
    If no money is mentioned, return an empty array [].
    
    Transcript: {text_transcript}
    """
    
    messages = [
        {"role": "system", "content": "You are a precise data-extraction AI. Output ONLY valid JSON arrays. No intro text, no markdown block wrappers."},
        {"role": "user", "content": prompt}
    ]
    
    try:
        response = client.chat.completions.create(model="llama3-8b-8192", messages=messages, temperature=0.0)
        raw_text = response.choices[0].message.content.strip()
        # Clean off markdown logic if Llama hallucinates them
        if raw_text.startswith("```"): raw_text = raw_text.split("\n", 1)[1].rsplit("```", 1)[0]
        return json.loads(raw_text)
    except Exception as e:
        print(f"Financial Extraction Failed: {e}")
        return []

async def generate_sql_trend(human_query: str) -> str:
    """Safely constructs READ-ONLY analytics queries."""
    prompt = f"""
    You are a PostgreSQL expert. The user wants a trend graph for: '{human_query}'.
    We have a table `financials` with columns: `date` (timestamp), `amount_collected` (float), `treatment` (string).
    
    Write a raw SELECT SQL query that maps this. Usually you should GROUP BY DATE(date).
    Example Output: SELECT DATE(date) as day, SUM(amount_collected) as value FROM financials GROUP BY DATE(date) ORDER BY day ASC;
    
    Return ONLY the raw SQL string. Do NOT write anything else.
    """
    
    messages = [{"role": "system", "content": "Return solely SQL."}, {"role": "user", "content": prompt}]
    
    response = client.chat.completions.create(model="llama3-8b-8192", messages=messages, temperature=0.0)
    return response.choices[0].message.content.strip()

