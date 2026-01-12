'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api';
import styles from './page.module.css';

export default function LoginPage() {
  const router = useRouter();
  const { authConfig, isLoading, isAuthenticated, login, register } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      if (authConfig?.authMode === 'NONE') {
        router.push('/');
      } else if (isAuthenticated) {
        router.push('/');
      } else if (authConfig?.authMode === 'SSO') {
        window.location.href = api.getSsoAuthUrl();
      }
    }
  }, [isLoading, authConfig, isAuthenticated, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        await register(email, password, username || undefined, displayName || undefined);
      }
      router.push('/');
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSsoLogin = () => {
    window.location.href = api.getSsoAuthUrl();
  };

  if (isLoading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  const showLocalAuth = authConfig?.authMode === 'LOCAL' || authConfig?.authMode === 'MIXED';
  const showSsoAuth = authConfig?.authMode === 'SSO' || authConfig?.authMode === 'MIXED';
  const showRegister = authConfig?.allowPublicRegistration && showLocalAuth;

  return (
    <div className="container">
      <div className={styles.loginContainer}>
        <div className={styles.loginCard}>
          <div className={styles.loginHeader}>
            <div className={styles.logo}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2" />
              </svg>
            </div>
            <h1>{mode === 'login' ? 'Welcome back' : 'Create account'}</h1>
            <p>{mode === 'login' ? 'Sign in to access your dashboard' : 'Register for a new account'}</p>
          </div>

          {error && <div className={styles.error}>{error}</div>}

          {showSsoAuth && (
            <>
              <button type="button" className={styles.ssoBtn} onClick={handleSsoLogin}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4" />
                  <path d="M10 17l5-5-5-5" />
                  <path d="M15 12H3" />
                </svg>
                Sign in with SSO
              </button>
              {showLocalAuth && <div className={styles.divider}><span>or</span></div>}
            </>
          )}

          {showLocalAuth && (
            <form onSubmit={handleSubmit} className={styles.form}>
              <div className={styles.field}>
                <label htmlFor="email">Email</label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  placeholder="you@example.com"
                />
              </div>

              {mode === 'register' && (
                <>
                  <div className={styles.field}>
                    <label htmlFor="username">Username (optional)</label>
                    <input
                      id="username"
                      type="text"
                      value={username}
                      onChange={e => setUsername(e.target.value)}
                      placeholder="johndoe"
                    />
                  </div>
                  <div className={styles.field}>
                    <label htmlFor="displayName">Display Name (optional)</label>
                    <input
                      id="displayName"
                      type="text"
                      value={displayName}
                      onChange={e => setDisplayName(e.target.value)}
                      placeholder="John Doe"
                    />
                  </div>
                </>
              )}

              <div className={styles.field}>
                <label htmlFor="password">Password</label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  minLength={mode === 'register' ? 6 : 4}
                  placeholder="••••••••"
                />
              </div>

              <button type="submit" className={styles.submitBtn} disabled={submitting}>
                {submitting ? (
                  <span className={styles.btnSpinner}></span>
                ) : mode === 'login' ? (
                  'Sign In'
                ) : (
                  'Create Account'
                )}
              </button>
            </form>
          )}

          {showRegister && (
            <div className={styles.switchMode}>
              {mode === 'login' ? (
                <>
                  Don&apos;t have an account?{' '}
                  <button type="button" onClick={() => setMode('register')}>
                    Register
                  </button>
                </>
              ) : (
                <>
                  Already have an account?{' '}
                  <button type="button" onClick={() => setMode('login')}>
                    Sign in
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
