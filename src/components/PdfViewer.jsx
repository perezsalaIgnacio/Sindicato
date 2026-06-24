'use client';

import React from 'react';
import { Download, ExternalLink, RefreshCw, FileText, AlertCircle } from 'lucide-react';

export default function PdfViewer({ fileUrl, versionName, title }) {
  const isImage = fileUrl && (
    fileUrl.includes('.png') ||
    fileUrl.includes('.jpg') ||
    fileUrl.includes('.jpeg') ||
    fileUrl.includes('images.unsplash.com')
  );

  const isExternalUrl = fileUrl &&
    fileUrl.startsWith('http') &&
    !fileUrl.includes('localhost') &&
    !fileUrl.includes('127.0.0.1') &&
    !fileUrl.includes('blob:');

  const displayUrl = isExternalUrl
    ? `/api/pdf-proxy?url=${encodeURIComponent(fileUrl)}`
    : fileUrl;

  return (
    <div className="flex flex-col h-full bg-white dark:bg-zinc-900 rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 px-4 py-3 bg-white dark:bg-zinc-900 border-b border-zinc-100 dark:border-zinc-800 flex-shrink-0">
        <div className="min-w-0">
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Versión: <span className="font-bold text-zinc-800 dark:text-zinc-200">{versionName}</span>
          </p>
        </div>
        {fileUrl && (
          <div className="flex items-center gap-2 flex-shrink-0">
            <a
              href={fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-zinc-600 dark:text-zinc-300 bg-zinc-50 dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700 rounded-lg transition-colors"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">BOE Original</span>
            </a>
            <a
              href={fileUrl}
              download
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
            >
              <Download className="h-3.5 w-3.5" />
              Descargar
            </a>
          </div>
        )}
      </div>

      {/* PDF Content */}
      <div className="flex-1 relative bg-zinc-100 dark:bg-zinc-950 min-h-[500px] flex items-center justify-center">
        {!fileUrl ? (
          <div className="flex flex-col items-center justify-center h-full py-16 px-8 text-center absolute inset-0">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 mb-4">
              <AlertCircle className="h-7 w-7 text-zinc-400" />
            </div>
            <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 mb-1">Sin PDF disponible</h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm leading-relaxed">
              No hay un archivo de documento digitalizado (PDF) disponible en el sistema para esta versión.
            </p>
          </div>
        ) : isImage ? (
          <div className="flex flex-col items-center justify-center h-full py-16 px-8 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 mb-4">
              <FileText className="h-7 w-7 text-zinc-400" />
            </div>
            <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 mb-1">Documento cargado</h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm leading-relaxed mb-4">
              Esta versión está registrada en el sistema. Usa el enlace externo para visualizarla en el BOE o descárgala.
            </p>
            <a
              href={fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-600 dark:text-red-400 hover:underline"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Abrir en el BOE
            </a>
          </div>
        ) : (
          <object
            data={displayUrl}
            type="application/pdf"
            className="w-full h-full min-h-[500px]"
          >
            <iframe
              src={displayUrl}
              className="w-full h-full min-h-[500px] border-0"
            >
              <div className="p-6 text-center">
                <p className="text-sm text-zinc-700 dark:text-zinc-300">
                  Tu navegador no puede mostrar este PDF.{' '}
                  <a href={fileUrl} className="text-red-600 hover:underline font-semibold">
                    Descárgalo aquí.
                  </a>
                </p>
              </div>
            </iframe>
          </object>
        )}
      </div>
    </div>
  );
}
