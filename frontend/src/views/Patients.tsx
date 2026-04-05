import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { User, Phone, Mail, Clock, AlertTriangle, Edit2, Save, X } from 'lucide-react';

export default function PatientDetailView() {
  const { id } = useParams<{ id: string }>();

  // Fetch Edge Cache
  const patient = useLiveQuery(() => db.patients.get(id || ''), [id]);
  const visits = useLiveQuery(
    () => db.visits.where('patientId').equals(id || '').reverse().sortBy('date'),
    [id]
  ) || [];

  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({ email: '', phone: '', preferredHours: '', age: '' });

  useEffect(() => {
      if (patient && !isEditing) {
          setFormData({
              email: patient.email || '',
              phone: patient.phone || '',
              preferredHours: patient.preferredHours || '',
              age: patient.dob && patient.dob !== 'Unknown' ? String(patient.dob) : ''
          });
      }
  }, [patient, isEditing]);

  const handleSave = async () => {
    const payload = {
        email: formData.email || undefined,
        phone: formData.phone || undefined,
        preferred_hours: formData.preferredHours || undefined,
        age: parseInt(formData.age) || undefined
    };

    try {
        await fetch(`http://localhost:8888/api/patients/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        // Patch native Edge Store
        await db.patients.update(id!, {
            email: formData.email,
            phone: formData.phone,
            preferredHours: formData.preferredHours,
            dob: formData.age || 'Unknown'
        });
    } catch (e) {
        console.error("Patch Failed", e);
    }
    setIsEditing(false);
  };

  if (!patient) return <div className="glass-panel" style={{ padding: '2rem' }}>Loading Patient Demographics...</div>;

  const isMissingData = !patient.email || !patient.phone || !patient.dob || patient.dob === 'Unknown';

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1fr) 2fr', gap: '2rem', padding: '1rem' }}>
      
      {/* LEFT PANEL: Demographics Card */}
      <div className="glass-panel" style={{ padding: '2rem', height: 'fit-content' }}>
        
        {/* The Missing Data Hazard Ribbon */}
        {isMissingData && !isEditing && (
            <div style={{ background: 'rgba(234, 179, 8, 0.1)', border: '1px solid #EAB308', padding: '10px 15px', borderRadius: '8px', display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '1.5rem', color: '#CA8A04' }}>
               <AlertTriangle size={20}/>
               <span style={{ fontSize: '0.85rem' }}>Missing fields. Please edit to complete this profile.</span>
            </div>
        )}

        <div className="flex-between" style={{ marginBottom: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'var(--accent-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <User size={30} fill="white" color="white" />
                </div>
                <div>
                    <h2 style={{ fontSize: '1.5rem', margin: 0 }}>{patient.firstName} {patient.lastName}</h2>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>ID: {patient.id.substring(0,8)}</span>
                </div>
            </div>
            {!isEditing ? (
                <button onClick={() => setIsEditing(true)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--accent-teal)' }}><Edit2 size={18}/></button>
            ) : (
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => setIsEditing(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--accent-red)' }}><X size={20}/></button>
                    <button onClick={handleSave} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--accent-teal)' }}><Save size={20}/></button>
                </div>
            )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
           {isEditing ? (
               <>
                 <input type="text" placeholder="Age" value={formData.age} onChange={e => setFormData({...formData, age: e.target.value})} style={{ padding: '8px', borderRadius: '6px', border: '1px solid var(--glass-border)' }}/>
                 <input type="email" placeholder="Email Address" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} style={{ padding: '8px', borderRadius: '6px', border: '1px solid var(--glass-border)' }}/>
                 <input type="tel" placeholder="Phone Number" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} style={{ padding: '8px', borderRadius: '6px', border: '1px solid var(--glass-border)' }}/>
                 <input type="text" placeholder="Preferred Hours" value={formData.preferredHours} onChange={e => setFormData({...formData, preferredHours: e.target.value})} style={{ padding: '8px', borderRadius: '6px', border: '1px solid var(--glass-border)' }}/>
               </>
           ) : (
               <>
                 <p style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><User size={18} color="var(--text-secondary)" /> {patient.dob !== 'Unknown' ? `${patient.dob} Years Old` : 'Age Unknown'}</p>
                 <p style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><Phone size={18} color="var(--text-secondary)" /> {patient.phone || 'Phone Unknown'}</p>
                 <p style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><Mail size={18} color="var(--text-secondary)" /> {patient.email || 'Email Unknown'}</p>
                 <p style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><Clock size={18} color="var(--accent-purple)" /> {patient.preferredHours || 'No Time Preference'}</p>
               </>
           )}
        </div>
      </div>

      {/* RIGHT PANEL: Historical Visits Log */}
      <div className="glass-panel" style={{ padding: '2rem', height: '100%', display: 'flex', flexDirection: 'column' }}>
        <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
            Clinical History
            <span className="glass-pill" style={{ background: 'var(--accent-blue)', color: 'white', border: 'none' }}>{visits.length} Records</span>
        </h2>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', overflowY: 'auto' }}>
          {visits.length === 0 ? <p>No visit notes cached on this Edge Device.</p> : visits.map((visit, index) => (
            <div key={visit.id} className="glass-panel" style={{ 
                padding: '1.5rem', 
                borderLeft: index === 0 ? '4px solid var(--accent-teal)' : '1px solid var(--glass-border)',
                background: index === 0 ? 'rgba(13, 148, 136, 0.05)' : undefined
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                    <span style={{ fontWeight: 'bold', color: index === 0 ? 'var(--accent-teal)' : 'var(--text-primary)' }}>
                        {index === 0 ? '⭐ Latest Visit (Visit N)' : `Historical Visit (Visit N-${index})`}
                    </span>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        {new Date(visit.date).toLocaleDateString()} at {new Date(visit.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </span>
                </div>
                
                {/* <p style={{ lineHeight: '1.6', fontSize: '1.05rem', whiteSpace: 'pre-wrap', color: 'var(--text-primary)' }}>
                    {visit.rawTranscript}
                </p> */}
                <p 
                    contentEditable={true}
                    suppressContentEditableWarning={true}
                    onBlur={async (e) => {
                        const newText = e.currentTarget.textContent || "";
                        await db.visits.update(visit.id, { rawTranscript: newText });
                    }}
                    style={{ lineHeight: '1.6', fontSize: '1.05rem', whiteSpace: 'pre-wrap', color: 'var(--text-primary)', outline: 'none', borderBottom: '1px dashed transparent', transition: '0.2s' }}
                    onFocus={(e) => (e.currentTarget as HTMLElement).style.borderBottom = '1px dashed var(--accent-blue)'}
                    onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.borderBottom = '1px dashed transparent'}
                >
                    {visit.rawTranscript}
                </p>

            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
