import React, { useState } from 'react';
import { X, Copy, Download, Check, FileText } from 'lucide-react';

export default function ExecutiveBriefModal({ isOpen, onClose, briefContent }) {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !briefContent) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(briefContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const element = document.createElement("a");
    const file = new Blob([briefContent], { type: 'text/markdown' });
    element.href = URL.createObjectURL(file);
    element.download = `Cognivex_Intelligence_Brief_${Date.now()}.md`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

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
        maxWidth: '820px',
        maxHeight: '85vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 24px 48px -12px rgba(0,0,0,0.8)'
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 22px',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <FileText size={18} color="#06b6d4" />
            <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#ffffff' }}>
              Cognivex Executive Intelligence Brief
            </h3>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              id="btn-copy-brief"
              onClick={handleCopy}
              className="btn-cyber-secondary"
              style={{ padding: '6px 12px', fontSize: '0.76rem' }}
            >
              {copied ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
              {copied ? 'Copied' : 'Copy'}
            </button>
            <button
              id="btn-download-brief"
              onClick={handleDownload}
              className="btn-cyber-primary"
              style={{ padding: '6px 12px', fontSize: '0.76rem' }}
            >
              <Download size={14} />
              Export .MD
            </button>
            <button
              onClick={onClose}
              style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div style={{
          padding: '24px',
          overflowY: 'auto',
          color: '#e2e8f0',
          fontSize: '0.88rem',
          lineHeight: '1.6',
          whiteSpace: 'pre-wrap',
          fontFamily: 'JetBrains Mono, monospace',
          background: 'rgba(7, 10, 19, 0.6)'
        }}>
          {briefContent}
        </div>
      </div>
    </div>
  );
}
