# 🦷 Dental AI Orchestrator

The **Dental AI Orchestrator** is a next-generation clinical management platform tailored specifically for private dental practices. Designed to eliminate the latency vs. reliability tradeoff inherent in modern electronic health records, it blends an incredibly fast Local-First Edge Database with an AI-powered Post-Processing Cloud Vault. 

Our mission? Turn doctors back into healers by abstracting away drop-downs, clunky forms, and administrative noise using natural language processing.

---

## 🎯 The Why, What, and How

### The Problem (Why)
In markets like India, 90% of dental charting remains written on paper because clinical software forces doctors to choose between two extremes:
1. **Click-Heavy Interfaces:** Drop-downs and textboxes pull the doctor's eyes away from the patient.
2. **The Cloud Latency Tradeoff:** Waiting for distant servers to load patient history interrupts the natural flow of consultation. Even voice-to-text platforms merely dump raw transcripts into the cloud without structured understanding.

### The Solution (What)
We built an **Edge-To-Cloud Orchestrator** that allows doctors to command the system almost entirely through Voice, with zero clicks required to log complex clinical data.

### The Architecture (How)
- **Local-First Speed (Dexie.js):** The frontend caches today's schedule, reminders, and active patient profiles directly in the browser's IndexedDB. Interactions are instantaneous, even offline.
- **Llama-3 Edge Reasoning (Python + Groq):** Audio transcends simple transcription. Raw voice notes are parsed by a local LLM agent to classify "Intents" (e.g., adding a reminder, answering a RAG clinical question, or quoting an Invisalign cost).
- **Text-to-SQL Analytics:** Complex financial aggregates (e.g. "What is our revenue for Root Canals this month?") are passed through an AI interpreter that safely crafts PostgreSQL queries to generate native UI charts instantly.

---

## ✨ Features Currently Implemented

*   🎙️ **Voice-Commanded Intent Routing:** Speak a command to automatically route tasks to Calendars, Reminders, or Visit Notes without touching the keyboard.
*   🧠 **RAG Clinical Memory:** Ask the system natural questions about a patient's historical treatments, and the AI vector-engine will isolate and recite the answer.
*   💰 **Autonomous Financial Extraction:** As doctors dictate clinical notes, the NLP engine automatically detects numbers, differentiates between "Quoted" vs "Collected" payments, and registers the math to an Outstanding Balance ledger.
*   📈 **Dynamic Text-to-SQL Trends:** Type plain-English analytical questions to instantly draw `recharts` Line Graphs based on safe, read-only SQL queries generated on the fly.
*   ⚡ **Zero-State Native Editing:** Every UI element (from Calendar blocks to Daily Reminders) utilizes HTML5 `contentEditable` bindings. See an error? Just click the text, correct it, and click away stringently syncing with the Edge cache!
*   💠 **Luxury Glassmorphism UI:** A pristine White/Gold interface built strictly natively with CSS grids to invoke trust and cleanliness.

---

## 🚀 How to Run the Application

The system requires two localized servers running in tandem: the Vite edge client, and the FastAPI cloud broker.

### 1. Database & Environment Setup
Make sure you have a `.env` file inside the `backend/` directory housing your cloud keys:
```env
DATABASE_URL="postgresql://[user]:[password]@aws-0-eu-central-1.pooler.supabase.com:6543/postgres"
GROQ_API_KEY="gsk_..."
HF_TOKEN="hf_..."
```

### 2. Booting the Backend (FastAPI / Python)
Open your terminal and mount the virtual environment:
```bash
cd backend
python -m venv venv
venv\Scripts\activate      # (On Windows)
# source venv/bin/activate # (On Mac/Linux)

pip install -r requirements.txt
uvicorn main:app --reload --port 8888
```

### 3. Booting the Frontend (React / Vite)
Open a new terminal window:
```bash
cd frontend
npm install
npm run dev
```
Navigate to `http://localhost:5173` to interact with the Orchestrator.

---

## 🔮 Next Steps & Vision map
- **Multi-Modal X-Ray Analysis:** Integrate a vision engine to upload panorex images and automatically draft periodontal findings.
- **WhatsApp Twilio Hooks:** Auto-dispatching Llama-3 crafted Appointment Reminders and Outstanding Balance invoices based on the patient's edge-cache.
- **Multi-Clinic Sync:** Expand the Vector schema so corporate networks can share RAG memory across localized edge devices securely.
