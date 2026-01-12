'use client';

import { useState, useEffect, useCallback } from 'react';
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
  isEnabled: boolean;
}

interface IconResult {
  slug: string;
  name: string;
  pngUrl: string;
}

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [iconSearch, setIconSearch] = useState('');
  const [iconResults, setIconResults] = useState<IconResult[]>([]);
  const [iconSearchLoading, setIconSearchLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: '',
    description: '',
    url: '',
    iconSlug: '',
    iconUrl: '',
    category: 'Default',
    isPublic: false,
    isEnabled: true,
  });

  const fetchData = useCallback(async () => {
    try {
      const [servicesData, categoriesData] = await Promise.all([
        api.getServices(),
        api.getCategories(),
      ]);
      setServices(servicesData);
      setCategories(categoriesData.map((c: any) => c.name));
    } catch (error) {
      console.error('Failed to fetch services:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const searchIcons = useCallback(async (query: string) => {
    if (query.length < 2) {
      setIconResults([]);
      return;
    }
    setIconSearchLoading(true);
    try {
      const results = await api.searchIcons(query, 12);
      setIconResults(results);
    } catch (error) {
      console.error('Icon search failed:', error);
    } finally {
      setIconSearchLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => {
      searchIcons(iconSearch);
    }, 300);
    return () => clearTimeout(timeout);
  }, [iconSearch, searchIcons]);

  const openModal = (service?: Service) => {
    if (service) {
      setEditingService(service);
      setForm({
        name: service.name,
        description: service.description || '',
        url: service.url,
        iconSlug: service.iconSlug || '',
        iconUrl: service.iconUrl || '',
        category: service.category,
        isPublic: service.isPublic,
        isEnabled: service.isEnabled,
      });
    } else {
      setEditingService(null);
      setForm({
        name: '',
        description: '',
        url: '',
        iconSlug: '',
        iconUrl: '',
        category: categories[0] || 'Default',
        isPublic: false,
        isEnabled: true,
      });
    }
    setIconSearch('');
    setIconResults([]);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingService(null);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editingService) {
        await api.updateService(editingService.id, form);
      } else {
        await api.createService(form);
      }
      closeModal();
      fetchData();
    } catch (error: any) {
      alert(error.message || 'Failed to save service');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this service?')) return;
    try {
      await api.deleteService(id);
      fetchData();
    } catch (error: any) {
      alert(error.message || 'Failed to delete service');
    }
  };

  const selectIcon = (icon: IconResult) => {
    setForm({ ...form, iconSlug: icon.slug, iconUrl: '' });
    setIconSearch('');
    setIconResults([]);
  };

  if (loading) {
    return <div className={styles.loading}><div className="spinner"></div></div>;
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1>Services</h1>
          <p>Manage your dashboard services</p>
        </div>
        <button className={styles.addBtn} onClick={() => openModal()}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Add Service
        </button>
      </header>

      {services.length === 0 ? (
        <div className={styles.empty}>
          <p>No services yet. Add your first service to get started.</p>
        </div>
      ) : (
        <div className={styles.servicesList}>
          {services.map(service => (
            <div key={service.id} className={styles.serviceItem}>
              <div className={styles.serviceIcon}>
                {(service.iconUrl || service.iconSlug) ? (
                  <img src={getIconUrl(service.iconUrl || service.iconSlug) || ''} alt="" />
                ) : (
                  <span>{service.name.charAt(0).toUpperCase()}</span>
                )}
              </div>
              <div className={styles.serviceInfo}>
                <h3>{service.name}</h3>
                <p>{service.url}</p>
                <div className={styles.serviceMeta}>
                  <span className={styles.category}>{service.category}</span>
                  {service.isPublic && <span className={styles.badge}>Public</span>}
                  {!service.isEnabled && <span className={`${styles.badge} ${styles.disabled}`}>Disabled</span>}
                </div>
              </div>
              <div className={styles.serviceActions}>
                <button className={styles.editBtn} onClick={() => openModal(service)}>
                  Edit
                </button>
                <button className={styles.deleteBtn} onClick={() => handleDelete(service.id)}>
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modalOpen && (
        <div className={styles.modalOverlay} onClick={closeModal}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <h2>{editingService ? 'Edit Service' : 'Add Service'}</h2>
            
            <div className={styles.formGrid}>
              <div className={styles.field}>
                <label>Name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  placeholder="Plex"
                />
              </div>

              <div className={styles.field}>
                <label>URL *</label>
                <input
                  type="url"
                  value={form.url}
                  onChange={e => setForm({ ...form, url: e.target.value })}
                  placeholder="http://192.168.1.100:32400"
                />
              </div>

              <div className={styles.field + ' ' + styles.fullWidth}>
                <label>Description</label>
                <input
                  type="text"
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  placeholder="Media server"
                />
              </div>

              <div className={styles.field}>
                <label>Category</label>
                <select
                  value={form.category}
                  onChange={e => setForm({ ...form, category: e.target.value })}
                >
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div className={styles.field}>
                <label>Icon (Selfh.st)</label>
                <div className={styles.iconPicker}>
                  <input
                    type="text"
                    value={iconSearch}
                    onChange={e => setIconSearch(e.target.value)}
                    placeholder="Search icons..."
                  />
                  {form.iconSlug && (
                    <div className={styles.selectedIcon}>
                      <img src={getIconUrl(form.iconSlug) || ''} alt="" />
                      <span>{form.iconSlug}</span>
                      <button onClick={() => setForm({ ...form, iconSlug: '' })}>×</button>
                    </div>
                  )}
                  {iconResults.length > 0 && (
                    <div className={styles.iconResults}>
                      {iconResults.map(icon => (
                        <button key={icon.slug} onClick={() => selectIcon(icon)} className={styles.iconOption}>
                          <img src={icon.pngUrl} alt="" />
                          <span>{icon.slug}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  {iconSearchLoading && <div className={styles.iconLoading}>Searching...</div>}
                </div>
              </div>

              <div className={styles.field + ' ' + styles.fullWidth}>
                <label>Custom Icon URL (optional)</label>
                <input
                  type="url"
                  value={form.iconUrl}
                  onChange={e => setForm({ ...form, iconUrl: e.target.value, iconSlug: '' })}
                  placeholder="https://example.com/icon.png"
                />
              </div>

              <div className={styles.checkboxGroup}>
                <label className={styles.checkbox}>
                  <input
                    type="checkbox"
                    checked={form.isPublic}
                    onChange={e => setForm({ ...form, isPublic: e.target.checked })}
                  />
                  <span>Public (visible without login)</span>
                </label>
                <label className={styles.checkbox}>
                  <input
                    type="checkbox"
                    checked={form.isEnabled}
                    onChange={e => setForm({ ...form, isEnabled: e.target.checked })}
                  />
                  <span>Enabled</span>
                </label>
              </div>
            </div>

            <div className={styles.modalActions}>
              <button className={styles.cancelBtn} onClick={closeModal}>Cancel</button>
              <button className={styles.saveBtn} onClick={handleSave} disabled={saving || !form.name || !form.url}>
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
