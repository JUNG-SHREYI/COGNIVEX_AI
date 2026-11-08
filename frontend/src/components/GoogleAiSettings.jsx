import React, { useEffect, useRef, useState } from 'react';
import { Cloud, Link2, Unlink } from 'lucide-react';
import { getGoogleProjectStorageKey, getUserGoogleProjectId } from '../auth/googleAi';

const GOOGLE_IDENTITY_SCRIPT = 'https://accounts.google.com/gsi/client';
const GOOGLE_CLOUD_SCOPE = 'https://www.googleapis.com/auth/cloud-platform';
const GOOGLE_OAUTH_CLIENT_ID = import.meta.env.VITE_GOOGLE_OAUTH_CLIENT_ID || '';
const PROJECT_ID_PATTERN = /^[a-z][a-z0-9-]{4,28}[a-z0-9]$/;

export default function GoogleAiSettings({ user, authorization, onAuthorizationChange }) {
  const [projectId, setProjectId] = useState(() => {
    try {
      return getUserGoogleProjectId(user.id);
    } catch (error) {
      console.error('Failed to read saved Google Cloud project ID:', error);
      return '';
    }
  });
  const [isGoogleIdentityReady, setIsGoogleIdentityReady] = useState(
    () => Boolean(window.google?.accounts?.oauth2)
  );
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const tokenClientRef = useRef(null);

  useEffect(() => {
    if (window.google?.accounts?.oauth2) {
      return undefined;
    }

    let script = document.querySelector(`script[src="${GOOGLE_IDENTITY_SCRIPT}"]`);
    const isNewScript = !script;
    if (!script) {
      script = document.createElement('script');
      script.src = GOOGLE_IDENTITY_SCRIPT;
      script.async = true;
      script.defer = true;
    }
    const handleLoad = () => setIsGoogleIdentityReady(true);
    const handleError = () => {
      setMessage('Google sign-in could not be loaded. Check your connection and try again.');
      setMessageType('error');
    };
    script.addEventListener('load', handleLoad);
    script.addEventListener('error', handleError);
    if (isNewScript) document.head.appendChild(script);
    return () => {
      script.removeEventListener('load', handleLoad);
      script.removeEventListener('error', handleError);
    };
  }, []);

  useEffect(() => {
    if (!isGoogleIdentityReady || !GOOGLE_OAUTH_CLIENT_ID) return;
    tokenClientRef.current = window.google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_OAUTH_CLIENT_ID,
      scope: `openid email ${GOOGLE_CLOUD_SCOPE}`,
      callback: (response) => {
        if (response.error || !response.access_token) {
          setMessage(response.error_description || response.error || 'Google authorization was not completed.');
          setMessageType('error');
          return;
        }
        if (!response.scope?.split(' ').includes(GOOGLE_CLOUD_SCOPE)) {
          setMessage('Google did not grant Vertex AI access. Reconnect and approve the requested permissions.');
          setMessageType('error');
          return;
        }
        onAuthorizationChange({
          accessToken: response.access_token,
          expiresAt: Date.now() + Number(response.expires_in || 3600) * 1000
        });
        setMessage(`Google account connected. Confirm it matches ${user.email}.`);
        setMessageType('success');
      },
      error_callback: (error) => {
        setMessage(error.message || 'The Google authorization window could not be opened.');
        setMessageType('error');
      }
    });
  }, [isGoogleIdentityReady, onAuthorizationChange, user.email]);

  const handleSaveProject = (event) => {
    event.preventDefault();
    const normalizedProjectId = projectId.trim();
    if (!PROJECT_ID_PATTERN.test(normalizedProjectId)) {
      setMessage('Enter a valid Google Cloud Project ID (6–30 lowercase letters, digits, or hyphens).');
      setMessageType('error');
      return;
    }
    try {
      window.localStorage.setItem(getGoogleProjectStorageKey(user.id), normalizedProjectId);
      setProjectId(normalizedProjectId);
      setMessage('Google Cloud Project ID saved in this browser.');
      setMessageType('success');
    } catch (error) {
      console.error('Failed to save Google Cloud project ID:', error);
      setMessage('The project ID could not be saved in browser storage.');
      setMessageType('error');
    }
  };

  const handleConnect = () => {
    if (!GOOGLE_OAUTH_CLIENT_ID) {
      setMessage('Google sign-in is not configured. Set VITE_GOOGLE_OAUTH_CLIENT_ID and restart the frontend.');
      setMessageType('error');
      return;
    }
    if (!PROJECT_ID_PATTERN.test(projectId.trim())) {
      setMessage('Enter and save your Google Cloud Project ID before connecting.');
      setMessageType('error');
      return;
    }
    if (!tokenClientRef.current) {
      setMessage('Google sign-in is still loading. Please try again in a moment.');
      setMessageType('error');
      return;
    }
    try {
      window.localStorage.setItem(getGoogleProjectStorageKey(user.id), projectId.trim());
      tokenClientRef.current.requestAccessToken({
        login_hint: user.email,
        prompt: 'select_account'
      });
    } catch (error) {
      console.error('Could not start Google authorization:', error);
      setMessage('Google authorization could not be started. Please try again.');
      setMessageType('error');
    }
  };

  const handleDisconnect = () => {
    if (authorization?.accessToken && window.google?.accounts?.oauth2) {
      window.google.accounts.oauth2.revoke(authorization.accessToken, () => {});
    }
    onAuthorizationChange(null);
    setMessage('Google account disconnected for this browser session.');
    setMessageType('success');
  };

  const isConnected = Boolean(authorization?.accessToken);

  return (
    <section className="settings-section google-ai-settings" aria-labelledby="google-ai-settings-title">
      <h3 id="google-ai-settings-title">Connect your Google account</h3>
      <p className="password-settings-description">
        Connect the Google account that uses the same verified email as <strong>{user.email}</strong>.
        Gemini requests run through Vertex AI in your Google Cloud project; Google applies that
        project’s billing and access permissions. Cognivex does not receive or store a Gemini API key.
      </p>
      <form className="password-settings-form" onSubmit={handleSaveProject}>
        <label>
          <span>Your Google Cloud Project ID</span>
          <input
            type="text"
            value={projectId}
            onChange={(event) => setProjectId(event.target.value)}
            placeholder="my-google-cloud-project"
            autoComplete="off"
            spellCheck="false"
            required
          />
        </label>
        <p className="auth-password-hint">
          The project needs billing, the Vertex AI API, and your Google account must have the Vertex AI User role.
          <a href="https://console.cloud.google.com/vertex-ai" target="_blank" rel="noreferrer"> Open Google Cloud</a>.
        </p>
        <button className="password-settings-submit" type="submit">
          <Cloud size={15} />
          Save project ID
        </button>
      </form>
      {message && (
        <p className={messageType === 'success' ? 'settings-success' : 'settings-error'} role="status">
          {message}
        </p>
      )}
      <div className="google-ai-actions">
        <button
          className="password-settings-submit"
          type="button"
          onClick={handleConnect}
          disabled={!isGoogleIdentityReady && Boolean(GOOGLE_OAUTH_CLIENT_ID)}
        >
          <Link2 size={15} />
          {isConnected ? 'Reconnect Google account' : 'Connect Google account'}
        </button>
        {authorization?.accessToken && (
          <button className="gemini-key-remove" type="button" onClick={handleDisconnect}>
            <Unlink size={15} />
            Disconnect
          </button>
        )}
      </div>
      {authorization?.expiresAt && (
        <p className="google-ai-token-note">
          Google access is temporary, sent to Cognivex only to call Vertex AI, and never saved by Cognivex.
          Reconnect after it expires or when you reload the app.
        </p>
      )}
    </section>
  );
}
