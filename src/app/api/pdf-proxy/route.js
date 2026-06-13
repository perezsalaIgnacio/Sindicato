import { NextResponse } from 'next/server';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const pdfUrl = searchParams.get('url');

  if (!pdfUrl) {
    return new NextResponse('Falta el parámetro "url"', { status: 400 });
  }

  try {
    // Usar un User-Agent realista para evitar bloqueos automatizados del BOE u otras webs estatales
    const response = await fetch(pdfUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/pdf,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
      },
    });

    if (!response.ok) {
      throw new Error(`Error al descargar PDF del origen: ${response.status} ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type');
    const isPdf = contentType && contentType.toLowerCase().includes('application/pdf');

    const pdfBuffer = await response.arrayBuffer();

    // Devolver el archivo con las cabeceras de visualización en línea y permitir su incrustación
    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': isPdf ? 'application/pdf' : (contentType || 'application/pdf'),
        'Content-Disposition': 'inline',
        'Cache-Control': 'public, max-age=3600', // Cachear 1 hora para mejorar rendimiento
      },
    });
  } catch (error) {
    console.error('Error en el proxy de PDF:', error);
    return new NextResponse(`Error al cargar el PDF del BOE: ${error.message}`, { status: 500 });
  }
}
