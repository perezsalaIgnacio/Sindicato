'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Plus, Pencil, Trash2 } from 'lucide-react';

const TYPES = ['nacional', 'autonomico', 'provincial'];

export default function AmbitosPage() {
  const [scopes, setScopes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ type: 'nacional', region_name: '', province_name: '' });
  const [message, setMessage] = useState({ text: '', type: '' });

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from('geographic_scopes').select('*').order('type');
    setScopes(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => { setEditing(null); setForm({ type: 'nacional', region_name: '', province_name: '' }); setShowModal(true); };
  const openEdit = (s) => { setEditing(s); setForm({ type: s.type, region_name: s.region_name || '', province_name: s.province_name || '' }); setShowModal(true); };
  const closeModal = () => { setShowModal(false); setEditing(null); };

  const handleSave = async () => {
    const payload = {
      type: form.type,
      region_name: form.region_name || null,
      province_name: form.province_name || null,
    };
    let error;
    if (editing) {
      ({ error } = await supabase.from('geographic_scopes').update(payload).eq('id', editing.id));
    } else {
      ({ error } = await supabase.from('geographic_scopes').insert(payload));
    }
    if (error) {
      setMessage({ text: 'Error: ' + error.message, type: 'error' });
    } else {
      setMessage({ text: editing ? 'Ámbito actualizado' : 'Ámbito creado', type: 'success' });
      closeModal();
      load();
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar este ámbito?')) return;
    const { error } = await supabase.from('geographic_scopes').delete().eq('id', id);
    if (error) { setMessage({ text: 'Error: ' + error.message, type: 'error' }); }
    else { setMessage({ text: 'Ámbito eliminado', type: 'success' }); load(); }
  };

  const scopeLabel = (s) => [s.type, s.region_name, s.province_name].filter(Boolean).join(' › ');

  return (
    <section className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Ámbitos Geográficos</h1>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-xl hover:bg-red-700 transition-colors"
        >
          <Plus className="h-4 w-4" /> Nuevo Ámbito
        </button>
      </div>

      {message.text && (
        <div className={`mb-4 px-4 py-3 rounded-xl text-sm font-medium ${message.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
          {message.text}
          <button className="ml-4 underline" onClick={() => setMessage({ text: '', type: '' })}>Cerrar</button>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-zinc-500">Cargando...</div>
      ) : (
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 overflow-hidden shadow-sm">
          <table className="min-w-full bg-white dark:bg-zinc-800/80">
            <thead className="bg-zinc-100 dark:bg-zinc-900/60">
              <tr>
                {['Tipo', 'Comunidad', 'Provincia', 'Acciones'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-300">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {scopes.length === 0 ? (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-zinc-500">No hay ámbitos</td></tr>
              ) : scopes.map((s) => (
                <tr key={s.id} className="border-t border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-700/30 transition-colors">
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${
                      s.type === 'nacional' ? 'bg-blue-100 text-blue-800' :
                      s.type === 'autonomico' ? 'bg-purple-100 text-purple-800' :
                      'bg-orange-100 text-orange-800'
                    }`}>{s.type}</span>
                  </td>
                  <td className="px-4 py-3 text-sm text-zinc-700 dark:text-zinc-300">{s.region_name || '-'}</td>
                  <td className="px-4 py-3 text-sm text-zinc-700 dark:text-zinc-300">{s.province_name || '-'}</td>
                  <td className="px-4 py-3 flex gap-2">
                    <button onClick={() => openEdit(s)} className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"><Pencil className="h-3.5 w-3.5" /></button>
                    <button onClick={() => handleDelete(s.id)} className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors"><Trash2 className="h-3.5 w-3.5" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white dark:bg-zinc-800 rounded-2xl shadow-2xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-lg font-bold text-zinc-900 dark:text-white">{editing ? 'Editar Ámbito' : 'Nuevo Ámbito'}</h2>
              <button onClick={closeModal} className="text-zinc-400 hover:text-zinc-700 text-xl">✕</button>
            </div>
            <label className="block text-sm font-medium mb-1 text-zinc-700 dark:text-zinc-300">Tipo *</label>
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}
              className="w-full mb-4 px-3 py-2 border border-zinc-200 dark:border-zinc-600 rounded-xl bg-zinc-50 dark:bg-zinc-700 text-sm focus:outline-none focus:ring-2 focus:ring-red-500">
              {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            {(form.type === 'autonomico' || form.type === 'provincial') && (
              <>
                <label className="block text-sm font-medium mb-1 text-zinc-700 dark:text-zinc-300">Comunidad Autónoma</label>
                <input type="text" value={form.region_name} onChange={(e) => setForm({ ...form, region_name: e.target.value })}
                  className="w-full mb-4 px-3 py-2 border border-zinc-200 dark:border-zinc-600 rounded-xl bg-zinc-50 dark:bg-zinc-700 text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
              </>
            )}
            {form.type === 'provincial' && (
              <>
                <label className="block text-sm font-medium mb-1 text-zinc-700 dark:text-zinc-300">Provincia</label>
                <input type="text" value={form.province_name} onChange={(e) => setForm({ ...form, province_name: e.target.value })}
                  className="w-full mb-4 px-3 py-2 border border-zinc-200 dark:border-zinc-600 rounded-xl bg-zinc-50 dark:bg-zinc-700 text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
              </>
            )}
            <div className="flex justify-end gap-3 mt-2">
              <button onClick={closeModal} className="px-4 py-2 text-sm bg-zinc-100 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-xl hover:bg-zinc-200 transition-colors">Cancelar</button>
              <button onClick={handleSave} className="px-4 py-2 text-sm bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors">{editing ? 'Guardar cambios' : 'Crear'}</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
