'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import styles from './page.module.css';

const colorPresets = [
  { name: 'Indigo', value: '#6366f1' },
  { name: 'Blue', value: '#3b82f6' },
  { name: 'Cyan', value: '#06b6d4' },
  { name: 'Teal', value: '#14b8a6' },
  { name: 'Green', value: '#22c55e' },
  { name: 'Yellow', value: '#eab308' },
  { name: 'Orange', value: '#f97316' },
  { name: 'Red', value: '#ef4444' },
  { name: 'Pink', value: '#ec4899' },
  { name: 'Purple', value: '#a855f7' },
];

export default function AppearancePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [form, setForm] = useState({
    mode: 'dark' as 'dark' | 'light',
    primaryColor: '#6366f1',
    customCss: '',
  });

  useEffect(() => {
    async function fetchConfig() {
      try {
        const data = await api.getFullConfig();
        if (data.themeSettings) {
          setForm({
            mode: data.themeSettings.mode || 'dark',
            primaryColor: data.themeSettings.primaryColor || '#6366f1',
            customCss: data.themeSettings.customCss || '',
          });
        }
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
      await api.updateConfig({
        themeSettings: {
          mode: form.mode,
          primaryColor: form.primaryColor,
          customCss: form.customCss,
        },
      });
      setMessage({ type: 'success', text: 'Appearance settings saved' });
      
      // Apply theme immediately
      document.documentElement.setAttribute('data-theme', form.mode);
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to save' });
    } finally {
      setSaving(false);
    }
  };

  const previewTheme = (mode: 'dark' | 'light') => {
    setForm({ ...form, mode });
    document.documentElement.setAttribute('data-theme', mode);
  };

  if (loading) {
    return <div className={styles.loading}><div className="spinner"></div></div>;
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1>Appearance</h1>
        <p>Customize the look and feel of your dashboard</p>
      </header>

      {message && (
        <div className={`${styles.message} ${styles[message.type]}`}>
          {message.text}
        </div>
      )}

      <section className={styles.section}>
        <h2>Theme Mode</h2>
        <div className={styles.themeOptions}>
          <button
            className={`${styles.themeOption} ${form.mode === 'dark' ? styles.active : ''}`}
            onClick={() => previewTheme('dark')}
          >
            <div className={styles.themePreview} data-theme="dark">
              <div className={styles.previewHeader}></div>
              <div className={styles.previewContent}>
                <div className={styles.previewCard}></div>
                <div className={styles.previewCard}></div>
              </div>
            </div>
            <span>Dark</span>
          </button>
          <button
            className={`${styles.themeOption} ${form.mode === 'light' ? styles.active : ''}`}
            onClick={() => previewTheme('light')}
          >
            <div className={styles.themePreview} data-theme="light">
              <div className={styles.previewHeader}></div>
              <div className={styles.previewContent}>
                <div className={styles.previewCard}></div>
                <div className={styles.previewCard}></div>
              </div>
            </div>
            <span>Light</span>
          </button>
        </div>
      </section>

      <section className={styles.section}>
        <h2>Accent Color</h2>
        <div className={styles.colorOptions}>
          {colorPresets.map(color => (
            <button
              key={color.value}
              className={`${styles.colorOption} ${form.primaryColor === color.value ? styles.active : ''}`}
              style={{ '--color': color.value } as React.CSSProperties}
              onClick={() => setForm({ ...form, primaryColor: color.value })}
              title={color.name}
            >
              <div className={styles.colorSwatch}></div>
            </button>
          ))}
          <div className={styles.customColor}>
            <label>Custom:</label>
            <input
              type="color"
              value={form.primaryColor}
              onChange={e => setForm({ ...form, primaryColor: e.target.value })}
            />
            <input
              type="text"
              value={form.primaryColor}
              onChange={e => setForm({ ...form, primaryColor: e.target.value })}
              placeholder="#6366f1"
            />
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <h2>Custom CSS</h2>
        <div className={styles.card}>
          <p className={styles.hint}>
            Add custom CSS to further customize the appearance. Changes are applied globally.
          </p>
          <textarea
            className={styles.cssEditor}
            value={form.customCss}
            onChange={e => setForm({ ...form, customCss: e.target.value })}
            placeholder={`/* Example */
:root {
  --bg-base: #0d1117;
}

.serviceCard {
  border-radius: 16px;
}`}
          />
        </div>
      </section>

      <div className={styles.actions}>
        <button className={styles.saveBtn} onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}
