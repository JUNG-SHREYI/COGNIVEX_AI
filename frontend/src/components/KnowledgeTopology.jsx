import React, { useState } from 'react';
import { Share2, Info } from 'lucide-react';

export default function KnowledgeTopology({ graphData }) {
  const [hoveredNode, setHoveredNode] = useState(null);

  if (!graphData || !graphData.nodes || graphData.nodes.length === 0) {
    return null;
  }

  const nodes = graphData.nodes;
  const edges = graphData.edges;

  // Compute 2D coordinates arranged in an organic radial or tiered bipartite layout
  const width = 800;
  const height = 280;

  const nodePositions = {};
  const typeTiers = {
    'SENSOR': 0.15,
    'ASSET': 0.40,
    'ROOT_CAUSE': 0.65,
    'INTERVENTION': 0.88
  };

  const typeCounts = { 'SENSOR': 0, 'ASSET': 0, 'ROOT_CAUSE': 0, 'INTERVENTION': 0 };
  nodes.forEach(n => {
    typeCounts[n.type] = (typeCounts[n.type] || 0) + 1;
  });

  const typeIndices = { 'SENSOR': 0, 'ASSET': 0, 'ROOT_CAUSE': 0, 'INTERVENTION': 0 };
  nodes.forEach(n => {
    const t = n.type || 'ASSET';
    const count = typeCounts[t] || 1;
    const idx = typeIndices[t] || 0;
    typeIndices[t] = idx + 1;

    const x = (typeTiers[t] || 0.5) * width;
    const y = ((idx + 1) / (count + 1)) * height;
    nodePositions[n.id] = { x, y };
  });

  const getNodeColor = (type) => {
    switch (type) {
      case 'SENSOR': return '#06b6d4';     // Cyan
      case 'ASSET': return '#6366f1';      // Indigo
      case 'ROOT_CAUSE': return '#f43f5e'; // Crimson
      case 'INTERVENTION': return '#10b981'; // Emerald
      default: return '#94a3b8';
    }
  };

  return (
    <div className="glass-panel" style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Share2 size={18} color="#6366f1" />
          <h3 style={{ fontSize: '1rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.02em', color: '#f8fafc' }}>
            Knowledge Layer: Causal Topological Graph
          </h3>
        </div>
        
        {/* Graph Legend */}
        <div style={{ display: 'flex', gap: '12px', fontSize: '0.72rem' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#67e8f9' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#06b6d4' }} /> Sensor
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#a5b4fc' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#6366f1' }} /> Asset
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#fda4af' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f43f5e' }} /> Root Cause
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#6ee7b7' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }} /> Intervention
          </span>
        </div>
      </div>

      <div style={{ position: 'relative', width: '100%', overflowX: 'auto' }}>
        <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: '240px', background: 'rgba(7, 10, 19, 0.6)', borderRadius: '10px' }}>
          <defs>
            <marker id="arrow" viewBox="0 0 10 10" refX="18" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="rgba(255,255,255,0.3)" />
            </marker>
          </defs>

          {/* Render Causal Edges */}
          {edges.map((e, idx) => {
            const p1 = nodePositions[e.source];
            const p2 = nodePositions[e.target];
            if (!p1 || !p2) return null;
            return (
              <g key={idx}>
                <line 
                  x1={p1.x} y1={p1.y} 
                  x2={p2.x} y2={p2.y} 
                  stroke="rgba(255, 255, 255, 0.18)" 
                  strokeWidth="1.5" 
                  markerEnd="url(#arrow)"
                />
                <text 
                  x={(p1.x + p2.x) / 2} 
                  y={(p1.y + p2.y) / 2 - 4} 
                  fill="#64748b" 
                  fontSize="8" 
                  textAnchor="middle"
                  className="font-mono"
                >
                  {e.relation}
                </text>
              </g>
            );
          })}

          {/* Render Nodes */}
          {nodes.map((n) => {
            const pos = nodePositions[n.id];
            if (!pos) return null;
            const color = getNodeColor(n.type);
            const isHovered = hoveredNode && hoveredNode.id === n.id;

            return (
              <g 
                key={n.id} 
                transform={`translate(${pos.x}, ${pos.y})`}
                onMouseEnter={() => setHoveredNode(n)}
                onMouseLeave={() => setHoveredNode(null)}
                style={{ cursor: 'pointer' }}
              >
                <circle 
                  r={isHovered ? 12 : 9} 
                  fill={color} 
                  stroke="#ffffff" 
                  strokeWidth={isHovered ? 2 : 1}
                  style={{ transition: 'all 0.15s ease', filter: `drop-shadow(0 0 8px ${color}80)` }}
                />
                <text 
                  y={18} 
                  fill="#e2e8f0" 
                  fontSize="10" 
                  fontWeight="600"
                  textAnchor="middle"
                  style={{ pointerEvents: 'none' }}
                >
                  {n.label.length > 20 ? n.label.substring(0, 18) + '...' : n.label}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Node Detail Popup */}
        {hoveredNode && (
          <div style={{
            position: 'absolute',
            bottom: '12px',
            right: '12px',
            background: 'rgba(14, 20, 36, 0.92)',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: '8px',
            padding: '10px 14px',
            pointerEvents: 'none',
            backdropFilter: 'blur(10px)',
            maxWidth: '300px'
          }}>
            <div style={{ fontSize: '0.7rem', color: getNodeColor(hoveredNode.type), fontWeight: '700', textTransform: 'uppercase' }}>
              {hoveredNode.type} NODE
            </div>
            <div style={{ fontSize: '0.9rem', fontWeight: '700', color: '#ffffff' }}>
              {hoveredNode.label}
            </div>
            {hoveredNode.metadata && Object.keys(hoveredNode.metadata).length > 0 && (
              <div style={{ marginTop: '6px', fontSize: '0.74rem', color: '#94a3b8' }}>
                {Object.entries(hoveredNode.metadata).map(([k, v]) => (
                  <div key={k}>{k}: <span style={{ color: '#e2e8f0' }}>{v}</span></div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
