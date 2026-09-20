/**
 * Cognivex AI Frontend REST Client
 */

const API_BASE = 'http://127.0.0.1:8000/api';

export async function getHealth() {
  const res = await fetch(`${API_BASE}/health`);
  return res.json();
}

export async function getDomains() {
  const res = await fetch(`${API_BASE}/domains`);
  return res.json();
}

export async function getDomainDetails(domainId) {
  const res = await fetch(`${API_BASE}/domain/${domainId}`);
  return res.json();
}

export async function analyzeIncident(payload) {
  const res = await fetch(`${API_BASE}/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  return res.json();
}

export async function triggerAction(payload) {
  const res = await fetch(`${API_BASE}/action/trigger`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  return res.json();
}

export async function getActionAudit() {
  const res = await fetch(`${API_BASE}/actions/audit`);
  return res.json();
}

export async function generateBrief(analysisData) {
  const res = await fetch(`${API_BASE}/report/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(analysisData)
  });
  return res.json();
}

export async function getModelInfo() {
  const res = await fetch(`${API_BASE}/cognivex/model-info`);
  return res.json();
}

export async function promptCognivex(prompt, maxTokens = 35, sessionId = 'default') {
  const res = await fetch(`${API_BASE}/cognivex/prompt`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, max_tokens: maxTokens, session_id: sessionId })
  });
  return res.json();
}

export async function getChatHistory(sessionId) {
  const res = await fetch(`${API_BASE}/chat/history/${encodeURIComponent(sessionId)}`);
  return res.json();
}

export async function clearChatHistory(sessionId) {
  const res = await fetch(`${API_BASE}/chat/history/${encodeURIComponent(sessionId)}`, { method: 'DELETE' });
  return res.json();
}

export async function getAdminOverview(accessToken) {
  const res = await fetch(`${API_BASE}/admin/overview`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || 'Admin access denied');
  return data;
}

export async function trainCognivex(domain, samples, epochs = 5) {
  const res = await fetch(`${API_BASE}/cognivex/train`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ domain, samples, epochs })
  });
  return res.json();
}

export async function createCustomDomain(payload) {
  const res = await fetch(`${API_BASE}/domain/custom/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  return res.json();
}

export async function getIntegrationsStatus() {
  const res = await fetch(`${API_BASE}/integrations/status`);
  return res.json();
}

