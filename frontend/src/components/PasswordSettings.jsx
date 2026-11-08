import React, { useState } from 'react';
import { ArrowRight, KeyRound, Mail } from 'lucide-react';
import { getPasswordError } from '../auth/passwordValidation';
import { supabase } from '../supabaseClient';

export default function PasswordSettings({ user, recovery = false, onPasswordUpdated }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const setStatus = (text, type) => {
    setMessage(text);
    setMessageType(type);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage('');
    setMessageType('');

    const passwordError = getPasswordError(newPassword);
    if (passwordError) {
      setStatus(passwordError, 'error');
      return;
    }
    if (newPassword !== confirmPassword) {
      setStatus('New passwords do not match.', 'error');
      return;
    }
    if (!recovery && newPassword === currentPassword) {
      setStatus('Choose a new password that differs from your current password.', 'error');
      return;
    }
    if (!supabase) {
      setStatus('Supabase is not configured. Password changes are unavailable.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      if (!recovery) {
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
          email: user.email,
          password: currentPassword
        });
        if (authError) {
          setStatus('Current password is incorrect. Try again or use “Forgot current password?”.', 'error');
          return;
        }
        if (authData.user?.id !== user.id) {
          setStatus('Could not verify the current account. Please sign in again.', 'error');
          return;
        }
      }

      const updateAttributes = recovery
        ? { password: newPassword }
        : { password: newPassword, current_password: currentPassword };
      const { error } = await supabase.auth.updateUser(updateAttributes);
      if (error) throw error;

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setStatus('Your password has been updated.', 'success');
      onPasswordUpdated?.();
    } catch (error) {
      setStatus(error.message || 'Password update failed. Please try again.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotPassword = async () => {
    setMessage('');
    setMessageType('');
    if (!user.email) {
      setStatus('There is no email address on this account to send a reset link to.', 'error');
      return;
    }
    if (!supabase) {
      setStatus('Supabase is not configured. Password reset is unavailable.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: window.location.origin
      });
      if (error) throw error;
      setStatus(`If an account exists for ${user.email}, a password reset email has been sent.`, 'success');
    } catch (error) {
      setStatus(error.message || 'Could not send the password reset email. Please try again.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="settings-section password-settings" aria-labelledby="password-settings-title">
      <h3 id="password-settings-title">{recovery ? 'Reset password' : 'Password & security'}</h3>
      {recovery && (
        <p className="password-settings-description">Choose a new password for your account.</p>
      )}
      {!recovery && (
        <p className="password-settings-description">
          Verify your current password before setting a new one, or request a reset email if you forgot it.
        </p>
      )}
      <form className="password-settings-form" onSubmit={handleSubmit}>
        {!recovery && (
          <label>
            <span>Current password</span>
            <input
              type="password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              autoComplete="current-password"
              required
            />
          </label>
        )}
        <label>
          <span>New password</span>
          <input
            type="password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            autoComplete="new-password"
            minLength={6}
            required
          />
        </label>
        <label>
          <span>Confirm new password</span>
          <input
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            autoComplete="new-password"
            minLength={6}
            required
          />
        </label>
        <p className="auth-password-hint">
          At least 6 characters, starting with a capital letter, including a number and a special character. No character may repeat more than 3 times consecutively.
        </p>
        {message && (
          <p className={messageType === 'success' ? 'settings-success' : 'settings-error'} role="status">
            {message}
          </p>
        )}
        <button className="password-settings-submit" type="submit" disabled={isSubmitting}>
          <KeyRound size={15} />
          {isSubmitting ? 'Please wait…' : recovery ? 'Set new password' : 'Change password'}
          {!isSubmitting && <ArrowRight size={15} />}
        </button>
      </form>
      {!recovery && (
        <button
          className="password-reset-link"
          type="button"
          onClick={handleForgotPassword}
          disabled={isSubmitting}
        >
          <Mail size={15} />
          Forgot current password? Send reset email
        </button>
      )}
    </section>
  );
}
