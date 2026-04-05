import { useState, useRef, useEffect } from 'react';
import { Mic, Square } from 'lucide-react';

export default function VoiceButton({
  onTranscript,
  onLiveUpdate
}: {
  // NEW: We now accept the dynamic Patient ID and Name from the backend
  onTranscript: (text: string, intent: string, patientId: string | null, patientName: string | null, reason?: string | null, calculatedDate?: string | null) => void,
  onLiveUpdate: (text: string) => void
}) {


  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [typedCommand, setTypedCommand] = useState("");

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  //   useEffect(() => {
  //   // Enable background wake-word listening
  //   const SpeechRecognition = window.SpeechRecognition || (window as any).webkitSpeechRecognition;
  //   if (SpeechRecognition) {
  //     const recognition = new SpeechRecognition();
  //     recognition.continuous = true;
  //     recognition.interimResults = false;

  //     recognition.onresult = (event: any) => {
  //       const lastResult = event.results[event.results.length - 1][0].transcript.toLowerCase();
  //       if ((lastResult.includes("hi") || lastResult.includes("hey")) && !isRecording) {

  //           // The Bot Greets You!
  //           const utterance = new SpeechSynthesisUtterance("Hi Dr. Sandhya, I'm listening.");
  //           // Wait for it to finish speaking, then turn on the Microphone!
  //           utterance.onend = () => { startRecording(); };
  //           window.speechSynthesis.speak(utterance);
  //       }
  //     };

  //     // Keep it listening forever in the background
  //     recognition.start();
  //     recognition.onend = () => { recognition.start(); }; 
  //   }
  // }, [isRecording]);


  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        setIsProcessing(true);
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });

        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64AudioMessage = reader.result?.toString().split(',')[1];
          if (base64AudioMessage) {
            try {
              const response = await fetch('http://localhost:8888/api/stt', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ audio_base64: base64AudioMessage })
              });
              const data = await response.json();

              if (!response.ok) {
                onTranscript(`Server Error: ${data.detail || 'Failed to connect'}`, "update", null, null);
                return;
              }

              // NEW: Pass all the extracted data back to App.tsx!
              onTranscript(data.transcript, data.intent, data.patient_id, data.patient_name, data.reason, data.calculated_date);
            } catch (err) {
              onTranscript("Error", "update", null, null);
            }
          }
          setIsProcessing(false);
        };
      };

      mediaRecorder.start();
      setIsRecording(true);

    } catch (err) {
      alert("Please allow microphone access in your browser.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
  };

  // return (
  //   <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
  //     {isProcessing && <div className="glass-pill" style={{ animation: 'pulse-ring 1.5s infinite', color: 'var(--accent-teal)' }}>Analyzing Clinical Data...</div>}
  //     {isRecording && <div className="glass-pill" style={{ animation: 'pulse-ring 1.5s infinite', color: 'var(--accent-purple)', fontWeight: 'bold' }}>● Recording...</div>}

  //     <button
  //       className={`voice-button ${isRecording ? 'listening' : ''}`}
  //       onClick={isRecording ? stopRecording : startRecording}
  //       aria-label="Toggle Voice Recording"
  //       style={{ outline: 'none', background: isRecording ? 'var(--accent-red)' : undefined }}
  //     >
  //       {isRecording ? <Square size={24} fill="white" /> : <Mic size={28} />}
  //     </button>
  //   </div>
  // );
    return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', minWidth: '350px' }}>
      {isProcessing && <div className="glass-pill" style={{ animation: 'pulse-ring 1.5s infinite', color: 'var(--accent-teal)' }}>Routing Clinical Command...</div>}
      {isRecording && <div className="glass-pill" style={{ animation: 'pulse-ring 1.5s infinite', color: 'var(--accent-purple)', fontWeight: 'bold' }}>● Recording...</div>}
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', width: '100%', background: 'rgba(255,255,255,0.7)', padding: '8px', borderRadius: '50px', border: '1px solid var(--glass-border)' }}>
          {/* Visual Text Input Fallback! */}
          <input 
             type="text" 
             value={typedCommand}
             onChange={(e) => setTypedCommand(e.target.value)}
             placeholder="Type a clinical command..."
             style={{ flex: 1, background: 'transparent', border: 'none', color: 'var(--text-primary)', padding: '10px 20px', outline: 'none', minWidth: '250px' }}
             onKeyDown={async (e) => {
                 if (e.key === 'Enter' && typedCommand.trim()) {
                     setIsProcessing(true);
                     const text = typedCommand;
                     setTypedCommand(""); // Clear instantly
                     
                     try {
                         // Hits our NEW Text Fallback Payload
                         const response = await fetch('http://localhost:8888/api/stt', {
                             method: 'POST',
                             headers: { 'Content-Type': 'application/json' },
                             body: JSON.stringify({ text_fallback: text })
                         });
                         const data = await response.json();
                         onTranscript(data.transcript, data.intent, data.patient_id, data.patient_name, data.reason, data.calculated_date);
                     } catch (err) {
                         onTranscript("Network Error", "update", null, null, null, null);
                     }
                     setIsProcessing(false);
                 }
             }}
          />
          
          <button 
            className={`voice-button ${isRecording ? 'listening' : ''}`}
            onClick={isRecording ? stopRecording : startRecording}
            aria-label="Toggle Voice Recording"
            style={{ outline: 'none', background: isRecording ? 'var(--accent-red)' : undefined, width: '45px', height: '45px' }}
          >
            {isRecording ? <Square size={20} fill="white" /> : <Mic size={20} />}
          </button>
      </div>
    </div>
  );

}
