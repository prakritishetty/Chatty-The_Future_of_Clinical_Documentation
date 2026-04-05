import { useState, useEffect } from 'react';
import { Activity, MousePointer2 } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function TrendsView() {
  const [trends, setTrends] = useState({ total_patients: 0, revenue: 0 });
  const [customQuery, setCustomQuery] = useState("");
  const [customData, setCustomData] = useState<any[] | null>(null);
  const [chartMode, setChartMode] = useState<"week" | "month">("week");
  
  // NOTE: This will be dynamic based on PostgreSQL dates!
  const mockChartData = [
      { name: 'Mon', revenue: 12000 },
      { name: 'Tue', revenue: 19000 },
      { name: 'Wed', revenue: 15500 },
      { name: 'Thu', revenue: 24000 },
      { name: 'Fri', revenue: 29000 },
  ];

  useEffect(() => {
     fetch('http://localhost:8888/api/trends')
       .then(res => res.json())
       .then(data => setTrends(data))
       .catch(e => console.error(e));
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        <h2 style={{ color: 'var(--accent-purple)', display: 'flex', alignItems: 'center', gap: '10px', margin: 0 }}>
            <Activity size={28}/> Clinical Analytics & Revenue
        </h2>

        {/* Top Metric Cards (INR) */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem' }}>
             <div className="glass-panel" style={{ padding: '1.5rem', borderLeft: '4px solid var(--accent-blue)' }}>
                 <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', textTransform: 'uppercase', marginBottom: '8px' }}>Global Pipeline</p>
                 <h1 style={{ margin: 0, fontSize: '2.5rem', color: 'var(--text-primary)' }}>{trends.total_patients}</h1>
             </div>
             <div className="glass-panel" style={{ padding: '1.5rem', borderLeft: '4px solid var(--accent-teal)' }}>
                 <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', textTransform: 'uppercase', marginBottom: '8px' }}>Total Collections</p>
                 <h1 style={{ margin: 0, fontSize: '2.5rem', color: 'var(--accent-teal)' }}>₹{trends.revenue.toLocaleString()}</h1>
             </div>
             <div className="glass-panel" style={{ padding: '1.5rem', borderLeft: '4px solid var(--accent-red)' }}>
                 <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', textTransform: 'uppercase', marginBottom: '8px' }}>Market Outstanding</p>
                 <h1 style={{ margin: 0, fontSize: '2.5rem', color: 'var(--accent-red)' }}>₹0</h1>
             </div>
        </div>

        {/* The Recharts Dynamic Grid */}
        <div className="glass-panel" style={{ padding: '2rem', height: '400px', display: 'flex', flexDirection: 'column' }}>
            <div className="flex-between" style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>Revenue Trajectory (INR)</h3>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button className="glass-pill" style={{ background: 'var(--accent-blue)', color: 'white', border: 'none', cursor: 'pointer' }}>Week</button>
                    <button className="glass-pill" style={{ background: 'rgba(0,0,0,0.05)', color: 'var(--text-primary)', border: '1px solid var(--glass-border)', cursor: 'pointer' }}>Month</button>
                </div>
            </div>

            <div style={{ flex: 1, width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={mockChartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
                        <XAxis dataKey="name" stroke="var(--text-secondary)" fontSize={12} />
                        <YAxis stroke="var(--text-secondary)" fontSize={12} tickFormatter={(val) => `₹${val/1000}k`}/>
                        <Tooltip contentStyle={{ background: 'rgba(255,255,255,0.9)', borderRadius: '8px', border: '1px solid var(--accent-blue)', fontWeight: 'bold' }} />
                        <Line type="monotone" dataKey="revenue" stroke="var(--accent-blue)" strokeWidth={4} dot={{ r: 6, fill: 'var(--accent-blue)' }} activeDot={{ r: 8 }} />
                    </LineChart>
                </ResponsiveContainer>
            </div>

            <div className="glass-panel" style={{ padding: '2rem', marginTop: '1rem', borderLeft: '4px solid var(--accent-purple)' }}>
            <h3 style={{ margin: 0, color: 'var(--text-primary)', marginBottom: '1rem' }}>Ask your AI for a Custom SQL Trend</h3>
            <div style={{ display: 'flex', gap: '1rem' }}>
                <input 
                    type="text" 
                    value={customQuery}
                    onChange={(e) => setCustomQuery(e.target.value)}
                    placeholder="e.g., 'Show me revenue grouped by treatment type'" 
                    style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid var(--glass-border)', background: 'rgba(255,255,255,0.7)', color: 'var(--text-primary)', outline: 'none' }}
                />
                <button onClick={async () => {
                    setCustomData(null);
                    const res = await fetch('http://localhost:8888/api/custom-trends', {
                        method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ query: customQuery })
                    });
                    const d = await res.json();
                    if (d.data) setCustomData(d.data);
                    else alert(d.error || "Failed finding trend.");
                }} className="glass-pill" style={{ background: 'var(--accent-purple)', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>
                    Generate Trend
                </button>
            </div>
            {customData && (
                <div style={{ marginTop: '2rem', background: 'rgba(0,0,0,0.03)', padding: '1.5rem', borderRadius: '8px' }}>
                    <p style={{ fontWeight: 'bold', color: 'var(--text-secondary)', marginBottom: '1rem' }}>Live SQL Output:</p>
                    <pre style={{ color: 'var(--accent-blue)', overflowX: 'auto' }}>{JSON.stringify(customData, null, 2)}</pre>
                </div>
            )}
        </div>
        </div>
    </div>
  );
}
