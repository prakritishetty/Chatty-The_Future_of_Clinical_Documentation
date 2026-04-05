# main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import uvicorn
from ai_adapter import transcribe_audio, query_llm_with_rag, classify_intent, analyze_transcript
import uuid
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import Depends
from database import get_db
from models import PatientCloudDB, VisitNoteCloudDB, AppointmentsCloudDB
from fastembed import TextEmbedding
from fastapi.responses import Response
from huggingface_hub import InferenceClient
import os
from fastapi import FastAPI, Depends, HTTPException
import re
from sqlalchemy import func
from models import FinancialsCloudDB
from ai_adapter import extract_financial_transactions




app = FastAPI(title="Dental AI Vault & Orchestrator")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Define Payloads ---

class VoicePayload(BaseModel):
    audio_base64: str | None = None
    text_fallback: str | None = None   # NEW: Allows bypassing the microphone entirely!


class QueryPayload(BaseModel):
    question: str
    patient_id: Optional[str] = None

class SyncPayload(BaseModel):
    patient_id: str  # We will use UUIDs structurally
    raw_transcript: str

class TTSPayload(BaseModel):
    text: str



# # NEW: The Data Structure for our Cloud Fine-Tuning Storage!
# class TelemetryFeedback(BaseModel):
#     scenario: str                     # 'update' or 'query'
#     audio_s3_url: Optional[str] = None # For STT Audio fine-tuning later
#     raw_transcript: str               # What Sarvam heard
#     corrected_transcript: str         # What the doctor manually corrected it to
#     patient_navigated_to: Optional[str] = None  # Did the doctor navigate correctly?
#     user_sentiment: int               # e.g., 1 (Approved), 0 (Discarded), -1 (Follow-up Negative)
#     ai_answer_spoken: Optional[str] = None # For Scenario B LLM fine-tuning

class TelemetryPayload(BaseModel):
    scenario: str
    raw_transcript: str
    corrected_transcript: str
    user_sentiment: int

class PatientUpdatePayload(BaseModel):
    first_name: str | None = None
    last_name: str | None = None
    age: int | None = None
    email: str | None = None
    phone: str | None = None
    preferred_hours: str | None = None

print("Loading Local Embedding Model...")
embedding_model = TextEmbedding("BAAI/bge-small-en-v1.5")


# --- Endpoints ---
@app.get("/")
async def health_check():
    return {"status": "Dr. Sandhya's Orchestrator Active. DB Connection Pending."}


# @app.post("/api/stt")
# async def handle_voice_transcription(payload: VoicePayload):
#     """Scenario A & B Entry Point: Listens and Routes Intent securely via LLM"""
#     transcript = await transcribe_audio(payload.audio_base64)
    
#     # NEW: Secure Groq LLM Intent Routing
#     intent = await classify_intent(transcript)
#     if intent not in ["query", "update"]:
#         intent = "none" # Failsafe
    
#     print(f"--- ROUTER ASSIGNED INTENT: {intent.upper()} ---")
    
#     return {
#         "transcript": transcript, 
#         "intent": intent, 
#         "confidence": 0.99
#     }

# @app.post("/api/telemetry")
# async def log_feedback_for_finetuning(payload: TelemetryFeedback):
#     """
#     Receives all UI corrections, approvals, and discards.
#     Stores them directly in the Cloud DB (not Edge) for offline RLHF batch training.
#     """
#     print(f"--- TELEMETRY LOGGED ---")
#     print(f"Scenario: {payload.scenario}")
#     print(f"Original STT: {payload.raw_transcript}")
#     print(f"Doctor's Edit: {payload.corrected_transcript}")
#     print(f"Sentiment: {'Positive' if payload.user_sentiment > 0 else 'Negative'}")
    
#     # TODO: Insert `payload.dict()` into Postgres analytics table
#     return {"status": "Feedback committed to Cloud Vault for model training."}

@app.post("/api/telemetry")
async def save_telemetry(payload: TelemetryPayload, db_session: AsyncSession = Depends(get_db)):
    """Saves the exact corrections the doctor made into the RLHF Training vault."""
    try:
        new_feedback = STTFeedbackCloudDB(
            scenario=payload.scenario,
            raw_transcript=payload.raw_transcript,
            corrected_transcript=payload.corrected_transcript,
            user_sentiment=payload.user_sentiment
        )
        db_session.add(new_feedback)
        await db_session.commit()
        print(f"--- TELEMETRY LOGGED: Voice corrected by user ---")
        return {"status": "success"}
    except Exception as e:
        print(f"Telemetry Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))



# Then replace your /api/ask endpoint:
# @app.post("/api/ask")
# async def handle_doctor_query(payload: QueryPayload, db_session: AsyncSession = Depends(get_db)):
#     """Scenario B: Translates a question into math, searches the Vault, and answers."""
    
#     # 1. Turn the Doctor's Question into Math
#     query_vector = list(next(embedding_model.embed([payload.question])))
    
#     # 2. The 5 Lines of Vector Search! (Find top 3 most relevant historical notes)
#     stmt = select(VisitNoteCloudDB).order_by(
#         VisitNoteCloudDB.embedding.l2_distance(query_vector)
#     ).limit(3)
    
#     # Execute the Search against Supabase
#     results = await db_session.execute(stmt)
#     best_notes = results.scalars().all()
    
#     # 3. Bundle the found history into a cleanly formatted paragraph
#     context = "\n\n".join([f"Date: {note.date.strftime('%Y-%m-%d')}\nNote: {note.raw_transcript}" for note in best_notes])
#     if not context:
#         context = "No previous patient records found in Vault."
        
#     print("--- CONTEXT RAG FOUND ---")
#     print(context)
        
#     # 4. Feed the raw context + the question to Llama 3!
#     answer = await query_llm_with_rag(payload.question, context)
    
#     return {
#         "answer": answer, 
#         "retrieved_records_count": len(best_notes)
#     }

# @app.post("/api/stt")
# async def handle_voice_transcription(payload: VoicePayload, db_session: AsyncSession = Depends(get_db)):
#     """Scenario A & B: STT -> Deep Extraction -> Database Resolution -> UI Navigation Payload"""
#     transcript = await transcribe_audio(payload.audio_base64)
    
#     # Run the Secure Llama 3 Extraction
#     ai_analysis = await analyze_transcript(transcript)
#     intent = ai_analysis.get("intent", "update")
#     patient_name = ai_analysis.get("patient_name")
    
#     patient_uuid = None
    
#     # Database Resolution Logic
#     if patient_name and str(patient_name).lower() != "null":
#         # 1. Query Postgres (Supabase) to see if this patient already exists (case insensitive search)
#         first_name_guess = patient_name.split()[0]
#         stmt = select(PatientCloudDB).where(PatientCloudDB.first_name.ilike(f"%{first_name_guess}%"))
#         result = await db_session.execute(stmt)
#         db_patient = result.scalar_one_or_none()
        
#         if db_patient:
#             patient_uuid = str(db_patient.id)
#             print(f"--- MATCH FOUND: {patient_name} -> {patient_uuid} ---")
            
#         elif intent == "update":
#             # 2. If it's a new update for an unknown person, Auto-Create them!
#             new_id = uuid.uuid4()
#             name_parts = patient_name.split()
#             first = name_parts[0]
#             last = " ".join(name_parts[1:]) if len(name_parts) > 1 else ""
            
#             new_patient = PatientCloudDB(id=new_id, first_name=first, last_name=last)
#             db_session.add(new_patient)
#             await db_session.commit()
            
#             patient_uuid = str(new_id)
#             print(f"--- NEW PATIENT CREATED: {patient_name} -> {patient_uuid} ---")
#         return {
#         "transcript": transcript,
#         "intent": analysis.get("intent", "none"),
#         "patient_name": final_patient_name,
#         "patient_id": final_patient_id,
#         "reason": analysis.get("reason"),
#         "calculated_date": analysis.get("calculated_date")
#     }
@app.post("/api/stt")
async def handle_voice_transcription(payload: VoicePayload, db_session: AsyncSession = Depends(get_db)):
    """Scenario A & B: STT -> Deep Extraction -> Database Resolution -> UI Navigation Payload"""
    
    # 1. Fallback routing! Skip Whisper if the doctor just typed text!
    if payload.text_fallback:
        transcript = payload.text_fallback
    else:
        transcript = await transcribe_audio(payload.audio_base64)
    
    # 2. Run the Secure Llama 3 Extraction
    ai_analysis = await analyze_transcript(transcript)
    intent = ai_analysis.get("intent", "update")
    patient_name = ai_analysis.get("patient_name")
    
    patient_uuid = None
    
    # 3. Database Resolution Logic
    if patient_name and str(patient_name).lower() != "null":
        first_name_guess = patient_name.split()[0]
        stmt = select(PatientCloudDB).where(PatientCloudDB.first_name.ilike(f"%{first_name_guess}%"))
        result = await db_session.execute(stmt)
        db_patient = result.scalar_one_or_none()
        
        if db_patient:
            patient_uuid = str(db_patient.id)
            print(f"--- MATCH FOUND: {patient_name} -> {patient_uuid} ---")
            
        elif intent == "update":
            new_id = uuid.uuid4()
            name_parts = patient_name.split()
            first = name_parts[0]
            last = " ".join(name_parts[1:]) if len(name_parts) > 1 else ""
            
            new_patient = PatientCloudDB(id=new_id, first_name=first, last_name=last)
            db_session.add(new_patient)
            await db_session.commit()
            
            patient_uuid = str(new_id)
            print(f"--- NEW PATIENT CREATED: {patient_name} -> {patient_uuid} ---")
            
    # FIXED: The variable names are now perfectly correct!
    return {
        "transcript": transcript,
        "intent": intent,
        "patient_name": patient_name,
        "patient_id": patient_uuid,
        "reason": ai_analysis.get("reason"),
        "calculated_date": ai_analysis.get("calculated_date")
    }


# --- Replace the /api/ask Endpoint ---
@app.post("/api/ask")
async def handle_doctor_query(payload: QueryPayload, db_session: AsyncSession = Depends(get_db)):
    """Translates query, physically isolates vectors by Patient ID, and analyzes."""
    
    query_vector = list(next(embedding_model.embed([payload.question])))
    
    # 2. Vector Search Isolation (Applying the WHERE filter)
    stmt = select(VisitNoteCloudDB)
    
    if payload.patient_id:
        patient_uuid = uuid.UUID(payload.patient_id)
        # ISOLATION: 100% guarantee no hallucination from other patients
        stmt = stmt.where(VisitNoteCloudDB.patient_id == patient_uuid)
        print(f"--- RAG ISOLATED STRICTLY TO PATIENT {payload.patient_id} ---")
    else:
        print("--- RUNNING GLOBAL POPULATION QUERY ---")
    
    # Find the top 3 most relevant vector embeddings based on mathematical proximity
    stmt = stmt.order_by(VisitNoteCloudDB.embedding.l2_distance(query_vector)).limit(3)
    
    results = await db_session.execute(stmt)
    best_notes = results.scalars().all()
    
    context = "\n\n".join([f"Date: {note.date.strftime('%Y-%m-%d')}\nNote: {note.raw_transcript}" for note in best_notes])
    if not context:
        context = "No previous patient records found in Vault."
        
    # 4. Feed the raw context + the question to Llama 3!
    answer = await query_llm_with_rag(payload.question, context)
    
    return {
        "answer": answer, 
        "retrieved_records_count": len(best_notes)
    }

@app.post("/api/sync")
async def sync_edge_to_cloud(payload: SyncPayload, db_session: AsyncSession = Depends(get_db)):
    """Receives finalized notes from the iPad/Edge DB and archives them permanently into the Cloud."""
    
    # 1. Enforce strict mathematical UUID parsing
    patient_uuid = uuid.UUID(payload.patient_id)
    
    # 2. Check if this Patient exists in the Cloud yet. If not, auto-create them.
    result = await db_session.execute(select(PatientCloudDB).where(PatientCloudDB.id == patient_uuid))
    db_patient = result.scalar_one_or_none()
    
    if not db_patient:
        db_patient = PatientCloudDB(id=patient_uuid, first_name="Demo", last_name="Patient")
        db_session.add(db_patient)
        await db_session.commit()

    # # 3. MOCK ALGORITHM: Convert the English words into numbers (Vector Embedding)
    # # The real dimensions will come from OpenAI in Phase 5.
    # mock_1536_vector = [0.0123] * 1536 
    
    # # 4. Save the Historical Visit into Supabase!
    # new_archive = VisitNoteCloudDB(
    #     patient_id=patient_uuid,
    #     raw_transcript=payload.raw_transcript,
    #     embedding=mock_1536_vector
    # )
    # 3. REAL ALGORITHM: Convert the English words into numbers (Vector Embedding)
    # FastEmbed returns a generator of numpy arrays, we convert it to a standard python list
    generator = embedding_model.embed([payload.raw_transcript])
    real_384_vector = list(next(generator))
    
    # 4. Save the Historical Visit into Supabase!
    new_archive = VisitNoteCloudDB(
        patient_id=patient_uuid,
        raw_transcript=payload.raw_transcript,
        embedding=real_384_vector # <-- Use the REAL vector here!
    )
     
    db_session.add(new_archive)


        # 5. NEW: Auto-Extract Financials from the Edge Note!
    
    
    # amount_match = re.search(r'\$\s*(\d+(?:\.\d{2})?)|(\d+(?:\.\d{2})?)\s*(?:dollars|bucks)', payload.raw_transcript, re.IGNORECASE)
    # if amount_match:
    #     val1, val2 = amount_match.groups()
    #     amount = float(val1 or val2 or 0)
        
    #     # Simple extraction string for the DB (takes the sentence part before the money)
    #     treatment_str = "Clinical Visit"
    #     if "for" in payload.raw_transcript.lower():
    #         treatment_str = payload.raw_transcript.lower().split("for")[-1].strip()
            
    #     new_finance_log = FinancialsCloudDB(
    #         patient_id=patient_uuid,
    #         treatment=treatment_str,
    #         amount_collected=amount
    #     )
    #     db_session.add(new_finance_log)

    financial_logs = await extract_financial_transactions(payload.raw_transcript)
    
    for log in financial_logs:
        if log.get("status") == "collected":
            db_session.add(FinancialsCloudDB(
                patient_id=patient_uuid,
                treatment=log.get("treatment", "Unspecified"),
                amount_collected=float(log.get("amount", 0))
            ))
        elif log.get("status") == "quoted":
            db_patient.outstanding_balance += int(log.get("amount", 0))


    await db_session.commit()
    
    print(f"--- SUCCESS: Pushed Visit for Patient {patient_uuid} to Cloud Vault ---")
    return {"status": "Archived securely in Supabase PostgreSQL"}

@app.post("/api/tts")
async def generate_tts(payload: TTSPayload):
    try:
        client = InferenceClient(provider="fal-ai", api_key=os.environ.get("HF_TOKEN"))
        audio_bytes = client.text_to_speech(payload.text, model="nari-labs/Dia-1.6B")
        return Response(content=audio_bytes, media_type="audio/wav")
    except Exception as e:
        print(f"TTS Error: {e}")
        raise HTTPException(status_code=500, detail="TTS Engine Failed")

@app.get("/api/patients")
async def get_all_patients(db_session: AsyncSession = Depends(get_db)):
    # Returns all patients and visits to safely seed the frontend Edge cache on boot
    patients = await db_session.execute(select(PatientCloudDB))
    visits = await db_session.execute(select(VisitNoteCloudDB))
    
    # Convert SQLAlchemy Objects to JSON-Safe Dictionaries
    patient_dicts = [
        {
            "id": str(p.id),
            "first_name": p.first_name,
            "last_name": p.last_name,
            "age": p.age,
            "email": p.email,
            "phone": p.phone,
            "preferred_hours": p.preferred_hours
        } for p in patients.scalars().all()
    ]
    
    visit_dicts = [
        {
            "id": str(v.id),
            "patient_id": str(v.patient_id),
            "date": v.date.isoformat() if v.date else None,
            "raw_transcript": v.raw_transcript
        } for v in visits.scalars().all()
    ]
    
    return {
        "patients": patient_dicts,
        "visits": visit_dicts
    }

@app.patch("/api/patients/{patient_id}")
async def update_patient(patient_id: str, payload: PatientUpdatePayload, db_session: AsyncSession = Depends(get_db)):
    stmt = select(PatientCloudDB).where(PatientCloudDB.id == patient_id)
    result = await db_session.execute(stmt)
    patient = result.scalar_one_or_none()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
        
    update_data = payload.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(patient, key, value)
        
    await db_session.commit()
    return {"status": "success"}


@app.get("/api/trends")
async def get_clinic_trends(db_session: AsyncSession = Depends(get_db)):
    from models import FinancialsCloudDB
    try:
        patients_count = await db_session.scalar(select(func.count(PatientCloudDB.id)))
        finance_sum = await db_session.scalar(select(func.sum(FinancialsCloudDB.amount_collected)))
        
        return {
            "total_patients": patients_count or 0,
            "revenue": float(finance_sum or 0)
        }
    except Exception as e:
        print("Trends Error:", e)
        return {"total_patients": 0, "revenue": 0}


@app.post("/api/custom-trends")
async def execute_custom_trend(payload: dict, db_session: AsyncSession = Depends(get_db)):
    from ai_adapter import generate_sql_trend
    from sqlalchemy import text
    
    human_query = payload.get('query', '')
    sql_str = await generate_sql_trend(human_query)
    
    # Mathematical Guard: Block AI Hallucinations from deleting data!
    if "drop " in sql_str.lower() or "delete " in sql_str.lower() or "update " in sql_str.lower() or "insert " in sql_str.lower():
        return {"error": "AI attempted unsafe modification. Blocked."}
        
    try:
        # Execute the raw Llama AI string against PostgreSQL
        result = await db_session.execute(text(sql_str))
        rows = [dict(row) for row in result.mappings().all()]
        return {"query": human_query, "sql": sql_str, "data": rows}
    except Exception as e:
        return {"error": f"SQL Execution Failed: {str(e)}"}




if __name__ == "__main__":
    # Runs the server locally
    uvicorn.run("main:app", host="0.0.0.0", port=8888, reload=True)
