'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Navbar from '@/components/Navbar';
import RichTextEditor from '@/components/RichTextEditor';
import { supabase, isMocked } from '@/lib/supabase';
import {
  StickyNote, Plus, Search, Trash2, Save, Link2, Calendar,
  FileText, ChevronRight, Loader2, AlertCircle, Check, X,
  BookOpen, Clock, ArrowLeft
} from 'lucide-react';
import Link from 'next/link';

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatRelative(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const now = new Date();
  const diff = Math.floor((now - d) / 1000);
  if (diff < 60) return 'Hace un momento';
  if (diff < 3600) return `Hace ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `Hace ${Math.floor(diff / 3600)}h`;
  if (diff < 86400 * 7) return `Hace ${Math.floor(diff / 86400)} días`;
  return formatDate(dateStr);
}

// Extrae texto plano del HTML para el preview
function htmlToPlainText(html) {
  if (!html) return '';
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 120);
}

function NotasPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [currentUser, setCurrentUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [notes, setNotes] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [notesLoading, setNotesLoading] = useState(true);

  const [selectedNote, setSelectedNote] = useState(null);
  const [isCreating, setIsCreating] = useState(false);

  // Formulario de edición
  const [formTitle, setFormTitle] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formDocumentId, setFormDocumentId] = useState('');

  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null); // 'saved' | 'error' | null
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterDocId, setFilterDocId] = useState('');

  // Auto-save timer
  const autoSaveRef = useRef(null);

  // ─── Auth ────────────────────────────────────────────────────────────────
  useEffect(() => {
    async function checkAuth() {
      if (isMocked) {
        const saved = localStorage.getItem('simulated_user');
        if (saved) {
          setCurrentUser(JSON.parse(saved));
        }
        setAuthLoading(false);
        return;
      }
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setCurrentUser({ id: session.user.id, email: session.user.email });
        }
      } catch (e) {
        // offline
      }
      setAuthLoading(false);
    }
    checkAuth();
  }, []);

  // ─── Load documents list for the selector ─────────────────────────────
  useEffect(() => {
    async function loadDocs() {
      try {
        const { data } = await supabase
          .from('documents')
          .select('id, title')
          .eq('is_active', true)
          .order('title');
        setDocuments(data || []);
      } catch (e) { /* offline */ }
    }
    loadDocs();
  }, []);

  // ─── Load notes ───────────────────────────────────────────────────────
  const loadNotes = useCallback(async () => {
    setNotesLoading(true);
    try {
      const { data, error } = await supabase
        .from('notes')
        .select('*, documents(id, title)')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setNotes(data || []);
    } catch (e) {
      setNotes([]);
    } finally {
      setNotesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && currentUser) {
      loadNotes();
    } else if (!authLoading && !currentUser) {
      setNotesLoading(false);
    }
  }, [authLoading, currentUser, loadNotes]);

  // ─── Handle URL params to pre-fill form ──────────────────────────────
  useEffect(() => {
    const editId = searchParams.get('edit_id');
    const docId = searchParams.get('document_id');
    if (editId && notes.length > 0) {
      const note = notes.find(n => n.id === editId);
      if (note) openNote(note);
    } else if (docId) {
      handleNewNote(docId);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, notes.length]);

  // ─── Form helpers ─────────────────────────────────────────────────────
  const openNote = (note) => {
    setSelectedNote(note);
    setFormTitle(note.title);
    setFormContent(note.content);
    setFormDocumentId(note.document_id || '');
    setIsCreating(false);
    setSaveStatus(null);
    setShowDeleteConfirm(false);
  };

  const handleNewNote = (preDocId = '') => {
    setSelectedNote(null);
    setFormTitle('');
    setFormContent('');
    setFormDocumentId(preDocId);
    setIsCreating(true);
    setSaveStatus(null);
    setShowDeleteConfirm(false);
  };

  const clearEditor = () => {
    setSelectedNote(null);
    setIsCreating(false);
    setFormTitle('');
    setFormContent('');
    setFormDocumentId('');
    setSaveStatus(null);
    setShowDeleteConfirm(false);
  };

  // ─── Save ─────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!formTitle.trim()) return;
    setIsSaving(true);
    setSaveStatus(null);

    try {
      const payload = {
        title: formTitle.trim(),
        content: formContent,
        document_id: formDocumentId || null,
      };

      if (isMocked) {
        // Simulate save with localStorage for mock mode
        const mockNotes = JSON.parse(localStorage.getItem('mock_notes') || '[]');
        if (isCreating) {
          const newNote = {
            ...payload,
            id: crypto.randomUUID(),
            user_id: currentUser.email,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            documents: documents.find(d => d.id === formDocumentId) || null
          };
          mockNotes.unshift(newNote);
          localStorage.setItem('mock_notes', JSON.stringify(mockNotes));
          setNotes(mockNotes);
          setSelectedNote(newNote);
          setIsCreating(false);
        } else {
          const idx = mockNotes.findIndex(n => n.id === selectedNote.id);
          if (idx >= 0) {
            mockNotes[idx] = {
              ...mockNotes[idx],
              ...payload,
              updated_at: new Date().toISOString(),
              documents: documents.find(d => d.id === formDocumentId) || null
            };
            localStorage.setItem('mock_notes', JSON.stringify(mockNotes));
            setNotes(mockNotes);
            setSelectedNote(mockNotes[idx]);
          }
        }
        setSaveStatus('saved');
        return;
      }

      if (isCreating) {
        const { data, error } = await supabase
          .from('notes')
          .insert(payload)
          .select('*, documents(id, title)')
          .single();
        if (error) throw error;
        setNotes(prev => [data, ...prev]);
        setSelectedNote(data);
        setIsCreating(false);
      } else {
        const { data, error } = await supabase
          .from('notes')
          .update(payload)
          .eq('id', selectedNote.id)
          .select('*, documents(id, title)')
          .single();
        if (error) throw error;
        setNotes(prev => prev.map(n => n.id === data.id ? data : n));
        setSelectedNote(data);
      }
      setSaveStatus('saved');
    } catch (err) {
      console.error('Error saving note:', err);
      setSaveStatus('error');
    } finally {
      setIsSaving(false);
      setTimeout(() => setSaveStatus(null), 3000);
    }
  };

  // ─── Delete ───────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!selectedNote) return;
    setIsDeleting(true);
    try {
      if (isMocked) {
        const mockNotes = JSON.parse(localStorage.getItem('mock_notes') || '[]');
        const updated = mockNotes.filter(n => n.id !== selectedNote.id);
        localStorage.setItem('mock_notes', JSON.stringify(updated));
        setNotes(updated);
        clearEditor();
        return;
      }
      const { error } = await supabase
        .from('notes')
        .delete()
        .eq('id', selectedNote.id);
      if (error) throw error;
      setNotes(prev => prev.filter(n => n.id !== selectedNote.id));
      clearEditor();
    } catch (err) {
      console.error('Error deleting note:', err);
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  // ─── Filtered notes ───────────────────────────────────────────────────
  const normalize = (s) =>
    (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  const filteredNotes = notes.filter(n => {
    const matchSearch = !searchQuery || normalize(n.title).includes(normalize(searchQuery));
    const matchDoc = !filterDocId || n.document_id === filterDocId;
    return matchSearch && matchDoc;
  });

  // ─── Render: No user ──────────────────────────────────────────────────
  if (!authLoading && !currentUser) {
    return (
      <div className="min-h-screen bg-[#f4f4f5] dark:bg-zinc-950 flex flex-col">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center gap-6 p-8 text-center">
          <div className="h-16 w-16 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center shadow-sm">
            <StickyNote className="h-8 w-8 text-zinc-400" />
          </div>
          <div>
            <h1 className="text-xl font-black text-zinc-900 dark:text-white mb-2">
              Mis Notas
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-xs leading-relaxed">
              Debes iniciar sesión para acceder a tus notas personales vinculadas a convenios.
            </p>
          </div>
          <Link
            href="/login"
            className="flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-bold transition-colors shadow-lg shadow-red-600/20"
          >
            Iniciar Sesión
          </Link>
        </div>
      </div>
    );
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#f4f4f5] dark:bg-zinc-950 flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-red-600" />
        </div>
      </div>
    );
  }

  const hasEditor = isCreating || selectedNote;

  return (
    <div className="min-h-screen bg-[#f4f4f5] dark:bg-zinc-950 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-5 sm:px-6 lg:px-8 flex flex-col gap-4">

        {/* Page header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm">
              <StickyNote className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <h1 className="text-lg font-black text-zinc-900 dark:text-white">Mis Notas</h1>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {notes.length} {notes.length === 1 ? 'nota guardada' : 'notas guardadas'}
              </p>
            </div>
          </div>
          <button
            onClick={() => handleNewNote()}
            className="flex items-center gap-1.5 px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-colors shadow-md shadow-red-600/20"
          >
            <Plus className="h-4 w-4" />
            Nueva Nota
          </button>
        </div>

        {/* Two-column layout */}
        <div className="flex gap-4 flex-1 min-h-0" style={{ height: 'calc(100vh - 200px)' }}>

          {/* ── LEFT SIDEBAR ─────────────────────────────────────────── */}
          <div className="w-80 flex-shrink-0 flex flex-col gap-3 min-h-0">

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar notas..."
                className="w-full pl-8 pr-3 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/10 transition-all"
              />
            </div>

            {/* Filter by document */}
            <select
              value={filterDocId}
              onChange={(e) => setFilterDocId(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 outline-none focus:border-red-500 transition-all"
            >
              <option value="">Todos los convenios</option>
              {documents.map(d => (
                <option key={d.id} value={d.id}>{d.title}</option>
              ))}
            </select>

            {/* Notes list */}
            <div className="flex-1 overflow-y-auto space-y-2 min-h-0 pr-0.5">
              {notesLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-zinc-400" />
                </div>
              ) : filteredNotes.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                  <StickyNote className="h-8 w-8 text-zinc-200 dark:text-zinc-700 mb-3" />
                  <p className="text-xs font-bold text-zinc-500 dark:text-zinc-400">
                    {searchQuery || filterDocId ? 'Sin resultados' : 'Sin notas aún'}
                  </p>
                  {!searchQuery && !filterDocId && (
                    <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-1">
                      Crea tu primera nota personal
                    </p>
                  )}
                </div>
              ) : (
                filteredNotes.map(note => {
                  const isActive = (selectedNote?.id === note.id) || false;
                  return (
                    <button
                      key={note.id}
                      onClick={() => openNote(note)}
                      className={`w-full text-left rounded-xl border p-3 transition-all group ${
                        isActive
                          ? 'border-red-200 dark:border-red-900/40 bg-red-50/60 dark:bg-red-950/10'
                          : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-700'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-xs font-bold leading-tight truncate flex-1 ${
                          isActive ? 'text-red-700 dark:text-red-400' : 'text-zinc-900 dark:text-zinc-100'
                        }`}>
                          {note.title}
                        </p>
                        <ChevronRight className={`h-3.5 w-3.5 flex-shrink-0 mt-0.5 transition-colors ${
                          isActive ? 'text-red-400' : 'text-zinc-300 dark:text-zinc-700 group-hover:text-zinc-500'
                        }`} />
                      </div>

                      {note.documents?.title && (
                        <div className="flex items-center gap-1 mt-1.5">
                          <Link2 className="h-3 w-3 text-zinc-400 flex-shrink-0" />
                          <span className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate">
                            {note.documents.title}
                          </span>
                        </div>
                      )}

                      <p className="text-[10px] text-zinc-400 dark:text-zinc-600 mt-1.5 line-clamp-2 leading-relaxed">
                        {htmlToPlainText(note.content) || 'Nota vacía'}
                      </p>

                      <div className="flex items-center gap-1 mt-2">
                        <Clock className="h-3 w-3 text-zinc-300 dark:text-zinc-700" />
                        <span className="text-[10px] text-zinc-400 dark:text-zinc-600">
                          {formatRelative(note.updated_at)}
                        </span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* ── RIGHT EDITOR PANEL ───────────────────────────────────── */}
          <div className="flex-1 min-w-0 flex flex-col gap-3">
            {!hasEditor ? (
              /* Empty state */
              <div className="flex-1 flex flex-col items-center justify-center gap-4 bg-white dark:bg-zinc-900 rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800">
                <div className="h-14 w-14 rounded-2xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center">
                  <StickyNote className="h-7 w-7 text-zinc-300 dark:text-zinc-600" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-bold text-zinc-800 dark:text-zinc-200">Selecciona una nota</p>
                  <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">o crea una nueva para comenzar</p>
                </div>
                <button
                  onClick={() => handleNewNote()}
                  className="flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Nueva Nota
                </button>
              </div>
            ) : (
              /* Editor */
              <div className="flex-1 flex flex-col gap-3 min-h-0">

                {/* Editor top bar */}
                <div className="flex items-center justify-between bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 flex-shrink-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <button
                      onClick={clearEditor}
                      className="p-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 transition-colors flex-shrink-0"
                      title="Cerrar"
                    >
                      <X className="h-4 w-4" />
                    </button>
                    <span className="text-xs text-zinc-400">
                      {isCreating ? 'Nueva nota' : `Editando: ${selectedNote?.title}`}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {/* Save status badge */}
                    {saveStatus === 'saved' && (
                      <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                        <Check className="h-3.5 w-3.5" />
                        Guardado
                      </span>
                    )}
                    {saveStatus === 'error' && (
                      <span className="flex items-center gap-1 text-[11px] font-bold text-red-600 dark:text-red-400">
                        <AlertCircle className="h-3.5 w-3.5" />
                        Error al guardar
                      </span>
                    )}

                    {/* Delete */}
                    {selectedNote && !isCreating && (
                      showDeleteConfirm ? (
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] text-zinc-500 dark:text-zinc-400">¿Eliminar?</span>
                          <button
                            onClick={handleDelete}
                            disabled={isDeleting}
                            className="px-2.5 py-1 text-[11px] font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
                          >
                            {isDeleting ? 'Eliminando...' : 'Sí, eliminar'}
                          </button>
                          <button
                            onClick={() => setShowDeleteConfirm(false)}
                            className="px-2.5 py-1 text-[11px] font-bold border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                          >
                            Cancelar
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setShowDeleteConfirm(true)}
                          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-zinc-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-800 rounded-lg transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Eliminar
                        </button>
                      )
                    )}

                    {/* Save button */}
                    <button
                      onClick={handleSave}
                      disabled={isSaving || !formTitle.trim()}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 disabled:bg-zinc-400 text-white rounded-lg text-xs font-bold transition-colors"
                    >
                      {isSaving ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Save className="h-3.5 w-3.5" />
                      )}
                      {isSaving ? 'Guardando...' : 'Guardar'}
                    </button>
                  </div>
                </div>

                {/* Title input */}
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="Título de la nota..."
                  className="w-full px-4 py-3 text-lg font-black text-zinc-900 dark:text-white bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/10 transition-all placeholder:font-normal placeholder:text-zinc-400 flex-shrink-0"
                />

                {/* Document link selector */}
                <div className="flex items-center gap-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 flex-shrink-0">
                  <Link2 className="h-4 w-4 text-zinc-400 flex-shrink-0" />
                  <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 flex-shrink-0">Convenio:</span>
                  <select
                    value={formDocumentId}
                    onChange={(e) => setFormDocumentId(e.target.value)}
                    className="flex-1 text-xs text-zinc-700 dark:text-zinc-300 bg-transparent outline-none focus:ring-0 border-0"
                  >
                    <option value="">Sin convenio asociado</option>
                    {documents.map(d => (
                      <option key={d.id} value={d.id}>{d.title}</option>
                    ))}
                  </select>
                  {formDocumentId && (
                    <Link
                      href={`/documentos/${formDocumentId}`}
                      target="_blank"
                      className="flex-shrink-0 text-xs text-red-600 hover:underline dark:text-red-400"
                    >
                      Ver →
                    </Link>
                  )}
                </div>

                {/* Rich text editor */}
                <div className="flex-1 overflow-hidden">
                  <RichTextEditor
                    value={formContent}
                    onChange={setFormContent}
                    placeholder="Escribe aquí tu nota. Usa la barra de herramientas para dar formato al texto..."
                  />
                </div>

                {/* Bottom meta info */}
                {selectedNote && !isCreating && (
                  <div className="flex items-center gap-4 text-[11px] text-zinc-400 dark:text-zinc-600 flex-shrink-0">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Creada {formatDate(selectedNote.created_at)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Modificada {formatRelative(selectedNote.updated_at)}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default function NotasPage() {
  return (
    <React.Suspense fallback={
      <div className="min-h-screen bg-[#f4f4f5] dark:bg-zinc-950 flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-red-600" />
        </div>
      </div>
    }>
      <NotasPageContent />
    </React.Suspense>
  );
}
