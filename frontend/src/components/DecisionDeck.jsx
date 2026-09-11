import React, { useState } from 'react';
import { 
  Zap, Search, TrendingUp, CheckCircle2, HelpCircle, 
  ArrowRight, ShieldCheck, Clock, AlertTriangle, Play, Sparkles
} from 'lucide-react';

export default function DecisionDeck({ 
  analysis, 
  loading, 
  onTriggerAction, 
  onGenerateBrief 
}) {
  const [activePillar, setActivePillar] = useState('all');
  const [executingAction, setExecutingAction] = useState(null);

  if (loading) {
    return (
      <div className="glass-panel" style={{ padding: '48px', textAlign: 'center' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(6, 182, 212, 0.1)', border: '1px solid #06b6d4', marginBottom: '16px' }}>
          <Zap size={28} className="radar-dot" />
        </div>
        <h3 style={{ fontSize: '1.2rem', fontWeight: '700', color: '#67e8f9', marginBottom: '8px' }}>
          Cognivex Causal Transformer Ingesting Incident Stream...
        </h3>
        <p style={{ fontSize: '0.85rem', color: '#94a3b8', maxWidth: '520px', margin: '0 auto' }}>
          Traversing topological knowledge graph, computing multi-task attention matrices, calculating degradation trajectory, and evaluating counterfactual policy paths.
        </p>
      </div>
    );
  }

  if (!analysis || !analysis.five_pillars) {
    return (
      <div className="glass-panel" style={{ padding: '36px', textAlign: 'center' }}>
        <p style={{ color: '#94a3b8' }}>Select an active incident or trigger a sensor breach to execute the 5-Pillar Decision Framework.</p>
      </div>
    );
  }

  const p = analysis.five_pillars;
  const whatHappened = p.what_happened;
  const whyHappened = p.why_happened;
  const whatNext = p.what_next;
  const whatToDo = p.what_to_do;
  const whyRecommend = p.why_recommend;

  const handleExecute = async (actionItem) => {
    setExecutingAction(actionItem.action);
    await onTriggerAction({
      action_name: actionItem.action,
      domain: analysis.domain,
      entity: whatHappened.entity,
      parameters: { priority: actionItem.priority, confidence: actionItem.confidence }
    });
    setExecutingAction(null);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
      
      {/* Incident Header & Meta Bar */}
      <div className="glass-panel" style={{ padding: '18px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <span className="badge-neon badge-critical">
              <AlertTriangle size={12} />
              {whatHappened.severity} SEVERITY
            </span>
            <span style={{ fontSize: '0.8rem', color: '#94a3b8' }} className="font-mono">
              ID: {analysis.incident_id}
            </span>
            <span style={{ fontSize: '0.8rem', color: '#64748b' }}>•</span>
            <span style={{ fontSize: '0.82rem', color: '#38bdf8' }}>
              Target: <strong>{whatHappened.entity}</strong>
            </span>
          </div>
          <h2 style={{ fontSize: '1.35rem', fontWeight: '700', color: '#f8fafc' }}>
            {whatHappened.title}
          </h2>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ textAlign: 'right', paddingRight: '12px', borderRight: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase' }}>Anomaly Score</div>
            <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#f43f5e' }}>
              {whatHappened.anomaly_score}%
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase' }}>Cognivex Confidence</div>
            <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#06b6d4' }}>
              {whyRecommend.confidence_score}%
            </div>
          </div>
        </div>
      </div>

      {/* The 5 Golden Pillars Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '18px' }}>
        
        {/* PILLAR 1: WHAT HAPPENED? */}
        <div className="glass-panel" style={{ padding: '20px', borderLeft: '4px solid #f43f5e' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ padding: '6px', borderRadius: '6px', background: 'rgba(244, 63, 94, 0.15)', color: '#fda4af' }}>
                <Zap size={18} />
              </div>
              <h3 style={{ fontSize: '0.98rem', fontWeight: '700', letterSpacing: '0.01em', textTransform: 'uppercase', color: '#fda4af' }}>
                1. What Happened?
              </h3>
            </div>
            <span style={{ fontSize: '0.74rem', color: '#94a3b8' }}>Descriptive</span>
          </div>

          <p style={{ fontSize: '0.88rem', lineHeight: '1.5', color: '#e2e8f0', marginBottom: '14px' }}>
            {whatHappened.summary}
          </p>

          <div>
            <div style={{ fontSize: '0.74rem', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '6px', fontWeight: '600' }}>
              Detected Telemetry Breaches
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {whatHappened.metrics_breached.map((metric, i) => (
                <span key={i} className="badge-neon badge-critical font-mono" style={{ fontSize: '0.72rem' }}>
                  {metric}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* PILLAR 2: WHY DID IT HAPPEN? */}
        <div className="glass-panel" style={{ padding: '20px', borderLeft: '4px solid #f59e0b' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ padding: '6px', borderRadius: '6px', background: 'rgba(245, 158, 11, 0.15)', color: '#fcd34d' }}>
                <Search size={18} />
              </div>
              <h3 style={{ fontSize: '0.98rem', fontWeight: '700', letterSpacing: '0.01em', textTransform: 'uppercase', color: '#fcd34d' }}>
                2. Why Did It Happen?
              </h3>
            </div>
            <span style={{ fontSize: '0.74rem', color: '#94a3b8' }}>Diagnostic / Causal</span>
          </div>

          <div style={{ background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.25)', borderRadius: '8px', padding: '10px 14px', marginBottom: '12px' }}>
            <div style={{ fontSize: '0.72rem', color: '#fcd34d', fontWeight: '600', textTransform: 'uppercase' }}>Primary Neural Root Cause</div>
            <div style={{ fontSize: '1rem', fontWeight: '700', color: '#ffffff' }}>
              {whyHappened.primary_root_cause}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '2px' }}>
              Attribution Probability: <strong style={{ color: '#fcd34d' }}>{whyHappened.confidence}%</strong>
            </div>
          </div>

          <p style={{ fontSize: '0.85rem', lineHeight: '1.5', color: '#cbd5e1', marginBottom: '12px' }}>
            {whyHappened.causal_mechanism}
          </p>

          {whyHappened.graph_trail && whyHappened.graph_trail.length > 0 && (
            <div>
              <div style={{ fontSize: '0.74rem', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '6px', fontWeight: '600' }}>
                Knowledge Graph Trail
              </div>
              <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
                {whyHappened.graph_trail.map((node, i) => (
                  <React.Fragment key={i}>
                    <span style={{ fontSize: '0.72rem', background: 'rgba(255,255,255,0.06)', padding: '2px 8px', borderRadius: '4px', color: '#e2e8f0' }}>
                      {node}
                    </span>
                    {i < whyHappened.graph_trail.length - 1 && (
                      <ArrowRight size={10} color="#64748b" />
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* PILLAR 3: WHAT IS LIKELY TO HAPPEN NEXT? */}
        <div className="glass-panel" style={{ padding: '20px', borderLeft: '4px solid #8b5cf6' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ padding: '6px', borderRadius: '6px', background: 'rgba(139, 92, 246, 0.15)', color: '#c4b5fd' }}>
                <TrendingUp size={18} />
              </div>
              <h3 style={{ fontSize: '0.98rem', fontWeight: '700', letterSpacing: '0.01em', textTransform: 'uppercase', color: '#c4b5fd' }}>
                3. What Will Happen Next?
              </h3>
            </div>
            <span style={{ fontSize: '0.74rem', color: '#94a3b8' }}>Predictive / Prognosis</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
            <div style={{ background: 'rgba(139, 92, 246, 0.08)', padding: '10px', borderRadius: '8px', border: '1px solid rgba(139, 92, 246, 0.2)' }}>
              <div style={{ fontSize: '0.7rem', color: '#c4b5fd', textTransform: 'uppercase' }}>Time To Critical</div>
              <div style={{ fontSize: '1.2rem', fontWeight: '700', color: '#ffffff' }}>
                {whatNext.estimated_time_to_critical}
              </div>
            </div>
            <div style={{ background: 'rgba(139, 92, 246, 0.08)', padding: '10px', borderRadius: '8px', border: '1px solid rgba(139, 92, 246, 0.2)' }}>
              <div style={{ fontSize: '0.7rem', color: '#c4b5fd', textTransform: 'uppercase' }}>Risk Trajectory</div>
              <div style={{ fontSize: '1.2rem', fontWeight: '700', color: whatNext.risk_trajectory === 'EXPONENTIAL' ? '#f43f5e' : '#fcd34d' }}>
                {whatNext.risk_trajectory}
              </div>
            </div>
          </div>

          <p style={{ fontSize: '0.85rem', lineHeight: '1.5', color: '#cbd5e1' }}>
            {whatNext.cascading_impact}
          </p>
        </div>

        {/* PILLAR 4: WHAT SHOULD WE DO? */}
        <div className="glass-panel" style={{ padding: '20px', borderLeft: '4px solid #10b981' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ padding: '6px', borderRadius: '6px', background: 'rgba(16, 185, 129, 0.15)', color: '#6ee7b7' }}>
                <CheckCircle2 size={18} />
              </div>
              <h3 style={{ fontSize: '0.98rem', fontWeight: '700', letterSpacing: '0.01em', textTransform: 'uppercase', color: '#6ee7b7' }}>
                4. What Should We Do?
              </h3>
            </div>
            <span style={{ fontSize: '0.74rem', color: '#94a3b8' }}>Prescriptive Policy</span>
          </div>

          <div style={{ marginBottom: '10px', fontSize: '0.8rem', color: '#94a3b8' }}>
            Estimated Risk Curtailment: <strong style={{ color: '#6ee7b7' }}>{whatToDo.estimated_risk_reduction}</strong>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {whatToDo.ranked_interventions.map((item, idx) => (
              <div 
                key={idx} 
                style={{ 
                  background: idx === 0 ? 'rgba(16, 185, 129, 0.12)' : 'rgba(255, 255, 255, 0.03)',
                  border: idx === 0 ? '1px solid rgba(16, 185, 129, 0.35)' : '1px solid rgba(255,255,255,0.06)',
                  borderRadius: '8px',
                  padding: '10px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '10px'
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                    <span className={idx === 0 ? "badge-neon badge-nominal" : "badge-neon badge-cyan"} style={{ fontSize: '0.65rem' }}>
                      {item.priority}
                    </span>
                    <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                      Confidence: {item.confidence}%
                    </span>
                  </div>
                  <div style={{ fontSize: '0.88rem', fontWeight: '600', color: '#ffffff' }}>
                    {item.action}
                  </div>
                </div>

                <button
                  id={`btn-execute-action-${idx}`}
                  disabled={executingAction === item.action}
                  onClick={() => handleExecute(item)}
                  className={idx === 0 ? "btn-cyber-primary" : "btn-cyber-secondary"}
                  style={{ padding: '6px 12px', fontSize: '0.74rem', whiteSpace: 'nowrap' }}
                >
                  <Play size={12} />
                  {executingAction === item.action ? 'Dispatching...' : (idx === 0 ? 'Execute Now' : 'Schedule')}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* PILLAR 5: WHY DOES COGNIVEX RECOMMEND THIS? */}
        <div className="glass-panel" style={{ padding: '20px', borderLeft: '4px solid #06b6d4', gridColumn: 'span 2' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ padding: '6px', borderRadius: '6px', background: 'rgba(6, 182, 212, 0.15)', color: '#67e8f9' }}>
                <HelpCircle size={18} />
              </div>
              <h3 style={{ fontSize: '0.98rem', fontWeight: '700', letterSpacing: '0.01em', textTransform: 'uppercase', color: '#67e8f9' }}>
                5. Why Does Cognivex AI Recommend This?
              </h3>
            </div>
            <span style={{ fontSize: '0.74rem', color: '#94a3b8' }}>Explainable AI & Evidence Trail</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px', marginBottom: '14px' }}>
            <div>
              <div style={{ fontSize: '0.74rem', color: '#06b6d4', textTransform: 'uppercase', fontWeight: '600', marginBottom: '4px' }}>
                Evidence Basis & Precedence
              </div>
              <p style={{ fontSize: '0.86rem', lineHeight: '1.5', color: '#cbd5e1' }}>
                {whyRecommend.evidence_basis}
              </p>
            </div>

            <div>
              <div style={{ fontSize: '0.74rem', color: '#fda4af', textTransform: 'uppercase', fontWeight: '600', marginBottom: '4px' }}>
                Counterfactual Analysis (Cost of Inaction)
              </div>
              <p style={{ fontSize: '0.86rem', lineHeight: '1.5', color: '#cbd5e1' }}>
                {whyRecommend.counterfactual_analysis}
              </p>
            </div>
          </div>

          {/* RAG Historical Precedents match from Vector Store */}
          {analysis.historical_precedents && analysis.historical_precedents.length > 0 && (
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '12px' }}>
              <div style={{ fontSize: '0.74rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: '600', marginBottom: '8px' }}>
                Cognivex Vector Store: Historical Precedents (RAG Retrieval)
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                {analysis.historical_precedents.map((doc, idx) => (
                  <div key={idx} style={{ background: 'rgba(255,255,255,0.03)', padding: '8px 12px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: '600', color: '#38bdf8' }}>{doc.title}</span>
                      <span className="badge-neon badge-cyan" style={{ fontSize: '0.65rem' }}>
                        Sim: {(doc.similarity * 100).toFixed(0)}%
                      </span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                      Outcome: {doc.resolution}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

      </div>

    </div>
  );
}
