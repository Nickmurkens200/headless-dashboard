'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api';
import { getIconUrl } from '@/lib/config';
import styles from './page.module.css';

interface Service {
  id: string;
  name: string;
  description?: string;
  url: string;
  iconUrl?: string;
  iconSlug?: string;
  category: string;
  isPublic: boolean;
  lastHealthStatus?: string;
}

interface Category {
  id: string;
  name: string;
  icon?: string;
}

interface Config {
  appTitle: string;
  themeSettings?: {
    mode: 'dark' | 'light';
    primaryColor?: string;
  };
}

export default function DashboardPage() {
  const { user, isLoading: authLoading, authConfig, logout } = useAuth();
  const [services, setServices] = useState<Service[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [config, setConfig] = useState<Config | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');

  const fetchData = useCallback(async () => {
    try {
      const [servicesData, categoriesData, configData] = await Promise.all([
        api.getServices(),
        api.getCategories(),
        api.getPublicConfig(),
      ]);
      setServices(servicesData);
      setCategories(categoriesData);
      setConfig(configData);
      
      // Apply theme
      if (configData.themeSettings?.mode) {
        document.documentElement.setAttribute('data-theme', configData.themeSettings.mode);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading) {
      fetchData();
    }
  }, [authLoading, fetchData]);

  // Group services by category
  const groupedServices = services.reduce((acc, service) => {
    const category = service.category || 'Other';
    if (!acc[category]) acc[category] = [];
    acc[category].push(service);
    return acc;
  }, {} as Record<string, Service[]>);

  // Filter services
  const filteredCategories = Object.entries(groupedServices).filter(([category, categoryServices]) => {
    if (selectedCategory && category !== selectedCategory) return false;
    if (search) {
      return categoryServices.some(
        s => s.name.toLowerCase().includes(search.toLowerCase()) ||
             s.description?.toLowerCase().includes(search.toLowerCase())
      );
    }
    return true;
  });

  if (authLoading || loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
        <p>Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="container">
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.headerLeft}>
            <div className={styles.logo}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2" />
              </svg>
            </div>
            <h1>{config?.appTitle || 'Dashboard'}</h1>
          </div>

          <div className={styles.headerCenter}>
            <div className={styles.searchWrap}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
              <input
                type="text"
                placeholder="Search services..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div className={styles.headerActions}>
            {user?.role === 'ADMIN' && (
              <Link href="/admin" className={styles.btnIcon} title="Admin">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
                </svg>
              </Link>
            )}

            {user ? (
              <div className={styles.userMenu}>
                <span className={styles.userName}>{user.displayName || user.email}</span>
                <button className={styles.signOutBtn} onClick={logout} title="Sign out">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
                    <path d="M16 17l5-5-5-5" />
                    <path d="M21 12H9" />
                  </svg>
                </button>
              </div>
            ) : authConfig?.authMode !== 'NONE' ? (
              <Link href="/login" className={styles.loginBtn}>
                Sign In
              </Link>
            ) : null}
          </div>
        </div>
      </header>

      <main className={styles.main}>
        {categories.length > 1 && (
          <div className={styles.categoryFilter}>
            <button
              className={`${styles.categoryBtn} ${!selectedCategory ? styles.active : ''}`}
              onClick={() => setSelectedCategory('')}
            >
              All
            </button>
            {categories.map(cat => (
              <button
                key={cat.id}
                className={`${styles.categoryBtn} ${selectedCategory === cat.name ? styles.active : ''}`}
                onClick={() => setSelectedCategory(cat.name)}
              >
                {cat.icon && <span>{cat.icon}</span>}
                {cat.name}
              </button>
            ))}
          </div>
        )}

        {services.length === 0 ? (
          <div className={styles.empty}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="2" y="3" width="20" height="14" rx="2" />
              <path d="M8 21h8M12 17v4" />
            </svg>
            <h3>No services yet</h3>
            <p>
              {user?.role === 'ADMIN'
                ? 'Add your first service from the admin panel'
                : 'No public services available'}
            </p>
            {user?.role === 'ADMIN' && (
              <Link href="/admin/services" className={styles.addBtn}>
                Add Service
              </Link>
            )}
          </div>
        ) : (
          filteredCategories.map(([category, categoryServices]) => {
            const filtered = search
              ? categoryServices.filter(
                  s =>
                    s.name.toLowerCase().includes(search.toLowerCase()) ||
                    s.description?.toLowerCase().includes(search.toLowerCase())
                )
              : categoryServices;

            if (filtered.length === 0) return null;

            return (
              <section key={category} className={styles.categorySection}>
                <h2 className={styles.categoryTitle}>
                  {categories.find(c => c.name === category)?.icon && (
                    <span>{categories.find(c => c.name === category)?.icon}</span>
                  )}
                  {category}
                </h2>
                <div className={styles.serviceGrid}>
                  {filtered.map(service => (
                    <a
                      key={service.id}
                      href={service.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.serviceCard}
                    >
                      <div className={styles.serviceIcon}>
                        {service.iconUrl || service.iconSlug ? (
                          <img
                            src={getIconUrl(service.iconUrl || service.iconSlug) || ''}
                            alt=""
                            onError={e => {
                              (e.target as HTMLImageElement).style.display = 'none';
                              (e.target as HTMLImageElement).nextElementSibling?.classList.remove(styles.hidden);
                            }}
                          />
                        ) : null}
                        <span className={service.iconUrl || service.iconSlug ? styles.hidden : ''}>
                          {service.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className={styles.serviceInfo}>
                        <h3>{service.name}</h3>
                        {service.description && <p>{service.description}</p>}
                      </div>
                      {service.lastHealthStatus && (
                        <div
                          className={`${styles.status} ${styles[service.lastHealthStatus]}`}
                          title={service.lastHealthStatus}
                        />
                      )}
                    </a>
                  ))}
                </div>
              </section>
            );
          })
        )}
      </main>
    </div>
  );
}
