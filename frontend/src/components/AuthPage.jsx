import React, { useState } from 'react';
import { ArrowRight, Eye, EyeOff, LockKeyhole, Mail, Sparkles, UserRound } from 'lucide-react';
import { supabase } from '../supabaseClient';

export default function AuthPage({ onAuthenticated }) {
  const [mode, setMode] = useState('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!supabase) {
      setMessage('Supabase is not configured. Add the VITE_SUPABASE variables and restart the frontend.');
      return;
    }

    setMessage('');
    setIsSubmitting(true);
    try {
      if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { full_name: name.trim() } }
        });
        if (error) throw error;
        if (data.session) {
          onAuthenticated(data.session.user);
        } else {
          setMessage('Account created. Check your email to confirm your account, then sign in.');
          setMode('signin');
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password
        });
        if (error) throw error;
        onAuthenticated(data.user);
      }
    } catch (error) {
      setMessage(error.message || 'Authentication failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-panel">
        <div className="auth-brand">
          <div className="auth-mark"><Sparkles size={22} /></div>
          <div>
            <strong>COGNIVEX AI</strong>
            <span>Intelligence workspace</span>
          </div>
        </div>
        <div className="auth-copy">
          <p className="auth-kicker">Private workspace</p>
          <h1>{mode === 'signin' ? 'Welcome back.' : 'Create your workspace.'}</h1>
          <p>{mode === 'signin' ? 'Sign in to continue your conversations.' : 'Start a secure Cognivex workspace for your conversations.'}</p>
        </div>
        <form className="auth-form" onSubmit={handleSubmit}>
          {mode === 'signup' && (
            <label>
              <span>Name</span>
              <div className="auth-input"><UserRound size={17} /><input value={name} onChange={(event) => setName(event.target.value)} placeholder="Your name" autoComplete="name" required /></div>
            </label>
          )}
          <label>
            <span>Email</span>
            <div className="auth-input"><Mail size={17} /><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" autoComplete="email" required /></div>
          </label>
          <label>
            <span>Password</span>
            <div className="auth-input"><LockKeyhole size={17} /><input type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 6 characters" autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} minLength={6} required /><button type="button" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div>
          </label>
          {message && <p className="auth-message">{message}</p>}
          <button className="auth-submit" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Please wait...' : mode === 'signin' ? 'Sign in' : 'Create account'}
            {!isSubmitting && <ArrowRight size={17} />}
          </button>
        </form>
        <button className="auth-switch" onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setMessage(''); }}>
          {mode === 'signin' ? 'New to Cognivex? Create an account' : 'Already have an account? Sign in'}
        </button>
      </section>
    </main>
  );
}
