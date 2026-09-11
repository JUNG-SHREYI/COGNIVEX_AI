import React, { useState, useEffect } from 'react';
import { 
  Cpu, Layers, Sparkles, Sliders, Play, CheckCircle, 
  Terminal, BarChart2, BookOpen, Flame
} from 'lucide-react';
import { getModelInfo, promptCognivex, trainCognivex } from '../api';

export default function CognivexStudio() {
  const [modelInfo, setModelInfo] = useState(null);
  const [testPrompt, setTestPrompt] = useState("spindle bearing harmonic vibration critical cnc hydraulic temperature exceeded");
  const [promptResult, setPromptResult] = useState(null);
  const [isPrompting, setIsPrompting] = useState(false);

  // Fine-tuning state
  const [trainDomain, setTrainDomain] = useState("Aerospace Defense");
  const [trainSamples, setTrainSamples] = useState(
    "jet engine turbine blade creep thermal barrier coating degradation urgent ultrasound overhaul\navionics flight control bus packet jitter exceeded safe latency threshold switch reboot"
  );
  const [epochs, setEpochs] = useState(5);
  const [isTraining, setIsTraining] = useState(false);
  const [trainResult, setTrainResult] = useState(null);

  useEffect(() => {
    fetchModelData();
  }, []);

  const fetchModelData = async () => {
    try {
      const data = await getModelInfo();
      setModelInfo(data);
    } catch (err) {
      console.error("Failed to load model info:", err);
    }
  };

  const handleTestPrompt = async () => {
    if (!testPrompt.trim()) return;
    setIsPrompting(true);
    try {
      const res = await promptCognivex(testPrompt, 35);
      setPromptResult(res);
    } catch (err) {
      console.error("Prompt test failed:", err);
    } finally {
      setIsPrompting(false);
    }
  };

  const handleTrain = async () => {
    const samples = trainSamples.split('\n').map(s => s.trim()).filter(Boolean);
    if (samples.length === 0) return;
    setIsTraining(true);
    try {
      const res = await trainCognivex(trainDomain, samples, epochs);
      setTrainResult(res.training_result);
      fetchModelData();
    } catch (err) {
      console.error("Training failed:", err);
    } finally {
      setIsTraining(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Studio Banner */}
      <div className="glass-panel" style={{ 
        padding: '24px', 
        background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.12), rgba(99, 102, 241, 0.12))',
        borderColor: 'rgba(6, 182, 212, 0.3)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
              <div style={{ padding: '8px', borderRadius: '8px', background: '#06b6d4', color: '#030712' }}>
                <Cpu size={22} />
              </div>
              <h2 style={{ fontSize: '1.4rem', fontWeight: '800', color: '#ffffff' }}>
                Cognivex AI Model Studio
              </h2>
              <span className="badge-neon badge-cyan">Proprietary Causal Transformer</span>
            </div>
            <p style={{ fontSize: '0.86rem', color: '#cbd5e1', maxWidth: '640px' }}>
              Custom neural language and causal inference architecture designed for explainable intelligence. Features dedicated Anomaly, Attribution, Prognosis, and Action Policy multi-task heads.
            </p>
          </div>

          {modelInfo && (
            <div style={{ display: 'flex', gap: '16px', background: 'rgba(7, 10, 19, 0.6)', padding: '12px 18px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div>
                <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase' }}>Parameters</div>
                <div style={{ fontSize: '1.3rem', fontWeight: '800', color: '#38bdf8' }} className="font-mono">
                  {modelInfo.architecture.parameters.total_params.toLocaleString()}
                </div>
              </div>
              <div style={{ borderLeft: '1px solid rgba(255,255,255,0.1)', paddingLeft: '14px' }}>
                <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase' }}>Layers / Heads</div>
                <div style={{ fontSize: '1.3rem', fontWeight: '800', color: '#a5b4fc' }} className="font-mono">
                  {modelInfo.architecture.layers}L / {modelInfo.architecture.attention_heads}H
                </div>
              </div>
              <div style={{ borderLeft: '1px solid rgba(255,255,255,0.1)', paddingLeft: '14px' }}>
                <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase' }}>Vocabulary</div>
                <div style={{ fontSize: '1.3rem', fontWeight: '800', color: '#6ee7b7' }} className="font-mono">
                  {modelInfo.architecture.vocab_size} tokens
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(460px, 1fr))', gap: '20px' }}>
        
        {/* INTERACTIVE PROMPT & REASONING SANDBOX */}
        <div className="glass-panel" style={{ padding: '22px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
            <Terminal size={18} color="#06b6d4" />
            <h3 style={{ fontSize: '1.05rem', fontWeight: '700', color: '#f8fafc' }}>
              Cognivex Interactive Prompt & Causal Inference
            </h3>
          </div>

          <div style={{ marginBottom: '14px' }}>
            <label style={{ fontSize: '0.76rem', color: '#94a3b8', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
              Input Telemetry Statement or Natural Prompt
            </label>
            <textarea
              rows={3}
              value={testPrompt}
              onChange={(e) => setTestPrompt(e.target.value)}
              placeholder="e.g. sensor borewell drawdown exceeded threshold..."
              style={{
                width: '100%',
                background: 'rgba(7, 10, 19, 0.7)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: '8px',
                padding: '10px 12px',
                color: '#ffffff',
                fontSize: '0.86rem',
                outline: 'none',
                resize: 'vertical',
                fontFamily: 'JetBrains Mono, monospace'
              }}
            />
          </div>

          {/* Quick preset chips */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '14px' }}>
            {[
              "borewell drawdown aquifer depletion",
              "student calculus attendance dropout_risk",
              "spindle bearing harmonic vibration critical",
              "patient vital sepsis tachycardia hypotension",
              "substation transformer load gridlock"
            ].map((preset, idx) => (
              <button
                key={idx}
                onClick={() => setTestPrompt(preset)}
                className="btn-cyber-secondary"
                style={{ padding: '4px 8px', fontSize: '0.7rem' }}
              >
                Preset {idx + 1}
              </button>
            ))}
          </div>

          <button
            id="btn-run-prompt"
            disabled={isPrompting}
            onClick={handleTestPrompt}
            className="btn-cyber-primary"
            style={{ width: '100%', justifyContent: 'center' }}
          >
            <Play size={15} />
            {isPrompting ? "Executing Forward Pass..." : "Run Cognivex Inference"}
          </button>

          {/* Output Display */}
          {promptResult && (
            <div style={{ marginTop: '18px', background: 'rgba(7, 10, 19, 0.8)', padding: '14px', borderRadius: '8px', border: '1px solid rgba(6, 182, 212, 0.25)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '12px' }}>
                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '8px', borderRadius: '6px' }}>
                  <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>Anomaly Head</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: '800', color: promptResult.anomaly_score > 60 ? '#f43f5e' : '#38bdf8' }}>
                    {promptResult.anomaly_score}%
                  </div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '8px', borderRadius: '6px' }}>
                  <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>Causal Head</div>
                  <div style={{ fontSize: '0.82rem', fontWeight: '700', color: '#fcd34d' }}>
                    {promptResult.predicted_cause}
                  </div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '8px', borderRadius: '6px' }}>
                  <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>Policy Head</div>
                  <div style={{ fontSize: '0.82rem', fontWeight: '700', color: '#6ee7b7' }}>
                    {promptResult.predicted_action}
                  </div>
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>
                  Autoregressive Generative Continuation:
                </div>
                <div style={{ fontSize: '0.86rem', color: '#e2e8f0', background: 'rgba(0,0,0,0.3)', padding: '8px', borderRadius: '4px' }} className="font-mono">
                  {promptResult.generated_text}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* LIVE ATTENTION HEAD HEATMAP */}
        <div className="glass-panel" style={{ padding: '22px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <BarChart2 size={18} color="#a5b4fc" />
              <h3 style={{ fontSize: '1.05rem', fontWeight: '700', color: '#f8fafc' }}>
                Self-Attention Matrix Heatmap
              </h3>
            </div>
            <span style={{ fontSize: '0.72rem', color: '#94a3b8' }} className="font-mono">
              Layer 3 • 4 Heads Averaged
            </span>
          </div>

          <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '12px' }}>
            Visualizes causal attention weights between input prompt tokens. Warmer colors indicate higher semantic and causal relevance.
          </p>

          {promptResult && promptResult.attention_map && promptResult.attention_map.length > 0 ? (
            <div style={{ overflowX: 'auto', padding: '10px 0' }}>
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: `repeat(${Math.min(promptResult.tokens.length, 12)}, 28px)`,
                gap: '2px',
                justifyContent: 'center'
              }}>
                {promptResult.attention_map.slice(0, 12).map((row, rIdx) => 
                  row.slice(0, 12).map((val, cIdx) => {
                    const alpha = Math.min(1.0, Math.max(0.08, val * 3.5));
                    return (
                      <div
                        key={`${rIdx}-${cIdx}`}
                        title={`${promptResult.tokens[rIdx]} -> ${promptResult.tokens[cIdx]}: ${val.toFixed(3)}`}
                        style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '3px',
                          background: `rgba(6, 182, 212, ${alpha})`,
                          border: '1px solid rgba(255,255,255,0.05)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '8px',
                          color: alpha > 0.4 ? '#030712' : '#ffffff',
                          fontWeight: '600'
                        }}
                      >
                        {val > 0.15 ? val.toFixed(1) : ''}
                      </div>
                    );
                  })
                )}
              </div>
              <div style={{ textAlign: 'center', marginTop: '8px', fontSize: '0.74rem', color: '#64748b' }}>
                Tokens: {promptResult.tokens.slice(0, 12).join(' • ')}
              </div>
            </div>
          ) : (
            <div style={{ height: '180px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(7, 10, 19, 0.4)', borderRadius: '8px', border: '1px dashed rgba(255,255,255,0.1)' }}>
              <p style={{ fontSize: '0.8rem', color: '#64748b' }}>
                Run an inference prompt to populate the live attention matrix.
              </p>
            </div>
          )}
        </div>

      </div>

      {/* DOMAIN FINE-TUNING WORKBENCH */}
      <div className="glass-panel" style={{ padding: '22px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
          <Flame size={18} color="#f59e0b" />
          <h3 style={{ fontSize: '1.05rem', fontWeight: '700', color: '#f8fafc' }}>
            Domain Fine-Tuning Workbench (On-Device PyTorch Training)
          </h3>
        </div>

        <p style={{ fontSize: '0.82rem', color: '#cbd5e1', marginBottom: '16px' }}>
          Teach Cognivex AI proprietary terminology, failure signatures, and response protocols for new enterprise domains directly in the browser!
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
          <div>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '0.74rem', color: '#94a3b8', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
                Domain Name
              </label>
              <input 
                type="text"
                value={trainDomain}
                onChange={(e) => setTrainDomain(e.target.value)}
                style={{
                  width: '100%',
                  background: 'rgba(7, 10, 19, 0.7)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: '6px',
                  padding: '8px 12px',
                  color: '#ffffff',
                  fontSize: '0.86rem',
                  outline: 'none'
                }}
              />
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '0.74rem', color: '#94a3b8', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
                Training Sentences (One per line)
              </label>
              <textarea
                rows={4}
                value={trainSamples}
                onChange={(e) => setTrainSamples(e.target.value)}
                style={{
                  width: '100%',
                  background: 'rgba(7, 10, 19, 0.7)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: '6px',
                  padding: '8px 12px',
                  color: '#ffffff',
                  fontSize: '0.82rem',
                  outline: 'none',
                  fontFamily: 'JetBrains Mono, monospace'
                }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
              <label style={{ fontSize: '0.76rem', color: '#94a3b8' }}>Epochs:</label>
              <input 
                type="number" 
                min={1} 
                max={20} 
                value={epochs} 
                onChange={(e) => setEpochs(Number(e.target.value))}
                style={{
                  width: '70px',
                  background: 'rgba(7, 10, 19, 0.7)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: '6px',
                  padding: '4px 8px',
                  color: '#ffffff',
                  fontSize: '0.82rem'
                }}
              />
              <button
                id="btn-train-cognivex"
                disabled={isTraining}
                onClick={handleTrain}
                className="btn-cyber-primary"
                style={{ flex: 1, justifyContent: 'center' }}
              >
                <Flame size={14} />
                {isTraining ? "Backpropagating Loss..." : "Fine-Tune Cognivex AI"}
              </button>
            </div>
          </div>

          {/* Training Results & Loss Curve */}
          <div style={{ background: 'rgba(7, 10, 19, 0.7)', padding: '16px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ fontSize: '0.74rem', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '8px', fontWeight: '600' }}>
              Optimization Metrics & Step Loss
            </div>

            {trainResult ? (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <span style={{ fontSize: '0.82rem', color: '#cbd5e1' }}>Domain: <strong>{trainResult.domain}</strong></span>
                  <span style={{ fontSize: '0.82rem', color: '#6ee7b7' }}>Final Loss: <strong>{trainResult.final_loss}</strong></span>
                </div>

                <div style={{ height: '90px', display: 'flex', alignItems: 'flex-end', gap: '6px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '4px' }}>
                  {trainResult.step_losses.map((loss, idx) => {
                    const barHeight = Math.min(100, Math.max(15, (loss / 4.0) * 80));
                    return (
                      <div 
                        key={idx} 
                        style={{ 
                          flex: 1, 
                          height: `${barHeight}px`, 
                          background: 'linear-gradient(to top, #06b6d4, #6366f1)',
                          borderRadius: '2px 2px 0 0'
                        }}
                        title={`Step ${idx + 1}: ${loss}`}
                      />
                    );
                  })}
                </div>
                <div style={{ textAlign: 'center', fontSize: '0.72rem', color: '#64748b', marginTop: '6px' }}>
                  Loss convergence across steps
                </div>
              </div>
            ) : (
              <div style={{ height: '140px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontSize: '0.8rem' }}>
                Initiate a fine-tuning run to record weight updates.
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
