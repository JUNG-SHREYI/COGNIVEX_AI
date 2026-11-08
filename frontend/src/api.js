/**
 * Cognivex AI Frontend REST Client
 */

const configuredApiBase = (import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000')
  .replace(/\/+$/, '');
const API_BASE = configuredApiBase.endsWith('/api')
  ? configuredApiBase
  : `${configuredApiBase}/api`;

function chatHeaders(accessToken, includeContentType = false, googleAccessToken, googleProjectId) {
  const headers = {};
  if (includeContentType) headers['Content-Type'] = 'application/json';
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  if (googleAccessToken) headers['X-Google-Access-Token'] = googleAccessToken;
  if (googleProjectId) headers['X-Google-Project-ID'] = googleProjectId;
  return headers;
}

async function readChatResponse(response, fallbackMessage) {
  const data = await response.json();
  if (!response.ok) throw new Error(data.detail || fallbackMessage);
  return data;
}

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

export async function promptCognivex(
  prompt,
  maxTokens = 35,
  sessionId = 'default',
  accessToken,
  chatId,
  title,
  geminiModel,
  googleAccessToken,
  googleProjectId
) {
  const res = await fetch(`${API_BASE}/cognivex/prompt`, {
    method: 'POST',
    headers: chatHeaders(accessToken, true, googleAccessToken, googleProjectId),
    body: JSON.stringify({
      prompt,
      max_tokens: maxTokens,
      session_id: sessionId,
      chat_id: chatId,
      title,
      gemini_model: geminiModel
    })
  });
  return readChatResponse(res, 'Cognivex could not respond.');
}

export async function promptDsaTutor(
  prompt,
  sessionId = 'default',
  accessToken,
  chatId,
  title,
  geminiModel,
  googleAccessToken,
  googleProjectId
) {
  const res = await fetch(`${API_BASE}/dsa-tutor/prompt`, {
    method: 'POST',
    headers: chatHeaders(accessToken, true, googleAccessToken, googleProjectId),
    body: JSON.stringify({
      prompt,
      session_id: sessionId,
      chat_id: chatId,
      title,
      gemini_model: geminiModel
    })
  });
  return readChatResponse(res, 'The DSA tutor could not respond.');
}

export async function getChatSessions(sessionId, accessToken) {
  const res = await fetch(
    `${API_BASE}/chat/sessions?session_id=${encodeURIComponent(sessionId)}`,
    { headers: chatHeaders(accessToken) }
  );
  return readChatResponse(res, 'Chat list could not be loaded.');
}

export async function createChatSession(sessionId, accessToken) {
  const res = await fetch(`${API_BASE}/chat/sessions`, {
    method: 'POST',
    headers: chatHeaders(accessToken, true),
    body: JSON.stringify({ session_id: sessionId })
  });
  return readChatResponse(res, 'A new chat could not be created.');
}

export async function deleteChatSession(sessionId, chatId, accessToken) {
  const res = await fetch(
    `${API_BASE}/chat/sessions/${encodeURIComponent(chatId)}?session_id=${encodeURIComponent(sessionId)}`,
    { method: 'DELETE', headers: chatHeaders(accessToken) }
  );
  return readChatResponse(res, 'Chat could not be deleted.');
}

export async function deleteAllChatSessions(sessionId, accessToken) {
  const res = await fetch(
    `${API_BASE}/chat/sessions?session_id=${encodeURIComponent(sessionId)}`,
    { method: 'DELETE', headers: chatHeaders(accessToken) }
  );
  return readChatResponse(res, 'Chat history could not be deleted.');
}

export async function getChatHistory(sessionId, chatId, accessToken) {
  const res = await fetch(
    `${API_BASE}/chat/history/${encodeURIComponent(chatId)}?session_id=${encodeURIComponent(sessionId)}`,
    {
    headers: chatHeaders(accessToken)
    }
  );
  return readChatResponse(res, 'Chat history could not be loaded.');
}

export async function clearChatHistory(sessionId, chatId, accessToken) {
  const res = await fetch(
    `${API_BASE}/chat/history/${encodeURIComponent(chatId)}?session_id=${encodeURIComponent(sessionId)}`,
    { method: 'DELETE', headers: chatHeaders(accessToken) }
  );
  return readChatResponse(res, 'Chat history could not be cleared.');
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
