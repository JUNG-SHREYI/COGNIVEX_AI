import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, Eye, EyeOff, LockKeyhole, Mail, UserRound } from 'lucide-react';
import { supabase } from '../supabaseClient';

const PASSWORD_SPECIAL_CHARACTERS = "!@#$%^&*()_+-=[]{};':\"|<>?,./\\`~";

function getPasswordError(password) {
  if (!/^[A-Z]/.test(password)) return 'Password must start with an uppercase letter.';
  if (password.length < 6) return 'Password must be at least 6 characters long.';
  if (!/\d/.test(password)) return 'Password must contain at least one number.';
  if (![...PASSWORD_SPECIAL_CHARACTERS].some((character) => password.includes(character))) {
    return 'Password must contain at least one special character.';
  }
  if (/(.)\1{3}/.test(password)) return 'Password cannot repeat the same character more than 3 times in a row.';
  return '';
}

export default function AuthPage({ initialMode = 'signin', onAuthenticated, onBack }) {
  const [mode, setMode] = useState(initialMode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [emailOtp, setEmailOtp] = useState('');
  const [awaitingEmailOtp, setAwaitingEmailOtp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!supabase) {
      setMessage('Supabase is not configured. Add the VITE_SUPABASE variables and restart the frontend.');
      return;
    }

    setMessage('');
    setIsSuccess(false);
    if (mode === 'signup' && awaitingEmailOtp) {
      if (!/^\d{6}$/.test(emailOtp.trim())) {
        setMessage('Enter the 6-digit code from your email.');
        return;
      }

      setIsSubmitting(true);
      try {
        const { data, error } = await supabase.auth.verifyOtp({
          email: email.trim(),
          token: emailOtp.trim(),
          type: 'signup'
        });
        if (error) throw error;
        if (!data.session) throw new Error('Email verified. Please sign in to continue.');
        onAuthenticated(data.user, data.session.access_token);
      } catch (error) {
        setMessage(error.message || 'Email verification failed. Check the code and try again.');
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    if (mode === 'signup') {
      const passwordError = getPasswordError(password);
      if (passwordError) {
        setMessage(passwordError);
        return;
      }
      if (password !== confirmPassword) {
        setMessage('Passwords do not match.');
        return;
      }
    }

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
          onAuthenticated(data.session.user, data.session.access_token);
        } else {
          setPassword('');
          setConfirmPassword('');
          setAwaitingEmailOtp(true);
          setIsSuccess(true);
          setMessage(`A 6-digit verification code was requested for ${email.trim()}. Check your inbox and spam folder.`);
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password
        });
        if (error) throw error;
        onAuthenticated(data.user, data.session.access_token);
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
        <button className="auth-back" type="button" onClick={onBack}>
          <ArrowLeft size={16} /> Back to home
        </button>
        <div className="auth-brand">
          <img className="auth-mark" src="/cognivex-logo.png" alt="" />
          <div>
            <strong>COGNIVEX AI</strong>
            <span>Intelligence workspace</span>
          </div>
        </div>
        <div className="auth-copy">
          <p className="auth-kicker">Account required</p>
          <h1>{mode === 'signin' ? 'Welcome back.' : 'Create your workspace.'}</h1>
          <p>{mode === 'signin' ? 'Sign in to start chatting.' : 'Sign up to start using Cognivex AI.'}</p>
        </div>
        <form className="auth-form" onSubmit={handleSubmit}>
          {mode === 'signup' && !awaitingEmailOtp && (
            <label>
              <span>Name</span>
              <div className="auth-input"><UserRound size={17} /><input value={name} onChange={(event) => setName(event.target.value)} placeholder="Your name" autoComplete="name" required /></div>
            </label>
          )}
          <label>
            <span>Email</span>
            <div className="auth-input"><Mail size={17} /><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" autoComplete="email" disabled={awaitingEmailOtp} required /></div>
          </label>
          {mode === 'signup' && awaitingEmailOtp ? (
            <label>
              <span>Email verification code</span>
              <div className="auth-input"><LockKeyhole size={17} /><input type="text" value={emailOtp} onChange={(event) => setEmailOtp(event.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="6-digit code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required /></div>
            </label>
          ) : (
            <label>
              <span>Password</span>
              <div className="auth-input"><LockKeyhole size={17} /><input type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} placeholder={mode === 'signup' ? 'At least 6 characters' : 'Your password'} autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} minLength={mode === 'signup' ? 6 : undefined} required /><button type="button" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div>
            </label>
          )}
          {mode === 'signup' && !awaitingEmailOtp && (
            <>
              <p className="auth-password-hint">Use at least 6 characters, starting with a capital letter, with a number and a special character. No character may repeat more than 3 times consecutively.</p>
              <label>
                <span>Confirm password</span>
                <div className="auth-input"><LockKeyhole size={17} /><input type={showPassword ? 'text' : 'password'} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Enter your password again" autoComplete="new-password" required /></div>
              </label>
            </>
          )}
          {message && <p className={isSuccess ? 'auth-message auth-message-success' : 'auth-message'} role="status">{message}</p>}
          <button className="auth-submit" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Please wait...' : mode === 'signin' ? 'Sign in' : awaitingEmailOtp ? 'Verify email' : 'Sign up'}
            {!isSubmitting && <ArrowRight size={17} />}
          </button>
        </form>
        {awaitingEmailOtp && (
          <button className="auth-switch" type="button" onClick={() => { setAwaitingEmailOtp(false); setEmailOtp(''); setMessage(''); setIsSuccess(false); }}>
            Use a different email
          </button>
        )}
        {!awaitingEmailOtp && (
          <button className="auth-switch" type="button" onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setMessage(''); setIsSuccess(false); setPassword(''); setConfirmPassword(''); setEmailOtp(''); setAwaitingEmailOtp(false); }}>
            {mode === 'signin' ? 'New to Cognivex? Sign up' : 'Already have an account? Sign in'}
          </button>
        )}
      </section>
    </main>
  );
}
