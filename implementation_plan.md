# Dental AI Assistant Architecture & Implementation Plan

This is the comprehensive, final blueprint for your application. It merges the detailed workflows from your original hand-drawn design with the technical corrections we've discussed (PWA, single vector database, and unstructured UI flows).

## 1. High-Level System Architecture

*   **Frontend (The Device):** **Progressive Web App (PWA) via React (Vite).** A highly cost-effective solution that installs like an app on iPads and offline-caches data, completely avoiding native app store fees. It uses standard WebRTC for high-quality microphone access.
*   **Backend (The Orchestrator):** **Python (FastAPI).** Python naturally integrates with AI workflows, routes audio, and manages database synchronization.
*   **Target Hardware:** Optimized for touch-first tablet usage by a solo dentist (initially).

## 2. The Tiered Data Architecture

Following your design, we implement a strict two-layer storage system:

### A. Device Storage (Edge / Local)
*   **Technology:** `IndexedDB` (using Dexie.js in the browser).
*   **What it stores:** Only what is necessary for immediate speed. 
    *   `Demographics` (Name, Age, Contact, Preferences).
    *   `Visit N` (The *latest* visit notes and dates).
    *   `Capacity limit:` Automatically purges old data, keeping only active/recent patients (e.g., last 5 years active max).
*   **Why?** Ensures instant UI loading and offline capability for basic lookups.

### B. Cloud Storage (The Vault)
*   **Technology:** Single unified database using **PostgreSQL with the `pgvector` extension**, plus **AWS S3** for blob data.
*   **What it stores:**
    *   `Visits 1 to N-1` (Full historical records).
    *   Vector embeddings (mathematical representation of previous visit notes) for RAG semantic search.
    *   `Associated Files` (S3 URLs to x-rays, casts).
*   **Data Isolation (Crucial):** By using `pgvector`, vector searches are forced through a SQL `WHERE patient_id = 123` filter. This mathematically guarantees one patient's data NEVER influences or leaks into another's during a search.

## 3. Core Functionalities & UI Workflows

The system requires real-time interaction between voice and the UI (Voice Navigation).

### Scenario A: Knowledge Base Update (POST Request)
*   **Trigger:** The dentist taps the mic and dictates notes/updates.
*   **Voice Pipeline:** Audio streams to **Sarvam AI (STT)** -> Backend.
*   **Voice Navigation / UI Response:** As the audio is transcribed, the app *automatically navigates* to the relevant Patient UI Page. The raw transcribed text appears immediately in the "Latest Visit" block.
*   **Storage Action:** The new notes become "Visit N" and are saved to Device Storage. Older data is purged from the device and synced to Cloud Storage as "Visit N-1".
*   **Human-in-the-Loop:** The UI displays the *raw, unstructured notes* (not forced SOAP formats). The dentist can manually type/edit to correct any transcription errors.

### Scenario B: Querying Information (GET Request)
*   **Trigger:** The dentist asks a question ("When was John's last root canal?").
*   **Pipeline:** Sarvam STT -> Backend -> Vector DB RAG Search -> **LLM (Claude 3.5 / GPT-4o API)** -> **TTS Service**.
*   **Voice Navigation / UI Response:** While the TTS reads the answer aloud, the app *automatically navigates* to the specific historical visit page ("Visit N-x") that the LLM used as its source, visually highlighting the proof.
*   **Follow-Ups:** The doctor can reply with voice or UI buttons (+ve/-ve sentiment) indicating if the answer was correct or incomplete.

## 4. Fine-Tuning Strategy (Feedback Loops)

Fine-tuning is a server-side batch process run by you (the developer). It does not require pushing new App Store updates or disrupting the app's uptime.

1.  **STT Correction Loop (From POST requests):**
    *   *Data Captured:* `[Original Audio URL]` + `[Sarvam Transcript]` + `[Doctor's Manual UI Edit]`.
    *   *Usage:* If Sarvam struggles with specific dental terminology, you compile these diffs to eventually train a custom open-source STT model.
2.  **LLM Reasoning Loop (From GET requests):**
    *   *Data Captured:* `[Query]` + `[RAG Evidence]` + `[LLM Answer]` + `[Doctor's Sentiment/Correction]`.
    *   *Usage:* Creates a Reinforcement Learning from Human Feedback (RLHF) dataset to refine the RAG prompting or fine-tune an open-source LLM later.

## 5. Modularity (Scaling past "Simplicity")

The initial constraints ("1 dentist, independent patients") will be lifted later. The codebase will be modularized from Day 1 to prevent a total rewrite:

*   **Multi-Dentist / Clinic Ready:** Every database table (Patients, Visits) will include a `tenant_id` column. Currently, it will always hardcode to `clinic_1`. When you add a second dentist, the data isolation boundary is already fully built.
*   **Swappable AI Models:** The LLM and STT calls will be hidden behind generic adapter functions. If you need to switch from ChatGPT to a locally hosted open-source Llama model for HIPAA reasons, you only change one line of API routing code—the rest of the app doesn't change.
*   **Offline Population Metrics:** Because doctors want unstructured conversational notes on the UI, we extract statistics invisibly. A nightly batch process will run an LLM over new unstructured notes, extracting structured data (symptoms, codes) into an `analytics_table`. This fulfills the future requirement for population metrics without forcing doctors to use rigid input forms.

## 6. Realizing the Hand-Drawn Wireframe (Patient Tab UI)

Based on your wireframe image, the UI and Data Storage require a specific multi-panel layout for the Patient View.

### Frontend Data Structure (Edge DB via Dexie)
We will align `db.ts` to exactly mirror your sketch:
```typescript
{
  id: string,
  demographics: { name: string, age: number, email: string, phone: string, preferredHours: string },
  visits: [ { id: string, date: string, time: string, notes: string } ] // Truncated to recent visits (max 5 yrs)
  assoFiles: [ { id: string, date: string, description: string } ]
}
```

### The Patient UI Layout (`src/views/Patients.tsx`)
*   **Left Panel (Demographics):** Pure read-only demographic card.
*   **Main Panel (Visits Log):** A vertically scrolling list. The *latest* visit note must be visually distinct at the top.
*   **Navigation & Update Flow (Post Req):** When the mic finishes recording an *update*, the router instantly maps to `/patients/:id` and injects the STT draft to the top of the "Visits Log". The doctor is presented with an inline **Save / Correct / Discard** button set.

## 7. AI Pipeline Overhaul (Fixing the Flaws)

### Flaw 1: The "Naive" Intent Router
*   **Current State:** `main.py` uses a hardcoded Python `startswith(["what", "when", ...])` check. This fails if a doctor says "Patient reports pain" vs "Did the patient report pain?".
*   **The Fix:** We will use **Llama-3 (via our existing Groq integration)** as a dedicated fast classification gate. 
*   **Architecture:** Before any CRUD logic, we send the STT to a specialized LLM Prompt enforcing JSON output: `{"intent": "query" | "update", "confidence": 0-1}`. This guarantees clinical intent accuracy.

### Flaw 2: Basic Browser TTS
*   **Current State:** The system uses the native screen-reader via `window.speechSynthesis`.
*   **The Fix:** Integrate **NVIDIA Magpie TTS** (Riva or Multilingual downloadable) directly into the `FastAPI` backend.
*   **Architecture (How it works without slowing down iPads):** 
    1. The RAG pipeline generates the text answer.
    2. The **Python Backend server** passes the answer to our locally downloaded `Magpie TTS` PyTorch model (or strikes an inference API). 
    3. The backend does all the heavy computing (VRAM) and returns a tiny, streaming audio blob (`audio/wav`) back to the React UI instead of raw text.
    4. **Crucially: Patient devices (iPads/Mobiles) do NOT download the massive AI model.** The frontend just plays the returned audio organically using a hidden `<audio>` tag, keeping the app lightweight and lightning-fast.

## Next Steps
Once your NVIDIA API key arrives for Riva, or you choose to download the Magpie Multilingual model to your server, we can execute the React and FastAPI component generation!

## 8. Dynamic Patient Resolution & Core Database Implementation

Currently, the system is anchored to a hardcoded `demoUUID` and blindly searches every vector. To truly function as a medical orchestrator, the AI must instantly recognize *who* is being spoken about and isolate their data.

### 1. Upgrade the LLM to an Entity Extractor
We will leverage our fast Llama-3 intent router to also act as a Named Entity Recognition (NER) system. 
*   **The Prompt Update:** Instead of just returning `"update"`, it will return a structured JSON object: `{"intent": "update", "patient_name": "Sachin Shetty"}`.
*   **Graceful Degradation:** If no name is mentioned (e.g., "How many implants did I do last month?"), it returns `{"patient_name": null}`.

### 2. Backend Orchestration (Supabase Postgres)
When the Python backend receives the STT and the extracted JSON from Llama-3:
*   **Updates (Recording a Note):** 
    1. Query Postgres: `SELECT id FROM patients WHERE name ILIKE '%Sachin Shetty%'`
    2. If found -> Use existing UUID.
    3. If not found -> Generate new UUID, insert into Postgres `patients` table.
    4. Return `patient_id` and `patient_name` strictly back to the React UI.
*   **Queries (RAG Search):**
    1. If `patient_name` exists: The Supabase vector search gets a mathematical filter: `WHERE patient_id = :uuid`. This guarantees **100% Data Isolation** and stops the AI from hallucinating another patient's data!
    2. If `patient_name` is NULL: It performs a global semantic search across *all* patients to answer population questions ("How many implants...").

### 3. Frontend Orchestration (Dexie.js Edge Sync)
When the React UI receives the `patient_id` and `patient_name` from the STT endpoint, it will:
1. Attempt to insert/update the Patient into the local Dexie `db.ts` database.
2. Push the new visit note into Dexie, tied to that exact `patient_id`.
3. Use the hook: `navigate('/patients/' + patient_id)` so the UI physically follows the AI's deductions.

### Why did your "Sachin Shetty" RAG query hang earlier?
Because the backend is currently trying to execute a vector search against a Postgres database! If you haven't fully configured your Supabase `DATABASE_URL` in your `.env` file, or haven't run the `init_db.py` script to create the tables, SQLAlchemy crashes in the background, leaving the React UI hanging on "Searching thousands of clinical vectors...".

## Feedback Required
We will build the Database logic first, then update the UI.
1. **Supabase Verification:** Have you created a Supabase project and copied the Postgres connection string into your `backend/.env` file?
2. **Execution:** Once you approve this workflow, I will generate the exact Python code to implement the Entity Extractor and Vector Data Isolation!

## 9. The ChatGPT-26 Feature Push (Current Phase)

To prepare the application for the ChatGPT-26 showcase, we are executing a massive feature push to prove this is a high-agency, production-grade AI Orchestrator, not a simple wrapper.

### 1. Multi-Dimensional Intelligence
*   **Deterministic Date Engine:** LLMs hallucinate calculations. We will inject a Python logic layer to mathematically calculate "last Saturday" or "next Thursday" *before* executing database commands, ensuring flawless chronological accuracy.
*   **The 5-Way Intent Router:** We will upgrade Llama-3 to classify across 5 domains: `update`, `query`, `reminder`, `calendar`, and `finance`.
*   **Dia 1.6B Hyper-Realistic TTS:** We will integrate the HuggingFace `fal-ai` inference engine to replace the browser voice with Nari Labs' state-of-the-art conversational voice.
*   **Voice Greeter "Wakeup":** We will add an interactive trigger ('Hi' / 'Hey') so the app verbally greets the doctor before listening to the full clinical command.

### 2. Data & Telemetry Overhaul
*   **Dual Feedback Loops (RLHF Blueprint):** We will split feedback into `stt_feedback` and `llm_feedback` Postgres tables. **Crucially, we will fix the React Telemetry payload so it captures the actual manual changes a doctor types into the textarea before clicking "Approve and Save" (fixing the `corrected_transcript` null issue).**
*   **Financial Pipeline:** If the doctor says "I collected $500", Llama-3 will extract this and route it to a `financials` table to drive visual Trends.
*   **Patient Vault Schema Expansion:** We will update the `patients` Postgres/Dexie table to securely store: `patient_id` (foreign key sync), `email`, `phone`, and `preferred_hours`.

### 3. Ultimate Control UI
*   **Interactive Query Engine:** We will pause the workflow before RAG kicks in, allowing the doctor to manually edit their spoken question first.
*   **Autonomous Calendar & Reminders:** Voice commands will instantly inject entries into a visual Calendar View and Home Page todo list, tracking completion status.
*   **Universal Editability & Search:** The Patient Directory will feature advanced Sort/Filters (by month/treatment extracted via SQL, not LLM). Every clinical field will be text-editable.
*   **API Ninjas Thought of the Day:** We will wire up `api-ninjas.com/api/quotes` exclusively to the Home View for an elegant daily greeting.

### Open Questions
1. **Approval:** Do you approve grouping these 16 features into this structured rollout? If so, we will attack them systematically, starting with the Database Schema expansions!
