import React from 'react';
import { Cpu } from 'lucide-react';

export default function Navbar() {
  return (
    <header className="glass-panel" style={{ margin: '14px 24px', padding: '12px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ 
            width: '40px', 
            height: '40px', 
            borderRadius: '10px', 
            background: 'linear-gradient(135deg, #06b6d4, #6366f1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 16px rgba(6, 182, 212, 0.5)'
          }}>
            <Cpu size={22} color="#030712" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1 style={{ fontSize: '1.25rem', fontWeight: '800', letterSpacing: '-0.02em', background: 'linear-gradient(to right, #ffffff, #94a3b8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                COGNIVEX AI
              </h1>
              <span className="badge-neon badge-cyan">Causal Engine</span>
            </div>
            <p style={{ fontSize: '0.74rem', color: '#94a3b8', letterSpacing: '0.02em' }}>
              Unified Multi-Domain Intelligence Platform
            </p>
          </div>
        </div>

      </div>
    </header>
  );
}
