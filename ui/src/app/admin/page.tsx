'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import styles from './page.module.css';

interface Stats {
  services: number;
  categories: number;
  users: number;
  onlineServices: number;
}

export default function AdminPage() {
  const [stats, setStats] = useState<Stats>({ services: 0, categories: 0, users: 0, onlineServices: 0 });
  const [health, setHealth] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [services, categories, users, healthData] = await Promise.all([
          api.getServices(),
          api.getCategories(),
          api.getUsers().catch(() => []),
          api.getHealth(),
        ]);

        const online = services.filter((s: any) => s.lastHealthStatus === 'online').length;
        
        setStats({
          services: services.length,
          categories: categories.length,
          users: users.length,
          onlineServices: online,
        });
        setHealth(healthData);
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) {
    return <div className={styles.loading}><div className="spinner"></div></div>;
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1>Admin Overview</h1>
        <p>Monitor and manage your dashboard</p>
      </header>

      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statIcon}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="3" y="3" width="7" height="7" />
              <rect x="14" y="3" width="7" height="7" />
              <rect x="14" y="14" width="7" height="7" />
              <rect x="3" y="14" width="7" height="7" />
            </svg>
          </div>
          <div className={styles.statInfo}>
            <span className={styles.statValue}>{stats.services}</span>
            <span className={styles.statLabel}>Services</span>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon} data-status="success">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
              <path d="M22 4L12 14.01l-3-3" />
            </svg>
          </div>
          <div className={styles.statInfo}>
            <span className={styles.statValue}>{stats.onlineServices}</span>
            <span className={styles.statLabel}>Online</span>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
            </svg>
          </div>
          <div className={styles.statInfo}>
            <span className={styles.statValue}>{stats.users}</span>
            <span className={styles.statLabel}>Users</span>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
            </svg>
          </div>
          <div className={styles.statInfo}>
            <span className={styles.statValue}>{stats.categories}</span>
            <span className={styles.statLabel}>Categories</span>
          </div>
        </div>
      </div>

      <section className={styles.section}>
        <h2>System Status</h2>
        <div className={styles.statusCard}>
          <div className={styles.statusItem}>
            <span className={styles.statusLabel}>API Status</span>
            <span className={`${styles.statusBadge} ${health?.status === 'ok' ? styles.online : styles.offline}`}>
              {health?.status || 'Unknown'}
            </span>
          </div>
          <div className={styles.statusItem}>
            <span className={styles.statusLabel}>Database</span>
            <span className={`${styles.statusBadge} ${health?.database === 'connected' ? styles.online : styles.offline}`}>
              {health?.database || 'Unknown'}
            </span>
          </div>
          <div className={styles.statusItem}>
            <span className={styles.statusLabel}>Last Check</span>
            <span className={styles.statusValue}>
              {health?.timestamp ? new Date(health.timestamp).toLocaleString() : 'N/A'}
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}
