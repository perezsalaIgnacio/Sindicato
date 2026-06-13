'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

/**
 * Reusable form for crear/editar un convenio (documento + versión).
 * Se usa tanto en el panel admin como en la página /admin/nuevo-convenio.
 * Usa Supabase real siempre.
 */
export default function ConvenioForm({ onSuccess }) {
  const [documents, setDocuments] = useState([]);
  const [sectors, setSectors] = useState([]);
  const [scopes, setScopes] = useState([]);

  const [isNewDocument, setIsNewDocument] = useState(false);
  const [selectedDocId, setSelectedDocId] = useState('');
  const [docTitle, setDocTitle] = useState('');
  const [docDescription, setDocDescription] = useState('');
  const [docSectorId, setDocSectorId] = useState('');
  const [docScopeId, setDocScopeId] = useState('');
  const [versionName, setVersionName] = useState('');
  const [status, setStatus] = useState('vigente');
  const [publishedAt, setPublishedAt] = useState('');
  const [effectiveFrom, setEffectiveFrom] = useState('');
  const [pdfFile, setPdfFile] = useState(null);
  const [pdfUrl, setPdfUrl] = useState('');
  const [useExternalUrl, setUseExternalUrl] = useState(false);
  const [isCurrent, setIsCurrent] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  useEffect(() => {
    const fetchData = async () => {
      const [{ data: docs }, { data: secs }, { data: scps }] = await Promise.all([
        supabase.from('documents').select('id, title').order('title'),
        supabase.from('sectors').select('id, name').order('name'),
        supabase.from('geographic_scopes').select('id, type, region_name, province_name').order('type'),
      ]);
      setDocuments(docs || []);
      setSectors(secs || []);
      setScopes(scps || []);
    };
    fetchData();
  }, []);

  const submitForm = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage({ text: '', type: '' });
    try {
      let documentId = selectedDocId;

      if (isNewDocument) {
        const { data: doc, error: docErr } = await supabase
          .from('documents')
          .insert({
            title: docTitle,
            description: docDescription,
            sector_id: docSectorId || null,
            scope_id: docScopeId || null,
          })
          .select('id')
          .single();
        if (docErr) throw docErr;
        documentId = doc.id;
      }

      let filePath = '';
      if (!useExternalUrl && pdfFile) {
        const fileName = `${Date.now()}_${pdfFile.name}`;
        const { data: upload, error: uploadErr } = await supabase.storage
          .from('documents')
          .upload(fileName, pdfFile);
        if (uploadErr) throw uploadErr;
        filePath = upload.path;
      } else if (useExternalUrl) {
        filePath = pdfUrl;
      }

      const { error: verErr } = await supabase.from('document_versions').insert({
        document_id: documentId,
        version_name: versionName,
        file_path: filePath,
        published_at: publishedAt || null,
        effective_from: effectiveFrom,
        status,
        is_current: isCurrent,
      });
      if (verErr) throw verErr;

      setMessage({ text: '✅ Convenio publicado correctamente', type: 'success' });
      setTimeout(() => { if (onSuccess) onSuccess(); }, 1200);
    } catch (err) {
      console.error(err);
      setMessage({ text: '❌ Error: ' + err.message, type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={submitForm} className="space-y-6">
      {message.text && (
        <div className={`px-4 py-3 rounded-xl text-sm font-medium ${
          message.type === 'success'
            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
            : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {message.text}
        </div>
      )}

      {/* Sección 1: Documento */}
      <div className="bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm">
        <h2 className="text-base font-bold text-zinc-900 dark:text-white mb-4">1. Selección de Documento</h2>
        <div className="flex gap-2 mb-4 p-1 bg-zinc-100 dark:bg-zinc-800 rounded-xl w-fit">
          <button type="button" onClick={() => setIsNewDocument(false)}
            className={`px-4 py-1.5 text-sm font-semibold rounded-lg transition-colors ${!isNewDocument ? 'bg-white dark:bg-zinc-700 shadow text-zinc-900 dark:text-white' : 'text-zinc-500 hover:text-zinc-800'}`}>
            Existente
          </button>
          <button type="button" onClick={() => setIsNewDocument(true)}
            className={`px-4 py-1.5 text-sm font-semibold rounded-lg transition-colors ${isNewDocument ? 'bg-white dark:bg-zinc-700 shadow text-zinc-900 dark:text-white' : 'text-zinc-500 hover:text-zinc-800'}`}>
            Crear Nuevo
          </button>
        </div>

        {isNewDocument ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Título *</label>
              <input type="text" required value={docTitle} onChange={(e) => setDocTitle(e.target.value)}
                placeholder="Ej: Convenio Colectivo de Hostelería de Madrid"
                className="w-full px-3 py-2 border border-zinc-200 dark:border-zinc-700 rounded-xl bg-zinc-50 dark:bg-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Descripción</label>
              <textarea rows={3} value={docDescription} onChange={(e) => setDocDescription(e.target.value)}
                className="w-full px-3 py-2 border border-zinc-200 dark:border-zinc-700 rounded-xl bg-zinc-50 dark:bg-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Sector Económico *</label>
                <select required value={docSectorId} onChange={(e) => setDocSectorId(e.target.value)}
                  className="w-full px-3 py-2 border border-zinc-200 dark:border-zinc-700 rounded-xl bg-zinc-50 dark:bg-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-red-500">
                  <option value="">Seleccione sector</option>
                  {sectors.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Ámbito Geográfico *</label>
                <select required value={docScopeId} onChange={(e) => setDocScopeId(e.target.value)}
                  className="w-full px-3 py-2 border border-zinc-200 dark:border-zinc-700 rounded-xl bg-zinc-50 dark:bg-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-red-500">
                  <option value="">Seleccione ámbito</option>
                  {scopes.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.type}{s.region_name ? ` – ${s.region_name}` : ''}{s.province_name ? ` – ${s.province_name}` : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        ) : (
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Seleccionar Documento</label>
            <select value={selectedDocId} onChange={(e) => setSelectedDocId(e.target.value)}
              className="w-full px-3 py-2 border border-zinc-200 dark:border-zinc-700 rounded-xl bg-zinc-50 dark:bg-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-red-500">
              <option value="">-- Seleccione un documento --</option>
              {documents.map((d) => <option key={d.id} value={d.id}>{d.title}</option>)}
            </select>
          </div>
        )}
      </div>

      {/* Sección 2: Versión */}
      <div className="bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm space-y-4">
        <h2 className="text-base font-bold text-zinc-900 dark:text-white">2. Nueva Versión y Archivo</h2>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Nombre de la Versión *</label>
            <input type="text" required placeholder="Ej: Versión 2025" value={versionName} onChange={(e) => setVersionName(e.target.value)}
              className="w-full px-3 py-2 border border-zinc-200 dark:border-zinc-700 rounded-xl bg-zinc-50 dark:bg-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Estado</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)}
              className="w-full px-3 py-2 border border-zinc-200 dark:border-zinc-700 rounded-xl bg-zinc-50 dark:bg-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-red-500">
              <option value="vigente">Vigente</option>
              <option value="no_vigente">No vigente</option>
              <option value="derogado">Derogado</option>
              <option value="ultraactividad">Ultraactividad</option>
              <option value="archivado">Archivado</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Fecha Publicación BOE/BOCM</label>
            <input type="date" value={publishedAt} onChange={(e) => setPublishedAt(e.target.value)}
              className="w-full px-3 py-2 border border-zinc-200 dark:border-zinc-700 rounded-xl bg-zinc-50 dark:bg-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Fecha Entrada en Vigor *</label>
            <input type="date" required value={effectiveFrom} onChange={(e) => setEffectiveFrom(e.target.value)}
              className="w-full px-3 py-2 border border-zinc-200 dark:border-zinc-700 rounded-xl bg-zinc-50 dark:bg-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
          </div>
        </div>

        {/* PDF origen */}
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">Origen del Archivo PDF</label>
          <div className="flex gap-2 mb-3 p-1 bg-zinc-100 dark:bg-zinc-800 rounded-xl w-fit">
            <button type="button" onClick={() => setUseExternalUrl(false)}
              className={`px-4 py-1.5 text-sm font-semibold rounded-lg transition-colors ${!useExternalUrl ? 'bg-white dark:bg-zinc-700 shadow text-zinc-900 dark:text-white' : 'text-zinc-500 hover:text-zinc-800'}`}>
              Subir Archivo (.pdf)
            </button>
            <button type="button" onClick={() => setUseExternalUrl(true)}
              className={`px-4 py-1.5 text-sm font-semibold rounded-lg transition-colors ${useExternalUrl ? 'bg-white dark:bg-zinc-700 shadow text-zinc-900 dark:text-white' : 'text-zinc-500 hover:text-zinc-800'}`}>
              Enlazar URL Externa (ej: BOE)
            </button>
          </div>
          {useExternalUrl ? (
            <input type="url" placeholder="https://www.boe.es/..." value={pdfUrl} onChange={(e) => setPdfUrl(e.target.value)}
              className="w-full px-3 py-2 border border-zinc-200 dark:border-zinc-700 rounded-xl bg-zinc-50 dark:bg-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
          ) : (
            <div className="border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-xl p-6 text-center">
              <p className="text-sm text-zinc-500 mb-2">PDF de hasta 15 MB</p>
              <input type="file" accept="application/pdf" onChange={(e) => setPdfFile(e.target.files[0])} className="text-sm" />
            </div>
          )}
        </div>

        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={isCurrent} onChange={(e) => setIsCurrent(e.target.checked)}
            className="w-4 h-4 accent-red-600" />
          <span className="text-sm text-zinc-700 dark:text-zinc-300">Establecer esta versión como la vigente por defecto en consultas</span>
        </label>
      </div>

      <button type="submit" disabled={submitting}
        className="w-full py-3 bg-red-600 text-white font-semibold rounded-xl hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
        {submitting ? 'Publicando...' : 'Publicar Documento / Versión'}
      </button>
    </form>
  );
}
