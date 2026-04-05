from sqlalchemy import Column, String, Text, DateTime, ForeignKey, Integer, Numeric, func, Date, Time
from sqlalchemy.dialects.postgresql import UUID
from pgvector.sqlalchemy import Vector
from database import Base
import uuid
from datetime import datetime

class PatientCloudDB(Base):
    # This stores the absolute historical record of the Patient
    __tablename__ = "patients"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(String, default="clinic_1", index=True) # MULTI-TENANT ISOLATION BOUNDARY!
    first_name = Column(String)
    last_name = Column(String)
    age = Column(Integer, nullable=True)
    email = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    outstanding_balance = Column(Integer, default=0)
    preferred_hours = Column(String, nullable=True)

class VisitNoteCloudDB(Base):
    # This stores "Visits 1 to N-1" (The historical deep archive)
    __tablename__ = "visit_notes"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    patient_id = Column(UUID(as_uuid=True), ForeignKey("patients.id"), index=True)
    date = Column(DateTime, default=datetime.utcnow)
    
    # Text Storage
    raw_transcript = Column(Text)
    corrected_transcript = Column(Text)
    
    # 🌟 Mathematical Representation of the text for Semantic Search (RAG)
    embedding = Column(Vector(384)) # 1536 dimensions is the standard size for OpenAI embeddings

class STTFeedbackCloudDB(Base):
    __tablename__ = 'stt_feedback'
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    scenario = Column(String)
    raw_transcript = Column(Text)
    corrected_transcript = Column(Text)
    user_sentiment = Column(Integer)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())

class FinancialsCloudDB(Base):
    __tablename__ = 'financials'
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    patient_id = Column(UUID(as_uuid=True), ForeignKey('patients.id'))
    date = Column(DateTime(timezone=True), server_default=func.now())
    treatment = Column(String)
    amount_collected = Column(Numeric)

class AppointmentsCloudDB(Base):
    __tablename__ = 'appointments'
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    patient_id = Column(UUID(as_uuid=True), ForeignKey('patients.id'), nullable=True)
    patient_name = Column(String)
    date = Column(String) # Stored as YYYY-MM-DD
    time = Column(String)
    type = Column(String)

class CustomTrendsCloudDB(Base):
    """Stores the Text-to-SQL translated queries so the Trends UI renders them forever!"""
    __tablename__ = "custom_trends"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    query_name = Column(String)
    sql_string = Column(String)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
