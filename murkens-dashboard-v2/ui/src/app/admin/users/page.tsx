'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import styles from './page.module.css';

interface User {
  id: string;
  email: string;
  username?: string;
  displayName?: string;
  role: 'USER' | 'ADMIN';
  isActive: boolean;
  lastLoginAt?: string;
  createdAt: string;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    email: '',
    username: '',
    displayName: '',
    password: '',
    role: 'USER' as 'USER' | 'ADMIN',
    isActive: true,
  });

  const fetchUsers = useCallback(async () => {
    try {
      const data = await api.getUsers();
      setUsers(data);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const openModal = (user?: User) => {
    if (user) {
      setEditingUser(user);
      setForm({
        email: user.email,
        username: user.username || '',
        displayName: user.displayName || '',
        password: '',
        role: user.role,
        isActive: user.isActive,
      });
    } else {
      setEditingUser(null);
      setForm({
        email: '',
        username: '',
        displayName: '',
        password: '',
        role: 'USER',
        isActive: true,
      });
    }
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingUser(null);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const data: any = {
        email: form.email,
        username: form.username || undefined,
        displayName: form.displayName || undefined,
        role: form.role,
        isActive: form.isActive,
      };

      if (form.password) {
        data.password = form.password;
      }

      if (editingUser) {
        await api.updateUser(editingUser.id, data);
      } else {
        await api.createUser(data);
      }
      closeModal();
      fetchUsers();
    } catch (error: any) {
      alert(error.message || 'Failed to save user');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    try {
      await api.deleteUser(id);
      fetchUsers();
    } catch (error: any) {
      alert(error.message || 'Failed to delete user');
    }
  };

  if (loading) {
    return <div className={styles.loading}><div className="spinner"></div></div>;
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1>Users</h1>
          <p>Manage user accounts</p>
        </div>
        <button className={styles.addBtn} onClick={() => openModal()}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Add User
        </button>
      </header>

      {users.length === 0 ? (
        <div className={styles.empty}>
          <p>No users found.</p>
        </div>
      ) : (
        <div className={styles.usersList}>
          {users.map(user => (
            <div key={user.id} className={styles.userItem}>
              <div className={styles.userAvatar}>
                {(user.displayName || user.email).charAt(0).toUpperCase()}
              </div>
              <div className={styles.userInfo}>
                <h3>{user.displayName || user.username || user.email}</h3>
                <p>{user.email}</p>
                <div className={styles.userMeta}>
                  <span className={`${styles.role} ${styles[user.role.toLowerCase()]}`}>{user.role}</span>
                  {!user.isActive && <span className={styles.inactive}>Inactive</span>}
                  {user.lastLoginAt && (
                    <span className={styles.lastLogin}>
                      Last login: {new Date(user.lastLoginAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
              <div className={styles.userActions}>
                <button className={styles.editBtn} onClick={() => openModal(user)}>
                  Edit
                </button>
                <button className={styles.deleteBtn} onClick={() => handleDelete(user.id)}>
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
            <h2>{editingUser ? 'Edit User' : 'Add User'}</h2>
            
            <div className={styles.formFields}>
              <div className={styles.field}>
                <label>Email *</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                  placeholder="user@example.com"
                />
              </div>

              <div className={styles.field}>
                <label>Username</label>
                <input
                  type="text"
                  value={form.username}
                  onChange={e => setForm({ ...form, username: e.target.value })}
                  placeholder="johndoe"
                />
              </div>

              <div className={styles.field}>
                <label>Display Name</label>
                <input
                  type="text"
                  value={form.displayName}
                  onChange={e => setForm({ ...form, displayName: e.target.value })}
                  placeholder="John Doe"
                />
              </div>

              <div className={styles.field}>
                <label>{editingUser ? 'New Password (leave blank to keep)' : 'Password *'}</label>
                <input
                  type="password"
                  value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  placeholder="••••••••"
                />
              </div>

              <div className={styles.field}>
                <label>Role</label>
                <select
                  value={form.role}
                  onChange={e => setForm({ ...form, role: e.target.value as 'USER' | 'ADMIN' })}
                >
                  <option value="USER">User</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>

              <label className={styles.checkbox}>
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={e => setForm({ ...form, isActive: e.target.checked })}
                />
                <span>Active</span>
              </label>
            </div>

            <div className={styles.modalActions}>
              <button className={styles.cancelBtn} onClick={closeModal}>Cancel</button>
              <button 
                className={styles.saveBtn} 
                onClick={handleSave} 
                disabled={saving || !form.email || (!editingUser && !form.password)}
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
