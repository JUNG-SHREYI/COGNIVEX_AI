import React from 'react';
import {
  Cpu, LogOut, PlusCircle, ShieldCheck,
  Wheat, GraduationCap, Factory, HeartPulse, Building2, Layers
} from 'lucide-react';

export default function Navbar({ 
  currentTab, 
  onSelectTab, 
  domains, 
  onOpenCustomModal,
  userEmail,
  onSignOut,
  onOpenAdmin,
  adminError
}) {
  const getDomainIcon = (iconName) => {
    switch (iconName) {
      case 'Wheat': return <Wheat size={16} />;
      case 'GraduationCap': return <GraduationCap size={16} />;
      case 'Factory': return <Factory size={16} />;
      case 'HeartPulse': return <HeartPulse size={16} />;
      case 'Building2': return <Building2 size={16} />;
      default: return <Layers size={16} />;
    }
  };

  return (
    <header className="glass-panel" style={{ margin: '14px 24px', padding: '12px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        
        {/* Brand & Model Identity */}
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

        {/* Global Domain & Module Switcher */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: '8px', overflowX: 'auto', padding: '4px 0' }}>
          {domains.map((d) => {
            const isSelected = currentTab === d.id;
            return (
              <button
                key={d.id}
                id={`tab-${d.id}`}
                onClick={() => onSelectTab(d.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '7px',
                  padding: '7px 14px',
                  borderRadius: '9999px',
                  fontSize: '0.84rem',
                  fontWeight: isSelected ? '600' : '500',
                  border: isSelected ? `1px solid ${d.theme_color || '#06b6d4'}` : '1px solid rgba(255,255,255,0.06)',
                  background: isSelected ? 'rgba(255,255,255,0.09)' : 'rgba(255,255,255,0.02)',
                  color: isSelected ? '#ffffff' : '#94a3b8',
                  cursor: 'pointer',
                  transition: 'all 0.18s ease',
                  boxShadow: isSelected ? `0 0 14px -2px ${d.theme_color || '#06b6d4'}40` : 'none'
                }}
              >
                <span style={{ color: isSelected ? (d.theme_color || '#06b6d4') : '#94a3b8' }}>
                  {getDomainIcon(d.icon)}
                </span>
                {d.name.replace(' Intelligence', '')}
              </button>
            );
          })}

          {/* New Custom Domain Button */}
          <button
            id="btn-create-domain"
            onClick={onOpenCustomModal}
            className="btn-cyber-secondary"
            style={{ padding: '6px 12px', fontSize: '0.78rem', borderRadius: '9999px' }}
            title="Create Custom Vertical Domain"
          >
            <PlusCircle size={14} color="#06b6d4" />
            + Custom Domain
          </button>

          <button className="account-button" onClick={onSignOut} title={`Sign out ${userEmail}`}>
            <span>{userEmail?.slice(0, 1).toUpperCase()}</span>
            <LogOut size={14} />
          </button>
          <button className="admin-button" onClick={onOpenAdmin} title="Open protected admin dashboard">
            <ShieldCheck size={14} /> Admin
          </button>
          {adminError && <span className="admin-error" title={adminError}>Admin unavailable</span>}
        </nav>

      </div>
    </header>
  );
}
