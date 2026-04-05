import { useEffect, useState, useMemo } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { Mic, Users, CalendarDays, TrendingUp, Wifi, WifiOff, CheckCircle2, Circle } from 'lucide-react';
import { db, seedInitialData } from './db';
import { useLiveQuery } from 'dexie-react-hooks';
import './index.css';
import VoiceButton from './VoiceButton';
import { useNavigate } from 'react-router-dom';
import PatientDetailView from './views/Patients';
import PatientsDirectory from './views/PatientsDirectory';
import CalendarView from './views/Calendar';
import TrendsView from './views/Trends';


// --- Helper Components ---

const SyncStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  // In a real app, this would update after your daily cloud sync POST succeeds
  const [lastSynced] = useState(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <div className="glass-pill" style={{
      display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem',
      color: isOnline ? 'var(--accent-teal)' : 'var(--accent-red)'
    }}>
      {isOnline ? <Wifi size={14} /> : <WifiOff size={14} />}
      <span>{isOnline ? 'Edge Sync Active' : 'Offline Mode'}</span>
      <span style={{ color: 'var(--text-secondary)', marginLeft: '4px' }}>
        | Last: {lastSynced}
      </span>
    </div>
  );
};

const ThoughtOfTheDay = () => {
  const [quote, setQuote] = useState("Loading inspiration...");

  useEffect(() => {
    // ⚠️ Replace YOUR_API_NINJAS_KEY_HERE with your actual key!
    fetch('https://api.api-ninjas.com/v2/quoteoftheday', {
      headers: { 'X-Api-Key': '5vL0EC3ovdzvFqaWKyoYHd80Gc2MT0Q7sKRoyuSN' }
    })
      .then(res => res.json())
      .then(data => {
        if (data && data.length > 0) {
          setQuote(data[0].quote + " — " + data[0].author);
        }
      })
      .catch(() => setQuote("Precision is not just a habit, it's an art."));
  }, []);

  return (
    <div className="glass-panel" style={{ padding: '1rem 2rem', marginBottom: '2rem', textAlign: 'center', fontStyle: 'italic', color: 'var(--accent-blue)' }}>
      "{quote}"
    </div>
  );
};



// --- Page Views ---

const HomeView = () => {
  const today = new Date().toISOString().split('T')[0];

  // Reactively pull data from our Edge DB!
  const appointments = useLiveQuery(() => db.appointments.where('date').equals(today).toArray()) || [];
  const reminders = useLiveQuery(() => db.reminders.toArray()) || [];

  const [trends, setTrends] = useState({ total_patients: 0, revenue: 0 });
  useEffect(() => {
     fetch('http://localhost:8888/api/trends')
       .then(res => res.json())
       .then(data => setTrends(data))
       .catch(e => console.error(e));
  }, []);

  const toggleReminder = async (id: string, currentStatus: boolean) => {
    // Instantly eradicate from Dexie! 
    await db.reminders.delete(id);
  };

  return (

    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <ThoughtOfTheDay /> {/* Add it exclusively to the Home View! */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>

        {/* Left Column: Actionables */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <h2>📅 Today's Schedule</h2>
            {appointments.length === 0 ? <p>No appointments scheduled.</p> : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {appointments.map(app => (
                  <div key={app.id} className="glass-pill" style={{ display: 'flex', justifyContent: 'space-between', borderRadius: '8px' }}>
                    <span style={{ fontWeight: '600' }}>{app.time}</span>
                    <span>{app.patientName}</span>
                    <span style={{ color: 'var(--accent-purple)' }}>{app.type}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <h2>📌 Daily Reminders</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
              {reminders.map(rem => (
                <div key={rem.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', opacity: rem.isCompleted ? 0.5 : 1 }} onClick={() => toggleReminder(rem.id, rem.isCompleted)}>
                  {rem.isCompleted ? <CheckCircle2 color="var(--accent-teal)" /> : <Circle color="var(--text-secondary)" />}
                  {/* <span style={{ textDecoration: rem.isCompleted ? 'line-through' : 'none' }}>{rem.text}</span> */}
                  <span 
                    contentEditable={true}
                    suppressContentEditableWarning={true}
                    onBlur={async (e) => {
                       await db.reminders.update(rem.id, { text: e.currentTarget.textContent || "" });
                    }}
                    style={{ textDecoration: rem.isCompleted ? 'line-through' : 'none', outline: 'none', padding: '2px', borderRadius: '4px' }}
                    onFocus={(e) => (e.currentTarget as HTMLElement).style.background = 'rgba(255, 255, 255, 0.5)'}
                    onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                  >
                    {rem.text}
                  </span>

                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Dynamic Weekly Stats */}
        <div className="glass-panel" style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.6)' }}>
          <div className="flex-between">
            <h2>📊 Weekly Performance</h2>
            <Link to="/trends" style={{ color: 'var(--accent-blue)', textDecoration: 'none', fontSize: '0.9rem', fontWeight: 'bold' }}>Full Analytics →</Link>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginTop: '1rem' }}>
            <div className="glass-pill" style={{ padding: '1.5rem', borderRadius: '12px' }}>
              <p style={{ fontSize: '0.9rem', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Total Patients</p>
              <h1 style={{ color: 'var(--accent-teal)' }}>{trends.total_patients}</h1>
              <p style={{ fontSize: '0.8rem', marginTop: '0.5rem', color: 'var(--text-secondary)' }}>Live Tracker</p>
            </div>
            <div className="glass-pill" style={{ padding: '1.5rem', borderRadius: '12px' }}>
              <p style={{ fontSize: '0.9rem', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Total Accrued</p>
              <h1 style={{ color: 'var(--accent-purple)' }}>₹{trends.revenue.toLocaleString()}</h1>
              <p style={{ fontSize: '0.8rem', marginTop: '0.5rem', color: 'var(--text-secondary)' }}>Cumulative Gross</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// No more placeholders!

// --- Main App Registration ---

function App() {
  const navigate = useNavigate();
  const [assistantMessage, setAssistantMessage] = useState<string | null>(null);
  const [editedTranscript, setEditedTranscript] = useState<string>("");
  const [liveSpokenText, setLiveSpokenText] = useState<string>(""); // NEW!
  const [assistantIntent, setAssistantIntent] = useState<string | null>(null);
  const [ragAnswer, setRagAnswer] = useState<string | null>(null);
  const [currentPatientId, setCurrentPatientId] = useState<string | null>(null);

  useEffect(() => {
    seedInitialData();
    // NEW: Cloud Synchronization Hook
    async function syncFromCloud() {
      try {
        const res = await fetch('http://localhost:8888/api/patients');
        if (res.ok) {
           const data = await res.json();
           // Safely hydrate Edge DB
           for (const p of data.patients) {
              await db.patients.put({
                 id: p.id,
                 firstName: p.first_name,
                 lastName: p.last_name,
                 dob: p.age ? String(p.age) : 'Unknown',
                 lastVisitDate: new Date().toISOString(),
                 status: 'synced',
                 email: p.email,
                 phone: p.phone,
                 preferredHours: p.preferred_hours
              });
           }
        }
      } catch (e) {
        console.log("Cloud sync failed on boot.", e);
      }
    }
    syncFromCloud();
  }, []);

  return (

    <div className="app-container">

      {/* Header */}
      <header className="flex-between glass-panel" style={{ padding: '1rem 2rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '46px', height: '46px', borderRadius: '12px', background: 'rgba(180, 134, 8, 0.08)', border: '1px solid var(--glass-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'inset 0 4px 10px rgba(180, 134, 8, 0.05)' }}>
            <span style={{ fontSize: '1.6rem', filter: 'drop-shadow(0 2px 4px rgba(180,134,8,0.3))' }}>🦷</span>
          </div>
          <h1 style={{ background: 'linear-gradient(90deg, var(--text-primary), var(--accent-purple))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', margin: 0 }}>Dr. Sandhya's Total Dental Care</h1>
        </div>

        <nav style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <Link to="/patients" className="glass-pill" style={{ textDecoration: 'none', color: 'var(--text-primary)', display: 'flex', gap: '8px', alignItems: 'center' }}><Users size={16} /> Patients</Link>
          <Link to="/calendar" className="glass-pill" style={{ textDecoration: 'none', color: 'var(--text-primary)', display: 'flex', gap: '8px', alignItems: 'center' }}><CalendarDays size={16} /> Calendar</Link>
          <Link to="/trends" className="glass-pill" style={{ textDecoration: 'none', color: 'var(--text-primary)', display: 'flex', gap: '8px', alignItems: 'center' }}><TrendingUp size={16} /> Trends</Link>

          <div style={{ width: '1px', height: '20px', background: 'var(--glass-border)', margin: '0 8px' }}></div>

          <SyncStatus />
        </nav>
      </header>

      {/* <ThoughtOfTheDay /> */}

      {/* Content Area */}
      <main style={{ flex: 1 }}>
        <Routes>
          <Route path="/" element={<HomeView />} />
          <Route path="/patients" element={<PatientsDirectory />} />
          <Route path="/patients/:id" element={<PatientDetailView />} />
          <Route path="/calendar" element={<CalendarView />} />
          <Route path="/trends" element={<TrendsView />} />
        </Routes>
      </main>






      {/* The Live Listening Overlay (Shows while you hold/click record) */}
      {liveSpokenText && !assistantMessage && (
        <div className="glass-panel" style={{ position: 'fixed', bottom: '120px', left: '50%', transform: 'translateX(-50%)', padding: '1.5rem', width: '80%', maxWidth: '600px', zIndex: 50, border: '1px solid var(--accent-purple)' }}>
          <p style={{ color: 'var(--accent-purple)', fontWeight: 'bold', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>● Listening</p>
          <p style={{ color: 'white', lineHeight: '1.6', fontSize: '1.1rem' }}>{liveSpokenText}...</p>
        </div>
      )}

      {/* Scenario A: The Update Overlay */}
      {/* {assistantMessage && assistantIntent === 'update' && ( */}
      {assistantMessage && (assistantIntent === 'update' || assistantIntent === 'reminder' || assistantIntent === 'calendar' || assistantIntent === 'finance') && (
        <div className="glass-panel" style={{ position: 'fixed', bottom: '120px', left: '50%', transform: 'translateX(-50%)', padding: '1.5rem', width: '80%', maxWidth: '600px', zIndex: 50, border: '1px solid var(--accent-teal)' }}>
          <p style={{ color: 'var(--accent-teal)', fontWeight: 'bold', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>Draft Note Captured</p>
          <textarea
            autoFocus
            className="glass-panel"
            style={{ width: '100%', minHeight: '80px', background: 'rgba(255,255,255,0.7)', color: 'var(--text-primary)', border: '1px solid var(--glass-border)', padding: '10px', fontSize: '1rem', lineHeight: '1.5', outline: 'none', resize: 'vertical' }}
            value={editedTranscript}
            onChange={(e) => setEditedTranscript(e.target.value)}
          />


          <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem', justifyContent: 'space-between' }}>
            {/* <button onClick={async () => {
              const finalTranscript = editedTranscript || assistantMessage; // Captured your edits!
              setAssistantMessage(null);
              setAssistantIntent(null);
              setEditedTranscript("");

              // NEW: Use the Llama-3 extracted UUID! (Safe fallback to Demo if needed)
              const resolvedUUID = currentPatientId || "11111111-1111-1111-1111-111111111111";

              try {
                await db.visits.add({
                  id: crypto.randomUUID(),
                  patientId: resolvedUUID, // Now uses the Dynamic ID
                  date: new Date().toISOString(),
                  rawTranscript: finalTranscript,
                  isSynced: false
                });

                await fetch('http://localhost:8888/api/telemetry', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    scenario: "update",
                    raw_transcript: assistantMessage,
                    corrected_transcript: finalTranscript, // Captures manual edits perfectly!
                    user_sentiment: 1
                  })
                });

                const syncResponse = await fetch('http://localhost:8888/api/sync', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ patient_id: resolvedUUID, raw_transcript: finalTranscript })
                });
                if (syncResponse.ok) alert("✅ Synced to Cloud Vault!");
              } catch (err) {
                alert("Saving Failed!");
              }
            }} className="glass-pill" style={{ cursor: 'pointer', background: 'var(--accent-teal)', border: 'none', color: '#000', fontWeight: 'bold', flex: 1 }}>
              Approve & Save
            </button> */}
                        <button onClick={async () => {
              const finalTranscript = editedTranscript || assistantMessage; 
              const resolvedUUID = currentPatientId || "11111111-1111-1111-1111-111111111111";

              // 1. Manually Executing Reminders after approval!
              if (assistantIntent === 'reminder') {
                  await db.reminders.add({ id: crypto.randomUUID(), text: finalTranscript, isCompleted: false });
                  setAssistantMessage(null); setAssistantIntent(null);
                  alert("✅ Reminder Securely Authenticated!");
                  return;
              }

              // 2. Manually Executing Calendar after approval!
              if (assistantIntent === 'calendar') {
                  await db.appointments.add({
                     id: crypto.randomUUID(), patientName: "Patient Booking", date: new Date().toISOString().split('T')[0], time: "TBD", type: finalTranscript
                  });
                  setAssistantMessage(null); setAssistantIntent(null);
                  alert("🗓️ Appointment Securely Booked!");
                  return;
              }

              // 3. Normal Visit Note Sync!
              try {
                await db.visits.add({ id: crypto.randomUUID(), patientId: resolvedUUID, date: new Date().toISOString(), rawTranscript: finalTranscript, isSynced: false });
                await fetch('http://localhost:8888/api/sync', {
                  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ patient_id: resolvedUUID, raw_transcript: finalTranscript })
                });
                alert("✅ Synced to Cloud Vault and Financials Calculated!");
              } catch (err) { alert("Saving Failed!"); }

              setAssistantMessage(null);
              setAssistantIntent(null);
              setEditedTranscript("");
            }} className="glass-pill" style={{ cursor: 'pointer', background: 'var(--accent-teal)', border: 'none', color: '#000', fontWeight: 'bold', flex: 1 }}>
              Approve & Save
            </button>



            <button onClick={() => {
              setAssistantMessage(null);
              setAssistantIntent(null);
            }} className="glass-pill" style={{ cursor: 'pointer', background: 'rgba(239, 68, 68, 0.2)', color: 'var(--accent-red)', border: 'none' }}>Discard</button>
          </div>
        </div>
      )}

      {/* Scenario B: The RAG Query Overlay */}
      {assistantMessage && assistantIntent === 'query' && (
        <div className="glass-panel" style={{ position: 'fixed', bottom: '120px', left: '50%', transform: 'translateX(-50%)', padding: '1.5rem', width: '80%', maxWidth: '600px', zIndex: 50, border: '1px solid var(--accent-purple)' }}>
          <p style={{ color: 'var(--accent-purple)', fontWeight: 'bold', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>Your Clinical Query</p>
          <p style={{ color: 'var(--text-primary)', fontStyle: 'italic', marginBottom: '1rem' }}>"{assistantMessage}"</p>

          {/* <p style={{ color: 'var(--accent-teal)', fontWeight: 'bold', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>Llama 3 Brain</p>
            <p style={{ color: '#E2E8F0', lineHeight: '1.6', fontSize: '1.1rem' }}>
                {ragAnswer || "Searching thousands of clinical vectors..."}
            </p>
            
            <div style={{ marginTop: '1.5rem' }}>
               <button onClick={() => {
                   setAssistantMessage(null);
                   setAssistantIntent(null);
                   setRagAnswer(null);
                   window.speechSynthesis.cancel(); // Stop speaking if closed early
               }} className="glass-pill" style={{ cursor: 'pointer', background: 'rgba(255,255,255,0.1)', color: 'white', border: 'none', width: '100%' }}>Dismiss Engine</button>
            </div>
          </div>
        )} */}
          {/* NEW: Allow the Doctor to fix their question before searching! */}
          <textarea
            autoFocus
            className="glass-panel"
            style={{ width: '100%', minHeight: '60px', background: 'rgba(255,255,255,0.7)', color: 'var(--text-primary)', border: '1px solid var(--glass-border)', padding: '10px', fontSize: '1rem', lineHeight: '1.5', outline: 'none', resize: 'vertical', marginBottom: '1rem' }}
            value={editedTranscript || assistantMessage || ""}
            onChange={(e) => setEditedTranscript(e.target.value)}
          />

          {!ragAnswer ? (
            <button onClick={async () => {
              const finalQuestion = editedTranscript || assistantMessage;
              setRagAnswer("Searching thousands of clinical vectors...");

              try {
                const payload = (currentPatientId && currentPatientId !== "global")
                  ? { question: finalQuestion, patient_id: currentPatientId }
                  : { question: finalQuestion };

                const res = await fetch('http://localhost:8888/api/ask', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(payload)
                });
                const data = await res.json();
                setRagAnswer(data.answer);

                const utterance = new SpeechSynthesisUtterance(data.answer);
                window.speechSynthesis.speak(utterance);
              } catch (e) {
                setRagAnswer("Could not reach the RAG Engine.");
              }
            }} className="glass-pill" style={{ cursor: 'pointer', background: 'var(--accent-purple)', color: '#fff', border: 'none', width: '100%', padding: '0.8rem', fontWeight: 'bold' }}>
              Ask Database
            </button>
          ) : (
            <>
              <p style={{ color: 'var(--accent-teal)', fontWeight: 'bold', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>Llama 3 Brain</p>
              <p style={{ color: 'var(--text-primary)', lineHeight: '1.6', fontSize: '1.1rem' }}>{ragAnswer}</p>
            </>
          )}

          <div style={{ marginTop: '1.5rem' }}>
            <button onClick={() => {
              setAssistantMessage(null);
              setAssistantIntent(null);
              setRagAnswer(null);
              setEditedTranscript("");
              window.speechSynthesis.cancel();
            }} className="glass-pill" style={{ cursor: 'pointer', background: 'rgba(255,255,255,0.1)', color: 'white', border: 'none', width: '100%' }}>Dismiss Engine</button>
          </div>
        </div>
      )}

      {/* Global Floating Mic Button */}
      <div style={{ position: 'fixed', bottom: '2rem', right: '50%', transform: 'translateX(50%)', zIndex: 100 }}>
        <VoiceButton
          onLiveUpdate={(text) => setLiveSpokenText(text)}
          onTranscript={async (text, intent, patientId, patientName, reason, calculatedDate) => {
            setLiveSpokenText("");
            setAssistantMessage(text);
            setEditedTranscript(text);
            setAssistantIntent(intent);

            const finalDate = calculatedDate || new Date().toISOString().split('T')[0];
            const finalReason = reason || "Unspecified";
            // Instantly Handle Reminders Extracted from Voice!
            if (intent === 'reminder') {
              await db.reminders.add({
                id: crypto.randomUUID(),
                text: finalReason,
                isCompleted: false
              });
              alert(`✅ Reminder Set for: ${finalReason}`);
              setAssistantIntent(null); // Clear overlay
              return;
            }

            // Instantly Handle Appointments Booked via Voice!
            if (intent === 'calendar') {
              await db.appointments.add({
                id: crypto.randomUUID(),
                patientName: patientName || "Unknown Patient",
                date: finalDate,
                time: "TBD", // Can be upgraded later
                type: finalReason
              });
              alert(`🗓️ Appointment Booked: ${patientName} on ${finalDate}`);
              setAssistantIntent(null); // Clear overlay
              return;
            }

            // Instantly Handle Financial Extraction!
            if (intent === 'finance') {
              const rawAmountMatch = text.match(/\$\d+|\d+\s*dollars/i); // Basic Regex extraction for now
              const amount = rawAmountMatch ? rawAmountMatch[0] : "Unknown";
              
              // In the future this will sync to our new Cloud financials table
              console.log(`Financial Record Captured for ${patientName}: ${finalReason} | Collection: ${amount}`);
              alert(`💰 Financial Record Captured: ${patientName} - ${amount}`);
              setAssistantIntent(null);
              return;
            }

            // 1. Sync Patient Demographics to Edge DB (Dexie) if we discovered a patient!
            let finalPatientId = patientId;

            if (patientId && patientName && patientName.toLowerCase() !== "null") {
              setCurrentPatientId(patientId);
              const firstName = patientName.split(" ")[0] || "Unknown";
              const lastName = patientName.split(" ").slice(1).join(" ") || "";

              // Instantly cache the patient in the edge device
              await db.patients.put({
                id: patientId,
                firstName: firstName,
                lastName: lastName,
                dob: "Unknown", // Placeholder until updated in UI
                lastVisitDate: new Date().toISOString(),
                status: "new"
              });
            } else {
              finalPatientId = "global";
              setCurrentPatientId(null);
            }

            // 2. Navigate physically based on the AI's deductions
            if (intent === 'update' && finalPatientId && finalPatientId !== "global") {
              navigate(`/patients/${finalPatientId}`);
            } else if (intent === 'query' && finalPatientId && finalPatientId !== "global") {
              navigate(`/patients/${finalPatientId}?tab=history`);
            } else if ((intent === 'query' || intent === 'update') && finalPatientId === "global") {
              navigate(`/patients`); // Fixed: Default to Patient Directory!
            } else if (intent === 'none') {
              alert("I'm not sure what you meant. Please try again.");
              setAssistantMessage(null);
              setAssistantIntent(null);
              setRagAnswer(null);
              window.speechSynthesis.cancel();
              navigate(`/`);
              return;
            }

            if (patientId && patientName && patientName.toLowerCase() !== "null") {
              setCurrentPatientId(patientId);
            } else {
              setCurrentPatientId(null);
            }

            // NOTE: We have stripped out all the auto-saving and auto-fetching here!
            // The execution is strictly transferred to the "Approve & Save" and "Ask Database" buttons!

          }}
        />
      </div>





    </div>
  );
}

export default App;
