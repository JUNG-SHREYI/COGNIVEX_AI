import React, { useState } from 'react';
import { X, Layers, Plus } from 'lucide-react';
import { createCustomDomain } from '../api';

export default function CustomDomainModal({ isOpen, onClose, onDomainCreated }) {
  const [domainId, setDomainId] = useState('maritime');
  const [name, setName] = useState('Maritime Logistics Intelligence');
  const [tagline, setTagline] = useState('Vessel Telemetry, Port Berth Congestion & Hull Stress Analysis');
  const [themeColor, setThemeColor] = useState('#0ea5e9');
  const [sensorName, setSensorName] = useState('Hull Shear Stress Strain Gauge');
  const [sensorUnit, setSensorUnit] = useState('MPa');
  const [sensorBaseline, setSensorBaseline] = useState(140);
  const [incidentTitle, setIncidentTitle] = useState('Containership Hull Structural Fatigue Alert');
  const [incidentSummary, setIncidentSummary] = useState('Strain gauge breached 220 MPa under dynamic wave action. Fatigue crack propagation risk elevated.');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const payload = {
        domain_id: domainId.toLowerCase().replace(/\s+/g, '_'),
        name: name,
        tagline: tagline,
        theme_color: themeColor,
        sensors: [
          {
            id: `SENS_${domainId.toUpperCase().slice(0, 3)}_01`,
            name: sensorName,
            unit: sensorUnit,
            baseline: Number(sensorBaseline),
            current: Number(sensorBaseline) * 1.45,
            status: 'CRITICAL'
          }
        ],
        sample_incident: {
          id: `INC-${domainId.toUpperCase().slice(0, 3)}-001`,
          entity: `${name} Primary Asset`,
          headline: incidentTitle,
          telemetry_summary: incidentSummary,
          metrics_breached: [`${sensorName} > 2.8σ`, "Threshold Breach"],
          graph_trail: [sensorName, `${name} Primary Asset`, "Structural Fatigue", "Dynamic Throttling Policy"]
        }
      };

      const res = await createCustomDomain(payload);
      if (res.success) {
        onDomainCreated(res.domain);
        onClose();
      }
    } catch (err) {
      console.error("Failed to create domain:", err);
    } finally {
      setIsSubmitting(false);
    }
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
        maxWidth: '640px',
        maxHeight: '85vh',
        overflowY: 'auto'
      }}>
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Layers size={18} color="#06b6d4" />
            <h3 style={{ fontSize: '1.05rem', fontWeight: '700', color: '#ffffff' }}>
              Create Custom Vertical Intelligence Domain
            </h3>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ fontSize: '0.74rem', color: '#94a3b8', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
              Domain Title
            </label>
            <input 
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{
                width: '100%',
                background: 'rgba(7, 10, 19, 0.7)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: '6px',
                padding: '8px 12px',
                color: '#ffffff',
                fontSize: '0.86rem'
              }}
            />
          </div>

          <div>
            <label style={{ fontSize: '0.74rem', color: '#94a3b8', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
              Domain Tagline & Mission
            </label>
            <input 
              type="text"
              required
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              style={{
                width: '100%',
                background: 'rgba(7, 10, 19, 0.7)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: '6px',
                padding: '8px 12px',
                color: '#ffffff',
                fontSize: '0.86rem'
              }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '10px' }}>
            <div>
              <label style={{ fontSize: '0.74rem', color: '#94a3b8', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
                Primary Sensor Name
              </label>
              <input 
                type="text"
                required
                value={sensorName}
                onChange={(e) => setSensorName(e.target.value)}
                style={{
                  width: '100%',
                  background: 'rgba(7, 10, 19, 0.7)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: '6px',
                  padding: '8px 12px',
                  color: '#ffffff',
                  fontSize: '0.86rem'
                }}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.74rem', color: '#94a3b8', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
                Unit
              </label>
              <input 
                type="text"
                required
                value={sensorUnit}
                onChange={(e) => setSensorUnit(e.target.value)}
                style={{
                  width: '100%',
                  background: 'rgba(7, 10, 19, 0.7)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: '6px',
                  padding: '8px 12px',
                  color: '#ffffff',
                  fontSize: '0.86rem'
                }}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.74rem', color: '#94a3b8', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
                Baseline
              </label>
              <input 
                type="number"
                required
                value={sensorBaseline}
                onChange={(e) => setSensorBaseline(e.target.value)}
                style={{
                  width: '100%',
                  background: 'rgba(7, 10, 19, 0.7)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: '6px',
                  padding: '8px 12px',
                  color: '#ffffff',
                  fontSize: '0.86rem'
                }}
              />
            </div>
          </div>

          <div>
            <label style={{ fontSize: '0.74rem', color: '#94a3b8', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
              Sample Incident Description
            </label>
            <textarea 
              rows={2}
              value={incidentSummary}
              onChange={(e) => setIncidentSummary(e.target.value)}
              style={{
                width: '100%',
                background: 'rgba(7, 10, 19, 0.7)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: '6px',
                padding: '8px 12px',
                color: '#ffffff',
                fontSize: '0.86rem'
              }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
            <button
              type="button"
              onClick={onClose}
              className="btn-cyber-secondary"
            >
              Cancel
            </button>
            <button
              id="btn-submit-domain"
              type="submit"
              disabled={isSubmitting}
              className="btn-cyber-primary"
            >
              <Plus size={15} />
              {isSubmitting ? 'Registering...' : 'Register Domain'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
