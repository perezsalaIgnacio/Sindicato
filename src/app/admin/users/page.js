'use client';

import React, { useState, useEffect } from 'react';
import { supabase, isMocked } from '@/lib/supabase';
import { Plus, Pencil, Trash2, UserPlus } from 'lucide-react';

function formatDate(dateStr) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('es-ES');
}

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ text: '', type: '' });

  // Edit modal state
  const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm] = useState({ full_name: '', role: 'usuario' });

  // Create modal state
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ email: '', password: '', full_name: '', role: 'usuario' });
  const [creating, setCreating] = useState(false);

  // ── Load users ──────────────────────────────────────────────────────────────
  const loadUsers = async () => {
    setLoading(true);
    if (isMocked) {
      setUsers([
        { id: 'mock-1', email: 'admin@sindicato.es', full_name: 'Admin Demo', role: 'admin', created_at: new Date().toISOString() },
        { id: 'mock-2', email: 'usuario@sindicato.es', full_name: 'Usuario Demo', role: 'usuario', created_at: new Date().toISOString() },
      ]);
    } else {
      const { data, error } = await supabase
        .from('profiles')
        .select('id,email,full_name,role,created_at')
        .order('created_at', { ascending: false });
      if (!error) setUsers(data || []);
    }
    setLoading(false);
  };

  useEffect(() => { loadUsers(); }, []);

  // ── Edit ────────────────────────────────────────────────────────────────────
  const openEdit = (user) => { setEditingUser(user); setEditForm({ full_name: user.full_name || '', role: user.role }); };
  const closeEdit = () => { setEditingUser(null); };

  const handleSave = async () => {
    if (isMocked) {
      setMessage({ text: 'Usuario actualizado (modo demo)', type: 'success' });
      closeEdit(); return;
    }
    const { error } = await supabase.from('profiles').update(editForm).eq('id', editingUser.id);
    if (error) {
      setMessage({ text: 'Error al guardar: ' + error.message, type: 'error' });
    } else {
      setMessage({ text: 'Usuario actualizado correctamente', type: 'success' });
      closeEdit(); loadUsers();
    }
  };

  // ── Delete ──────────────────────────────────────────────────────────────────
  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar este usuario? Esta acción no se puede deshacer.')) return;
    if (isMocked) { setMessage({ text: 'Usuario eliminado (modo demo)', type: 'success' }); return; }
    const { error } = await supabase.from('profiles').delete().eq('id', id);
    if (error) {
      setMessage({ text: 'Error al eliminar: ' + error.message, type: 'error' });
    } else {
      setMessage({ text: 'Usuario eliminado', type: 'success' }); loadUsers();
    }
  };

  // ── Create ──────────────────────────────────────────────────────────────────
  const openCreate = () => { setCreateForm({ email: '', password: '', full_name: '', role: 'usuario' }); setShowCreate(true); };
  const closeCreate = () => setShowCreate(false);

  const handleCreate = async () => {
    if (!createForm.email || !createForm.password) {
      setMessage({ text: 'Email y contraseña son obligatorios', type: 'error' }); return;
    }
    setCreating(true);
    if (isMocked) {
      setMessage({ text: `Usuario "${createForm.email}" creado (modo demo)`, type: 'success' });
      closeCreate(); setCreating(false); return;
    }
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error desconocido');
      setMessage({ text: `Usuario "${createForm.email}" creado correctamente`, type: 'success' });
      closeCreate();
      loadUsers();
    } catch (err) {
      setMessage({ text: 'Error: ' + err.message, type: 'error' });
    } finally {
      setCreating(false);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <section className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Gestión de Usuarios</h1>
          <p className="text-sm text-zinc-500 mt-0.5">{users.length} usuarios registrados</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white text-sm font-semibold rounded-xl hover:bg-red-700 transition-colors shadow-sm"
        >
          <UserPlus className="h-4 w-4" />
          Nuevo Usuario
        </button>
      </div>

      {/* Alert */}
      {message.text && (
        <div className={`mb-5 px-4 py-3 rounded-xl text-sm font-medium flex items-center justify-between ${
          message.type === 'success'
            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
            : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          <span>{message.text}</span>
          <button onClick={() => setMessage({ text: '', type: '' })} className="ml-4 underline text-xs">Cerrar</button>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="text-center py-16 text-zinc-400">Cargando usuarios...</div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-zinc-200 dark:border-zinc-700 shadow-sm">
          <table className="min-w-full bg-white dark:bg-zinc-800/80">
            <thead className="bg-zinc-50 dark:bg-zinc-900/60 border-b border-zinc-200 dark:border-zinc-700">
              <tr>
                {['Usuario', 'Nombre', 'Rol', 'Alta', 'Acciones'].map((h) => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-700/50">
              {users.length === 0 ? (
                <tr><td colSpan={5} className="px-5 py-10 text-center text-zinc-400">No hay usuarios</td></tr>
              ) : users.map((u) => (
                <tr key={u.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-700/20 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                        {(u.full_name || u.email)[0].toUpperCase()}
                      </div>
                      <span className="text-sm text-zinc-800 dark:text-zinc-200">{u.email}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-sm text-zinc-700 dark:text-zinc-300">
                    {u.full_name || <span className="text-zinc-400 italic">Sin nombre</span>}
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                      u.role === 'admin'
                        ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                        : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300'
                    }`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-sm text-zinc-500">{formatDate(u.created_at)}</td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <button onClick={() => openEdit(u)}
                        className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors" title="Editar">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => handleDelete(u.id)}
                        className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors" title="Eliminar">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Modal: Crear usuario ─────────────────────────────────────────────── */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white dark:bg-zinc-800 rounded-2xl shadow-2xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-lg font-bold text-zinc-900 dark:text-white">Nuevo Usuario</h2>
              <button onClick={closeCreate} className="text-zinc-400 hover:text-zinc-700 dark:hover:text-white text-xl leading-none">✕</button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Email *</label>
                <input type="email" value={createForm.email}
                  onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                  placeholder="usuario@ejemplo.com"
                  className="w-full px-3 py-2 border border-zinc-200 dark:border-zinc-600 rounded-xl bg-zinc-50 dark:bg-zinc-700 text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Contraseña *</label>
                <input type="password" value={createForm.password}
                  onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full px-3 py-2 border border-zinc-200 dark:border-zinc-600 rounded-xl bg-zinc-50 dark:bg-zinc-700 text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Nombre completo</label>
                <input type="text" value={createForm.full_name}
                  onChange={(e) => setCreateForm({ ...createForm, full_name: e.target.value })}
                  placeholder="Ej: María García"
                  className="w-full px-3 py-2 border border-zinc-200 dark:border-zinc-600 rounded-xl bg-zinc-50 dark:bg-zinc-700 text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Rol</label>
                <select value={createForm.role}
                  onChange={(e) => setCreateForm({ ...createForm, role: e.target.value })}
                  className="w-full px-3 py-2 border border-zinc-200 dark:border-zinc-600 rounded-xl bg-zinc-50 dark:bg-zinc-700 text-sm focus:outline-none focus:ring-2 focus:ring-red-500">
                  <option value="usuario">usuario</option>
                  <option value="admin">admin</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button onClick={closeCreate}
                className="px-4 py-2 text-sm bg-zinc-100 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-xl hover:bg-zinc-200 dark:hover:bg-zinc-600 transition-colors">
                Cancelar
              </button>
              <button onClick={handleCreate} disabled={creating}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2">
                {creating ? (
                  <><span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />Creando...</>
                ) : (
                  <><UserPlus className="h-3.5 w-3.5" />Crear usuario</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Editar usuario ────────────────────────────────────────────── */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white dark:bg-zinc-800 rounded-2xl shadow-2xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-lg font-bold text-zinc-900 dark:text-white">Editar Usuario</h2>
              <button onClick={closeEdit} className="text-zinc-400 hover:text-zinc-700 dark:hover:text-white text-xl leading-none">✕</button>
            </div>

            <p className="text-sm text-zinc-500 mb-4">{editingUser.email}</p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Nombre completo</label>
                <input type="text" value={editForm.full_name}
                  onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                  className="w-full px-3 py-2 border border-zinc-200 dark:border-zinc-600 rounded-xl bg-zinc-50 dark:bg-zinc-700 text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Rol</label>
                <select value={editForm.role}
                  onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                  className="w-full px-3 py-2 border border-zinc-200 dark:border-zinc-600 rounded-xl bg-zinc-50 dark:bg-zinc-700 text-sm focus:outline-none focus:ring-2 focus:ring-red-500">
                  <option value="usuario">usuario</option>
                  <option value="admin">admin</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button onClick={closeEdit}
                className="px-4 py-2 text-sm bg-zinc-100 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-xl hover:bg-zinc-200 dark:hover:bg-zinc-600 transition-colors">
                Cancelar
              </button>
              <button onClick={handleSave}
                className="px-4 py-2 text-sm bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors">
                Guardar cambios
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
