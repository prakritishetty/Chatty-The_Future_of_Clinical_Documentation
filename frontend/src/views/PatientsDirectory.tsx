import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { Users, Search, Filter, Clock, ArrowDownAZ } from 'lucide-react';

export default function PatientsDirectory() {
  const patients = useLiveQuery(() => db.patients.toArray()) || [];
  
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'recent' | 'alphabetical'>('recent');
  const [timeFilter, setTimeFilter] = useState<'all' | 'week' | 'month'>('all');

  // Advanced Filtering Engine
  const filteredPatients = patients
    .filter(p => {
       const fullName = `${p.firstName} ${p.lastName}`.toLowerCase();
       return fullName.includes(searchTerm.toLowerCase());
    })
    .filter(p => {
       if (timeFilter === 'all') return true;
       // Mock logic for time filtering since timestamps vary in cache
       const lastVisitDate = new Date(p.lastVisitDate || new Date());
       const now = new Date();
       const diffTime = Math.abs(now.getTime() - lastVisitDate.getTime());
       const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
       if (timeFilter === 'week') return diffDays <= 7;
       if (timeFilter === 'month') return diffDays <= 30;
       return true;
    })
    .sort((a, b) => {
       if (sortBy === 'alphabetical') {
           return a.firstName.localeCompare(b.firstName);
       }
       // Fallback sort logic
       return b.lastVisitDate ? 1 : -1; 
    });

  return (
    <div style={{ display: 'flex', gap: '2rem' }}>
        
      {/* LEFT SIDEBAR: Deep Filters */}
      <div className="glass-panel" style={{ width: '250px', height: 'fit-content', padding: '1.5rem', position: 'sticky', top: '2rem' }}>
          <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}><Filter size={18}/> Filters</h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                 <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase' }}>Time Range</p>
                 <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <button onClick={() => setTimeFilter('all')} className="glass-pill" style={{ border: timeFilter === 'all' ? '1px solid var(--accent-blue)' : 'none', background: timeFilter === 'all' ? 'rgba(56, 189, 248, 0.1)' : 'rgba(255,255,255,0.05)', textAlign: 'left', cursor: 'pointer' }}>All Time</button>
                    <button onClick={() => setTimeFilter('month')} className="glass-pill" style={{ border: timeFilter === 'month' ? '1px solid var(--accent-blue)' : 'none', background: timeFilter === 'month' ? 'rgba(56, 189, 248, 0.1)' : 'rgba(255,255,255,0.05)', textAlign: 'left', cursor: 'pointer' }}>Last 30 Days</button>
                    <button onClick={() => setTimeFilter('week')} className="glass-pill" style={{ border: timeFilter === 'week' ? '1px solid var(--accent-blue)' : 'none', background: timeFilter === 'week' ? 'rgba(56, 189, 248, 0.1)' : 'rgba(255,255,255,0.05)', textAlign: 'left', cursor: 'pointer' }}>Past Week</button>
                 </div>
              </div>
              
              <div style={{ marginTop: '1rem' }}>
                 <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase' }}>Sort Logic</p>
                 <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <button onClick={() => setSortBy('recent')} className="glass-pill" style={{ border: sortBy === 'recent' ? '1px solid var(--accent-teal)' : 'none', background: sortBy === 'recent' ? 'rgba(45, 212, 191, 0.1)' : 'rgba(255,255,255,0.05)', textAlign: 'left', display: 'flex', gap: '8px', cursor: 'pointer' }}><Clock size={16}/> Most Recent</button>
                    <button onClick={() => setSortBy('alphabetical')} className="glass-pill" style={{ border: sortBy === 'alphabetical' ? '1px solid var(--accent-teal)' : 'none', background: sortBy === 'alphabetical' ? 'rgba(45, 212, 191, 0.1)' : 'rgba(255,255,255,0.05)', textAlign: 'left', display: 'flex', gap: '8px', cursor: 'pointer' }}><ArrowDownAZ size={16}/> Alphabetical</button>
                 </div>
              </div>
          </div>
      </div>

      {/* MAIN DIRECTORY VIEW */}
      <div className="glass-panel" style={{ flex: 1, padding: '2rem' }}>
        <div className="flex-between" style={{ marginBottom: '2rem' }}>
            <h2 style={{ color: 'var(--accent-blue)', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                <Users size={28}/> Patient Directory
            </h2>
            
            {/* The Search Bar */}
            <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.8)', borderRadius: '25px', padding: '5px 15px', border: '1px solid var(--glass-border)' }}>
                <Search size={18} color="var(--text-secondary)" />
                <input 
                    type="text" 
                    placeholder="Search by name..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', padding: '10px', outline: 'none', width: '250px' }}
                />
            </div>
        </div>
        
        {filteredPatients.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                <p>No patients found matching your filters.</p>
            </div>
        ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
                {filteredPatients.map(p => (
                <Link to={`/patients/${p.id}`} key={p.id} style={{ textDecoration: 'none' }}>
                    <div className="glass-pill" style={{ padding: '1.5rem', borderRadius: '12px', cursor: 'pointer', transition: 'all 0.2s ease', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <h3 style={{ margin: 0, color: 'var(--text-primary)', marginBottom: '4px' }}>{p.firstName} {p.lastName}</h3>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px' }}>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{p.id.substring(0,8)}</span>
                        {p.status === 'new' && <span style={{ background: 'rgba(45, 212, 191, 0.2)', color: 'var(--accent-teal)', padding: '2px 8px', borderRadius: '10px', fontSize: '0.75rem', fontWeight: 'bold' }}>New Patient</span>}
                    </div>
                    </div>
                </Link>
                ))}
            </div>
        )}
      </div>
    </div>
  );
}
