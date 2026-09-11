import React, { useState, useEffect } from 'react';
import { Activity, AlertCircle, TrendingDown, TrendingUp, Radio } from 'lucide-react';

export default function TelemetryMonitor({ sensors, domainName, onSimulateSpike }) {
  const [liveSensors, setLiveSensors] = useState(sensors || []);

  // Subtle real-time oscillation to show live system heartbeat
  useEffect(() => {
    setLiveSensors(sensors || []);
    const interval = setInterval(() => {
      setLiveSensors(prev => prev.map(s => {
        const jitter = (Math.random() - 0.5) * (s.baseline * 0.02);
        const nextVal = Math.max(0, s.current + jitter);
        return {
          ...s,
          current: parseFloat(nextVal.toFixed(2))
        };
      }));
    }, 2400);
    return () => clearInterval(interval);
  }, [sensors]);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'CRITICAL':
        return <span className="badge-neon badge-critical">CRITICAL BREACH</span>;
      case 'WARNING':
        return <span className="badge-neon badge-warning">THRESHOLD ELEVATED</span>;
      default:
        return <span className="badge-neon badge-nominal">NOMINAL</span>;
    }
  };

  // Generate SVG sparkline waveform
  const renderSparkline = (sensor, isBreached) => {
    const points = [];
    const width = 180;
    const height = 40;
    const base = sensor.baseline;
    
    for (let i = 0; i <= 10; i++) {
      const x = (i / 10) * width;
      let y;
      if (isBreached && i >= 6) {
        y = height * 0.15 + (Math.sin(i) * 5);
      } else {
        y = height * 0.6 + (Math.sin(i * 1.5) * 6);
      }
      points.push(`${x},${y}`);
    }
    const pathData = `M ${points.join(' L ')}`;
    const strokeColor = isBreached ? '#f43f5e' : '#06b6d4';

    return (
      <svg width={width} height={height} style={{ overflow: 'visible' }}>
        {/* Baseline threshold dashed line */}
        <line x1="0" y1={height * 0.45} x2={width} y2={height * 0.45} stroke="rgba(255,255,255,0.15)" strokeDasharray="3,3" />
        {/* Waveform line */}
        <path d={pathData} fill="none" stroke={strokeColor} strokeWidth="2" strokeLinecap="round" />
        {/* Current pulse dot */}
        <circle cx={width} cy={points[points.length - 1].split(',')[1]} r="3.5" fill={strokeColor} />
      </svg>
    );
  };

  return (
    <div className="glass-panel" style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Radio size={18} color="#06b6d4" />
          <h3 style={{ fontSize: '1rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.02em', color: '#f8fafc' }}>
            Multimodal Perception: Live Sensor Telemetry
          </h3>
        </div>
        <span style={{ fontSize: '0.75rem', color: '#94a3b8' }} className="font-mono">
          Domain: {domainName} • 10Hz Polling
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px' }}>
        {liveSensors.map((s) => {
          const isBreached = s.status === 'CRITICAL' || s.status === 'WARNING';
          return (
            <div 
              key={s.id}
              className="glass-panel"
              style={{ 
                padding: '14px', 
                background: isBreached ? 'rgba(244, 63, 94, 0.04)' : 'rgba(255, 255, 255, 0.02)',
                borderColor: isBreached ? 'rgba(244, 63, 94, 0.3)' : 'rgba(255, 255, 255, 0.08)',
                position: 'relative'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                <div>
                  <div style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase' }} className="font-mono">
                    {s.id}
                  </div>
                  <div style={{ fontSize: '0.92rem', fontWeight: '700', color: '#ffffff' }}>
                    {s.name}
                  </div>
                </div>
                {getStatusBadge(s.status)}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', margin: '10px 0' }}>
                <div>
                  <div style={{ fontSize: '1.45rem', fontWeight: '800', color: isBreached ? '#f43f5e' : '#38bdf8' }} className="font-mono">
                    {s.current} <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>{s.unit}</span>
                  </div>
                  <div style={{ fontSize: '0.74rem', color: '#64748b' }}>
                    Baseline: {s.baseline} {s.unit}
                  </div>
                </div>
                <div>
                  {renderSparkline(s, isBreached)}
                </div>
              </div>

              {/* Action trigger button */}
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '8px', display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  id={`btn-spike-${s.id}`}
                  onClick={() => onSimulateSpike(s)}
                  className="btn-cyber-secondary"
                  style={{ padding: '4px 10px', fontSize: '0.7rem' }}
                  title="Inject simulated anomaly into Cognivex Perception pipeline"
                >
                  <Activity size={11} color="#f43f5e" />
                  Simulate Spike
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
