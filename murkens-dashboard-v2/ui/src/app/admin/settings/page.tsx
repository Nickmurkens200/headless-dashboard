'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import styles from './page.module.css';

interface Config {
  appTitle: string;
  baseUrl: string;
  authMode: 'NONE' | 'LOCAL' | 'SSO' | 'MIXED';
  allowPublicRegistration: boolean;
  iconSourceUrl: string;
  ssoProviderConfig?: {
    clientId: string;
    clientSecret: string;
    issuer: string;
    discoveryUrl?: string;
    scopes?: string;
  };
}

export default function SettingsPage() {
  const [config, setConfig] = useState<Config | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [form, setForm] = useState({
    appTitle: '',
    baseUrl: '',
    authMode: 'NONE' as Config['authMode'],
    allowPublicRegistration: false,
    iconSourceUrl: '',
    ssoClientId: '',
    ssoClientSecret: '',
    ssoIssuer: '',
    ssoDiscoveryUrl: '',
    ssoScopes: 'openid profile email',
  });

  useEffect(() => {
    async function fetchConfig() {
      try {
        const data = await api.getFullConfig();
        setConfig(data);
        setForm({
          appTitle: data.appTitle || '',
          baseUrl: data.baseUrl || '',
          authMode: data.authMode || 'NONE',
          allowPublicRegistration: data.allowPublicRegistration || false,
          iconSourceUrl: data.iconSourceUrl || '',
          ssoClientId: data.ssoProviderConfig?.clientId || '',
          ssoClientSecret: data.ssoProviderConfig?.clientSecret || '',
          ssoIssuer: data.ssoProviderConfig?.issuer || '',
          ssoDiscoveryUrl: data.ssoProviderConfig?.discoveryUrl || '',
          ssoScopes: data.ssoProviderConfig?.scopes || 'openid profile email',
        });
      } catch (error) {
        console.error('Failed to fetch config:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchConfig();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const updateData: any = {
        appTitle: form.appTitle,
        baseUrl: form.baseUrl,
        authMode: form.authMode,
        allowPublicRegistration: form.allowPublicRegistration,
        iconSourceUrl: form.iconSourceUrl,
      };

      if (form.authMode === 'SSO' || form.authMode === 'MIXED') {
        updateData.ssoProviderConfig = {
          clientId: form.ssoClientId,
          clientSecret: form.ssoClientSecret,
          issuer: form.ssoIssuer,
          discoveryUrl: form.ssoDiscoveryUrl || undefined,
          scopes: form.ssoScopes,
        };
      }

      await api.updateConfig(updateData);
      setMessage({ type: 'success', text: 'Settings saved successfully' });
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to save settings' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className={styles.loading}><div className="spinner"></div></div>;
  }

  const showSsoConfig = form.authMode === 'SSO' || form.authMode === 'MIXED';

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1>Settings</h1>
        <p>Configure your dashboard</p>
      </header>

      {message && (
        <div className={`${styles.message} ${styles[message.type]}`}>
          {message.text}
        </div>
      )}

      <section className={styles.section}>
        <h2>General</h2>
        <div className={styles.card}>
          <div className={styles.field}>
            <label>Dashboard Title</label>
            <input
              type="text"
              value={form.appTitle}
              onChange={e => setForm({ ...form, appTitle: e.target.value })}
              placeholder="My Dashboard"
            />
          </div>
          <div className={styles.field}>
            <label>Base URL (for reverse proxy)</label>
            <input
              type="url"
              value={form.baseUrl}
              onChange={e => setForm({ ...form, baseUrl: e.target.value })}
              placeholder="https://dashboard.example.com"
            />
          </div>
          <div className={styles.field}>
            <label>Icon Source URL</label>
            <input
              type="url"
              value={form.iconSourceUrl}
              onChange={e => setForm({ ...form, iconSourceUrl: e.target.value })}
              placeholder="https://cdn.jsdelivr.net/gh/selfhst/icons/png/"
            />
            <span className={styles.hint}>Base URL for Selfh.st icons CDN</span>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <h2>Authentication</h2>
        <div className={styles.card}>
          <div className={styles.field}>
            <label>Authentication Mode</label>
            <select
              value={form.authMode}
              onChange={e => setForm({ ...form, authMode: e.target.value as Config['authMode'] })}
            >
              <option value="NONE">None (No authentication required)</option>
              <option value="LOCAL">Local (Email/Password)</option>
              <option value="SSO">SSO Only (OIDC/OAuth)</option>
              <option value="MIXED">Mixed (Local + SSO)</option>
            </select>
          </div>

          {(form.authMode === 'LOCAL' || form.authMode === 'MIXED') && (
            <label className={styles.checkbox}>
              <input
                type="checkbox"
                checked={form.allowPublicRegistration}
                onChange={e => setForm({ ...form, allowPublicRegistration: e.target.checked })}
              />
              <span>Allow public registration</span>
            </label>
          )}
        </div>
      </section>

      {showSsoConfig && (
        <section className={styles.section}>
          <h2>SSO / OIDC Configuration</h2>
          <div className={styles.card}>
            <div className={styles.field}>
              <label>Issuer URL *</label>
              <input
                type="url"
                value={form.ssoIssuer}
                onChange={e => setForm({ ...form, ssoIssuer: e.target.value })}
                placeholder="https://auth.example.com"
              />
            </div>
            <div className={styles.field}>
              <label>Client ID *</label>
              <input
                type="text"
                value={form.ssoClientId}
                onChange={e => setForm({ ...form, ssoClientId: e.target.value })}
                placeholder="your-client-id"
              />
            </div>
            <div className={styles.field}>
              <label>Client Secret *</label>
              <input
                type="password"
                value={form.ssoClientSecret}
                onChange={e => setForm({ ...form, ssoClientSecret: e.target.value })}
                placeholder="••••••••"
              />
            </div>
            <div className={styles.field}>
              <label>Discovery URL (optional)</label>
              <input
                type="url"
                value={form.ssoDiscoveryUrl}
                onChange={e => setForm({ ...form, ssoDiscoveryUrl: e.target.value })}
                placeholder="https://auth.example.com/.well-known/openid-configuration"
              />
              <span className={styles.hint}>Leave empty to auto-detect from issuer</span>
            </div>
            <div className={styles.field}>
              <label>Scopes</label>
              <input
                type="text"
                value={form.ssoScopes}
                onChange={e => setForm({ ...form, ssoScopes: e.target.value })}
                placeholder="openid profile email"
              />
            </div>
          </div>
        </section>
      )}

      <div className={styles.actions}>
        <button className={styles.saveBtn} onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}
