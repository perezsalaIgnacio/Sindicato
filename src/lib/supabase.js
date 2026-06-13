import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Inicialización condicional de Supabase.
// Si las variables de entorno no están configuradas, usamos un mock en memoria
// para que la interfaz sea totalmente funcional e interactiva inmediatamente.
export const isMocked = !supabaseUrl || !supabaseAnonKey;

export const supabase = !isMocked
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// Mock de datos de prueba idéntico al seed de base de datos
const mockSectors = [
  { id: 1, name: 'General / Todos los Sectores', slug: 'general' },
  { id: 2, name: 'Panadería y Pastelería', slug: 'panaderia-pasteleria' },
  { id: 3, name: 'Hostelería y Turismo', slug: 'hosteleria-turismo' },
  { id: 4, name: 'Construcción y Obras Públicas', slug: 'construccion' },
  { id: 5, name: 'Sanidad y Servicios Sanitarios', slug: 'sanidad' }
];

const mockScopes = [
  { id: 1, type: 'nacional', region_name: null, province_name: null },
  { id: 2, type: 'autonomico', region_name: 'Comunidad de Madrid', province_name: null },
  { id: 3, type: 'provincial', region_name: 'Comunidad de Madrid', province_name: 'Madrid' },
  { id: 4, type: 'autonomico', region_name: 'Cataluña', province_name: null },
  { id: 5, type: 'provincial', region_name: 'Cataluña', province_name: 'Barcelona' }
];

const mockDocuments = [
  {
    id: 'doc-1',
    title: 'Estatuto de los Trabajadores',
    description: 'Texto refundido de la Ley del Estatuto de los Trabajadores, norma fundamental que regula las relaciones laborales en España.',
    sector_id: 1,
    scope_id: 1,
    is_active: true,
    created_at: new Date().toISOString()
  },
  {
    id: 'doc-2',
    title: 'Convenio Colectivo de Panadería y Pastelería de la Comunidad de Madrid',
    description: 'Regulación de las condiciones de trabajo para las empresas y trabajadores dedicados a la fabricación, venta y distribución de pan y pastelería en Madrid.',
    sector_id: 2,
    scope_id: 3,
    is_active: true,
    created_at: new Date().toISOString()
  },
  {
    id: 'doc-3',
    title: 'Convenio Colectivo del Sector de Hostelería de la Comunidad de Madrid',
    description: 'Convenio regulador aplicable a hoteles, hostales, pensiones, restaurantes, cafeterías, bares y empresas de catering en Madrid.',
    sector_id: 3,
    scope_id: 3,
    is_active: true,
    created_at: new Date().toISOString()
  }
];

const mockVersions = [
  {
    id: 'ver-1-1',
    document_id: 'doc-1',
    version_name: 'RDL 2/2015 (Versión Original)',
    file_path: 'https://www.boe.es/descargas/pdf/codigo.php?id=002_Codigo_del_Trabajo&modo=2',
    published_at: '2015-10-24',
    effective_from: '2015-10-25',
    status: 'derogado',
    is_current: false,
    file_size: 2541098,
    created_at: new Date().toISOString()
  },
  {
    id: 'ver-1-2',
    document_id: 'doc-1',
    version_name: 'Versión Vigente - Reforma Laboral 2022/2026',
    file_path: 'https://www.boe.es/descargas/pdf/codigo.php?id=002_Codigo_del_Trabajo&modo=2',
    published_at: '2021-12-30',
    effective_from: '2022-01-01',
    status: 'vigente',
    is_current: true,
    file_size: 3124500,
    created_at: new Date().toISOString()
  },
  {
    id: 'ver-2-1',
    document_id: 'doc-2',
    version_name: 'Convenio Colectivo 2018-2021',
    file_path: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=800&q=80', // PDF placeholder url
    published_at: '2018-06-12',
    effective_from: '2018-01-01',
    status: 'derogado',
    is_current: false,
    file_size: 1423100,
    created_at: new Date().toISOString()
  },
  {
    id: 'ver-2-2',
    document_id: 'doc-2',
    version_name: 'Convenio Vigente 2022-2025 (Prórroga Ultraactividad)',
    file_path: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf', // Dummy PDF online for real test
    published_at: '2022-03-24',
    effective_from: '2022-01-01',
    status: 'ultraactividad',
    is_current: true,
    file_size: 1856300,
    created_at: new Date().toISOString()
  },
  {
    id: 'ver-3-1',
    document_id: 'doc-3',
    version_name: 'Convenio Colectivo Hostelería Madrid 2023-2026',
    file_path: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    published_at: '2023-09-18',
    effective_from: '2023-07-01',
    status: 'vigente',
    is_current: true,
    file_size: 2450000,
    created_at: new Date().toISOString()
  }
];

// Mock database local state for writes
let localDocuments = [...mockDocuments];
let localVersions = [...mockVersions];
let localFavorites = [];

// API Mocked Client interface
export const mockClient = {
  getSectors: async () => mockSectors,
  getScopes: async () => mockScopes,
  getDocuments: async (search = '', filters = {}) => {
    let docs = [...localDocuments];
    
    if (search) {
      const q = search.toLowerCase();
      docs = docs.filter(d => 
        d.title.toLowerCase().includes(q) || 
        d.description?.toLowerCase().includes(q)
      );
    }
    
    if (filters.sector_id) {
      docs = docs.filter(d => d.sector_id === Number(filters.sector_id));
    }
    
    if (filters.scope_id) {
      docs = docs.filter(d => d.scope_id === Number(filters.scope_id));
    }
    
    // Obtener sector y ámbito, y la versión vigente
    return docs.map(d => {
      const sector = mockSectors.find(s => s.id === d.sector_id);
      const scope = mockScopes.find(s => s.id === d.scope_id);
      const currentVersion = localVersions.find(v => v.document_id === d.id && v.is_current);
      return {
        ...d,
        sectors: sector,
        geographic_scopes: scope,
        current_version: currentVersion || localVersions.find(v => v.document_id === d.id)
      };
    });
  },
  
  getDocumentById: async (id) => {
    const doc = localDocuments.find(d => d.id === id);
    if (!doc) return null;
    const sector = mockSectors.find(s => s.id === doc.sector_id);
    const scope = mockScopes.find(s => s.id === doc.scope_id);
    const versions = localVersions
      .filter(v => v.document_id === id)
      .sort((a, b) => new Date(b.effective_from) - new Date(a.effective_from));
    
    return {
      ...doc,
      sectors: sector,
      geographic_scopes: scope,
      versions
    };
  },

  createDocument: async (docData) => {
    const newDoc = {
      id: `doc-${Date.now()}`,
      title: docData.title,
      description: docData.description || '',
      sector_id: Number(docData.sector_id),
      scope_id: Number(docData.scope_id),
      is_active: true,
      created_at: new Date().toISOString()
    };
    localDocuments.push(newDoc);
    return newDoc;
  },

  updateDocument: async (id, docData) => {
    localDocuments = localDocuments.map(d => 
      d.id === id 
        ? { 
            ...d, 
            title: docData.title, 
            description: docData.description || '', 
            sector_id: Number(docData.sector_id), 
            scope_id: Number(docData.scope_id) 
          } 
        : d
    );
    return localDocuments.find(d => d.id === id);
  },

  createVersion: async (verData) => {
    // Si esta versión es marcada como vigente, desmarcamos las demás
    if (verData.is_current) {
      localVersions = localVersions.map(v => 
        v.document_id === verData.document_id ? { ...v, is_current: false } : v
      );
    }
    
    const newVer = {
      id: `ver-${Date.now()}`,
      document_id: verData.document_id,
      version_name: verData.version_name,
      file_path: verData.file_path || 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
      published_at: verData.published_at,
      effective_from: verData.effective_from,
      status: verData.status,
      is_current: verData.is_current,
      file_size: verData.file_size || 1024 * 1024 * 2,
      created_at: new Date().toISOString()
    };
    
    localVersions.push(newVer);
    return newVer;
  },

  updateVersion: async (id, verData) => {
    if (verData.is_current) {
      localVersions = localVersions.map(v => 
        v.document_id === verData.document_id ? { ...v, is_current: false } : v
      );
    }
    
    localVersions = localVersions.map(v => 
      v.id === id 
        ? { 
            ...v, 
            version_name: verData.version_name,
            file_path: verData.file_path,
            published_at: verData.published_at,
            effective_from: verData.effective_from,
            status: verData.status,
            is_current: verData.is_current
          } 
        : v
    );
    return localVersions.find(v => v.id === id);
  },

  getFavorites: async (userId) => {
    return localFavorites
      .filter(f => f.user_id === userId)
      .map(f => {
        const doc = localDocuments.find(d => d.id === f.document_id);
        const sector = mockSectors.find(s => s.id === doc.sector_id);
        const scope = mockScopes.find(s => s.id === doc.scope_id);
        const currentVersion = localVersions.find(v => v.document_id === doc.id && v.is_current);
        return {
          ...f,
          document: {
            ...doc,
            sectors: sector,
            geographic_scopes: scope,
            current_version: currentVersion
          }
        };
      });
  },

  toggleFavorite: async (userId, documentId) => {
    const idx = localFavorites.findIndex(f => f.user_id === userId && f.document_id === documentId);
    if (idx >= 0) {
      localFavorites.splice(idx, 1);
      return { active: false };
    } else {
      localFavorites.push({
        id: `fav-${Date.now()}`,
        user_id: userId,
        document_id: documentId,
        created_at: new Date().toISOString()
      });
      return { active: true };
    }
  }
};
