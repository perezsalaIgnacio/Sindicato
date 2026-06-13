'use client';

import React, { useState } from 'react';
import { Download, ExternalLink, RefreshCw, ZoomIn, ZoomOut, Maximize } from 'lucide-react';

export default function PdfViewer({ fileUrl, versionName, title }) {
  const [loading, setLoading] = useState(false);

  // Determinar si la URL es un PDF real o un marcador de posición de imagen (ej. de Unsplash)
  const isImage = fileUrl && (
    fileUrl.includes('.png') || 
    fileUrl.includes('.jpg') || 
    fileUrl.includes('.jpeg') || 
    fileUrl.includes('images.unsplash.com')
  );

  // Si es una URL externa (por ejemplo, del BOE), la enviamos a través de nuestro proxy de API
  // local para evitar los encabezados X-Frame-Options: SAMEORIGIN o CSP del BOE que bloquean los iframes.
  const isExternalUrl = fileUrl && fileUrl.startsWith('http') && 
    !fileUrl.includes('localhost') && !fileUrl.includes('127.0.0.1') && !fileUrl.includes('blob:');
  
  const displayUrl = isExternalUrl 
    ? `/api/pdf-proxy?url=${encodeURIComponent(fileUrl)}` 
    : fileUrl;

  return (
    <div className="flex flex-col h-full bg-zinc-100 dark:bg-zinc-950 rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 shadow-inner">
      {/* Barra de Herramientas del Visor */}
      <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-3 bg-white border-b border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800">
        <div>
          <h2 className="text-sm font-bold text-zinc-900 dark:text-white truncate max-w-xs md:max-w-md">
            {title}
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Mostrando: <span className="font-semibold text-red-600 dark:text-red-400">{versionName}</span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Botones de Utilidades */}
          <a
            href={fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-zinc-700 bg-zinc-100 hover:bg-zinc-200 rounded-lg dark:text-zinc-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 transition-colors"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Ver BOE Original</span>
          </a>

          <a
            href={fileUrl}
            download
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-sm transition-colors"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Descargar PDF</span>
          </a>
        </div>
      </div>

      {/* Contenedor del PDF/Iframe */}
      <div className="flex-1 relative min-h-[500px] bg-zinc-200 dark:bg-zinc-900 flex items-center justify-center p-4">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-zinc-100/80 dark:bg-zinc-900/80 z-10">
            <div className="flex flex-col items-center gap-2">
              <RefreshCw className="h-8 w-8 animate-spin text-red-600" />
              <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">Cargando PDF...</span>
            </div>
          </div>
        )}

        {isImage ? (
          /* Renderizar marcador de posición de imagen */
          <div className="relative max-w-2xl w-full h-full min-h-[400px] border border-zinc-300 bg-white shadow-lg rounded-lg overflow-hidden dark:bg-zinc-800 dark:border-zinc-700 flex flex-col items-center justify-center p-8 text-center">
            <img 
              src={fileUrl} 
              alt="Document page mockup" 
              className="absolute inset-0 w-full h-full object-cover opacity-10 pointer-events-none" 
            />
            <div className="z-10 flex flex-col items-center gap-4">
              <div className="p-4 bg-red-50 dark:bg-red-950/20 text-red-600 rounded-full">
                <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-zinc-800 dark:text-zinc-200">Vista Previa Simulación</h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 max-w-md">
                Esta versión del documento se encuentra cargada correctamente en el sistema. Puedes consultar el archivo simulado a continuación o descargarlo utilizando el botón superior.
              </p>
              <a 
                href={fileUrl}
                target="_blank"
                className="mt-2 text-sm font-semibold text-red-600 dark:text-red-400 hover:underline"
              >
                Abrir enlace de recurso externo &rarr;
              </a>
            </div>
          </div>
        ) : (
          /* Renderizar visor PDF nativo a través del proxy o de forma directa si es local */
          <div className="w-full h-full min-h-[500px] rounded-xl overflow-hidden border border-zinc-300 bg-white shadow-xl dark:border-zinc-800 dark:bg-zinc-950">
            <object
              data={displayUrl}
              type="application/pdf"
              className="w-full h-full min-h-[500px]"
            >
              <iframe
                src={displayUrl}
                className="w-full h-full min-h-[500px]"
                frameBorder="0"
              >
                <div className="p-6 text-center">
                  <p className="text-sm text-zinc-700 dark:text-zinc-300">
                    Tu navegador no puede visualizar este PDF integrado.
                  </p>
                  <a href={fileUrl} className="text-red-600 hover:underline text-sm font-semibold mt-2 inline-block">
                    Haz clic aquí para descargarlo.
                  </a>
                </div>
              </iframe>
            </object>
          </div>
        )}
      </div>
    </div>
  );
}
