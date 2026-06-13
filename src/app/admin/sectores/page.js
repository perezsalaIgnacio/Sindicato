'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Plus, Pencil, Trash2 } from 'lucide-react';

export default function SectoresPage() {
  const [sectors, setSectors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', slug: '' });
  const [message, setMessage] = useState({ text: '', type: '' });

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from('sectors').select('*').order('name');
    setSectors(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => { setEditing(null); setForm({ name: '', slug: '' }); setShowModal(true); };
  const openEdit = (s) => { setEditing(s); setForm({ name: s.name, slug: s.slug }); setShowModal(true); };
  const closeModal = () => { setShowModal(false); setEditing(null); };

  const handleSave = async () => {
    let error;
    if (editing) {
      ({ error } = await supabase.from('sectors').update(form).eq('id', editing.id));
    } else {
      ({ error } = await supabase.from('sectors').insert(form));
    }
    if (error) {
      setMessage({ text: 'Error: ' + error.message, type: 'error' });
    } else {
      setMessage({ text: editing ? 'Sector actualizado' : 'Sector creado', type: 'success' });
      closeModal();
      load();
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar este sector?')) return;
    const { error } = await supabase.from('sectors').delete().eq('id', id);
    if (error) { setMessage({ text: 'Error: ' + error.message, type: 'error' }); }
    else { setMessage({ text: 'Sector eliminado', type: 'success' }); load(); }
  };

  return (
    <section className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Sectores Económicos</h1>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-xl hover:bg-red-700 transition-colors"
        >
          <Plus className="h-4 w-4" /> Nuevo Sector
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
                {['Nombre', 'Slug', 'Acciones'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-300">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sectors.length === 0 ? (
                <tr><td colSpan={3} className="px-4 py-8 text-center text-zinc-500">No hay sectores</td></tr>
              ) : sectors.map((s) => (
                <tr key={s.id} className="border-t border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-700/30 transition-colors">
                  <td className="px-4 py-3 text-sm font-medium text-zinc-900 dark:text-zinc-100">{s.name}</td>
                  <td className="px-4 py-3 text-sm text-zinc-500 font-mono">{s.slug}</td>
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
              <h2 className="text-lg font-bold text-zinc-900 dark:text-white">{editing ? 'Editar Sector' : 'Nuevo Sector'}</h2>
              <button onClick={closeModal} className="text-zinc-400 hover:text-zinc-700 text-xl">✕</button>
            </div>
            <label className="block text-sm font-medium mb-1 text-zinc-700 dark:text-zinc-300">Nombre *</label>
            <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full mb-4 px-3 py-2 border border-zinc-200 dark:border-zinc-600 rounded-xl bg-zinc-50 dark:bg-zinc-700 text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
            <label className="block text-sm font-medium mb-1 text-zinc-700 dark:text-zinc-300">Slug *</label>
            <input type="text" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
              className="w-full mb-6 px-3 py-2 border border-zinc-200 dark:border-zinc-600 rounded-xl bg-zinc-50 dark:bg-zinc-700 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-red-500" />
            <div className="flex justify-end gap-3">
              <button onClick={closeModal} className="px-4 py-2 text-sm bg-zinc-100 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-xl hover:bg-zinc-200 transition-colors">Cancelar</button>
              <button onClick={handleSave} className="px-4 py-2 text-sm bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors">{editing ? 'Guardar cambios' : 'Crear'}</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
