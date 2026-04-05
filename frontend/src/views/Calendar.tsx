import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { CalendarDays, Plus, Clock } from 'lucide-react';

export default function CalendarView() {
  const [currentDate, setCurrentDate] = useState(new Date());
  
  // Dynamically pull all edge device appointments!
  const appointments = useLiveQuery(() => db.appointments.toArray()) || [];

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const currentMonthDays = getDaysInMonth(currentDate);
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();

  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div className="flex-between">
        <h2 style={{ color: 'var(--accent-blue)', display: 'flex', alignItems: 'center', gap: '10px', margin: 0 }}>
           <CalendarDays size={28}/> Clinic Master Schedule
        </h2>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <button onClick={prevMonth} className="glass-pill" style={{ cursor: 'pointer', border: 'none', background: 'rgba(255,255,255,0.8)', color: 'var(--text-primary)' }}>&larr; Prev</button>
            <span style={{ fontWeight: 'bold', fontSize: '1.2rem', minWidth: '150px', textAlign: 'center' }}>
                {currentDate.toLocaleDateString('default', { month: 'long', year: 'numeric' })}
            </span>
            <button onClick={nextMonth} className="glass-pill" style={{ cursor: 'pointer', border: 'none', background: 'rgba(255,255,255,0.8)', color: 'var(--text-primary)' }}>Next &rarr;</button>
        </div>
      </div>

      <div className="glass-panel" style={{ padding: '1rem' }}>
         <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '10px', textAlign: 'center', fontWeight: 'bold', marginBottom: '1rem', color: 'var(--text-secondary)' }}>
             {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => <div key={day}>{day}</div>)}
         </div>
         
         <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '10px', minHeight: '600px' }}>
            {/* Empty slots for start of month offset */}
            {Array.from({ length: firstDayOfMonth }).map((_, i) => (
                <div key={`empty-${i}`} style={{ background: 'rgba(0,0,0,0.02)', borderRadius: '12px', opacity: 0.5 }}></div>
            ))}
            
            {/* The actual days of the month */}
            {Array.from({ length: currentMonthDays }).map((_, i) => {
                const dayStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`;
                // Find appointments for this specific day
                const daysEvents = appointments.filter(app => app.date === dayStr);

                return (
                    <div key={i} style={{ background: 'rgba(255,255,255,0.5)', borderRadius: '12px', padding: '10px', border: '1px solid var(--glass-border)', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                        <span style={{ fontWeight: 'bold', color: 'var(--accent-blue)', alignSelf: 'flex-end', opacity: 0.8 }}>{i + 1}</span>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', overflowY: 'auto' }}>
                            {daysEvents.map(ev => (
                                // <div key={ev.id} style={{ background: 'var(--accent-teal)', color: 'white', padding: '4px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold' }}>
                                //     {ev.time} - {ev.patientName}
                                // </div>
                                <div 
                                  key={ev.id} 
                                  contentEditable={true}
                                  suppressContentEditableWarning={true}
                                  onBlur={async (e) => {
                                      const txt = e.currentTarget.textContent || "";
                                      const parts = txt.split(' - ');
                                      if (parts.length === 2) {
                                          await db.appointments.update(ev.id, { time: parts[0].trim(), patientName: parts[1].trim() });
                                      } else {
                                          alert("Format must be: 'Time - Name' (e.g. 09:00 AM - John)");
                                      }
                                  }}
                                  style={{ background: 'var(--accent-teal)', color: 'white', padding: '4px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold', outline: 'none', cursor: 'text' }}
                                >
                                    {ev.time} - {ev.patientName}
                                </div>

                            ))}
                        </div>
                    </div>
                )
            })}
         </div>
      </div>
    </div>
  );
}
