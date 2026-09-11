import React from 'react';
import { ArrowLeft, Database, MessageSquare, ShieldCheck } from 'lucide-react';

export default function AdminPage({ overview, onBack }) {
  return (
    <main className="admin-page">
      <div className="admin-heading">
        <div>
          <p className="auth-kicker">Restricted control room</p>
          <h1>Super Admin</h1>
          <p>Read-only operational visibility for the Cognivex workspace.</p>
        </div>
        <button className="admin-back" onClick={onBack}><ArrowLeft size={16} /> Back to chat</button>
      </div>
      <div className="admin-summary">
        <article><ShieldCheck size={18} /><span>Signed in as</span><strong>{overview.admin_email}</strong></article>
        <article><MessageSquare size={18} /><span>Stored chat messages</span><strong>{overview.chat_message_count}</strong></article>
        <article><Database size={18} /><span>Registered domains</span><strong>{overview.domains.length}</strong></article>
      </div>
      <section className="admin-section">
        <div className="admin-section-heading"><h2>Chat activity</h2><span>Latest records</span></div>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead><tr><th>Time</th><th>Session</th><th>Role</th><th>Content</th><th>Provider</th></tr></thead>
            <tbody>
              {overview.chat_messages.map((message) => (
                <tr key={message.id}>
                  <td>{new Date(message.created_at).toLocaleString()}</td>
                  <td>{message.session_id}</td>
                  <td><span className={`admin-role ${message.role}`}>{message.role}</span></td>
                  <td className="admin-content">{message.content}</td>
                  <td>{message.provider}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {overview.chat_messages.length === 0 && <p className="admin-empty">No chat records found.</p>}
        </div>
      </section>
    </main>
  );
}