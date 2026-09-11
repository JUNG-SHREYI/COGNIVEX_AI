import React from 'react';
import { X, Activity, CheckCircle2 } from 'lucide-react';

export default function ActionAuditModal({ isOpen, onClose, auditLogs }) {
  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(3, 7, 18, 0.82)',
      backdropFilter: 'blur(12px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px'
    }}>
      <div className="glass-panel-elevated" style={{
        width: '100%',
        maxWidth: '720px',
        maxHeight: '80vh',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Activity size={18} color="#06b6d4" />
            <h3 style={{ fontSize: '1.05rem', fontWeight: '700', color: '#ffffff' }}>
              Cognivex Action Layer: Audit Trail
            </h3>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
          >
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: '20px', overflowY: 'auto' }}>
          {auditLogs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '36px', color: '#64748b', fontSize: '0.86rem' }}>
              No automated actions dispatched yet in this session.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {auditLogs.map((log, idx) => (
                <div 
                  key={idx} 
                  style={{ 
                    background: 'rgba(255,255,255,0.03)', 
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '8px',
                    padding: '12px 16px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <CheckCircle2 size={15} color="#10b981" />
                      <span style={{ fontSize: '0.92rem', fontWeight: '700', color: '#ffffff' }}>
                        {log.action_name}
                      </span>
                    </div>
                    <span className="badge-neon badge-nominal" style={{ fontSize: '0.68rem' }}>
                      {log.status}
                    </span>
                  </div>

                  <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '4px' }}>
                    Entity: <strong style={{ color: '#e2e8f0' }}>{log.entity}</strong> • Domain: <span style={{ textTransform: 'capitalize' }}>{log.domain}</span>
                  </div>
                  <div style={{ fontSize: '0.82rem', color: '#cbd5e1', background: 'rgba(0,0,0,0.2)', padding: '6px 8px', borderRadius: '4px' }}>
                    {log.output}
                  </div>
                  <div style={{ textAlign: 'right', fontSize: '0.7rem', color: '#64748b', marginTop: '6px' }} className="font-mono">
                    ID: {log.action_id} • {log.timestamp}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
