import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// Use the service role key for admin bulk inserts (bypasses RLS)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
);

/**
 * Converts an Iberley URL slug into a readable title.
 * e.g. "convenio-colectivo-sector-hosteleria-madrid" → "Convenio Colectivo Sector Hostelería Madrid"
 */
function slugToTitle(url) {
  const slug = url.split('/').pop() ?? '';
  // Remove trailing ID codes (e.g. -1400123 or -8533020)
  const cleaned = slug
    .replace(/-\d{6,}$/g, '')
    .replace(/^convenio-colectivo-/, '')
    .replace(/^resolucion-\d{1,2}-\w+-\d{4}-/, '')
    .replace(/-/g, ' ')
    .trim();

  // Capitalise each word
  return cleaned
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

/**
 * Normalises a scope type string to match DB check constraints ('nacional', 'autonomico', 'provincial').
 */
function normaliseScopeType(type) {
  if (!type) return 'nacional';
  const norm = type.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (norm.includes('nacional') || norm.includes('boe') || norm.includes('estatal')) return 'nacional';
  if (norm.includes('autonom') || norm.includes('madrid') || norm.includes('comunidad')) return 'autonomico';
  if (norm.includes('provinc')) return 'provincial';
  return 'nacional'; // fallback
}

/**
 * POST /api/import-convenios
 * Body: {
 *   convenios: Array<{
 *     link: string,
 *     title?: string,
 *     scope_type?: string,
 *     region_name?: string
 *   }>
 * }
 */
export async function POST(request) {
  let payload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { convenios } = payload;
  if (!Array.isArray(convenios) || convenios.length === 0) {
    return NextResponse.json({ error: 'No convenios provided' }, { status: 400 });
  }

  // Cache scopes and sectors to minimise DB calls
  const scopeCache = new Map();
  const sectorCache = new Map();

  async function getOrCreateScope(rawType, rawRegion) {
    const type = normaliseScopeType(rawType);
    const region_name = type === 'nacional' ? null : (rawRegion || 'Comunidad de Madrid');
    const cacheKey = `${type}:${region_name}`;

    if (scopeCache.has(cacheKey)) {
      return scopeCache.get(cacheKey);
    }

    // Try finding scope
    const query = supabase
      .from('geographic_scopes')
      .select('id')
      .eq('type', type);
    
    if (region_name === null) {
      query.is('region_name', null);
    } else {
      query.eq('region_name', region_name);
    }

    const { data: existingScope } = await query.maybeSingle();

    if (existingScope) {
      scopeCache.set(cacheKey, existingScope.id);
      return existingScope.id;
    }

    // Insert new scope
    const { data: newScope, error: scopeErr } = await supabase
      .from('geographic_scopes')
      .insert({ type, region_name, province_name: null })
      .select('id')
      .single();

    if (scopeErr) {
      throw new Error(`Could not create scope: ${scopeErr.message}`);
    }

    scopeCache.set(cacheKey, newScope.id);
    return newScope.id;
  }

  async function getOrCreateSector(slug, name) {
    if (sectorCache.has(slug)) {
      return sectorCache.get(slug);
    }

    const { data: existingSector } = await supabase
      .from('sectors')
      .select('id')
      .eq('slug', slug)
      .maybeSingle();

    if (existingSector) {
      sectorCache.set(slug, existingSector.id);
      return existingSector.id;
    }

    const { data: newSector, error: sectorErr } = await supabase
      .from('sectors')
      .insert({ name, slug })
      .select('id')
      .single();

    if (sectorErr) {
      throw new Error(`Could not create sector: ${sectorErr.message}`);
    }

    sectorCache.set(slug, newSector.id);
    return newSector.id;
  }

  // Fetch existing document titles to detect duplicates
  const { data: existingDocs } = await supabase
    .from('documents')
    .select('title');
  const existingTitles = new Set((existingDocs ?? []).map((d) => d.title.toLowerCase()));

  const results = { inserted: 0, skipped: 0, errors: [] };

  for (const conv of convenios) {
    const title = conv.title || slugToTitle(conv.link);

    if (existingTitles.has(title.toLowerCase())) {
      results.skipped++;
      continue;
    }

    try {
      // 1. Get scope
      const scopeId = await getOrCreateScope(conv.scope_type, conv.region_name);

      // 2. Get/create sector (default to general)
      const sectorId = await getOrCreateSector('general', 'General / Todos los Sectores');

      // 3. Insert document
      const { data: doc, error: docErr } = await supabase
        .from('documents')
        .insert({
          title,
          description: `Convenio colectivo de sector. Fuente: Iberley.`,
          sector_id: sectorId,
          scope_id: scopeId,
        })
        .select('id')
        .single();

      if (docErr) {
        results.errors.push({ title, error: docErr.message });
        continue;
      }

      // 4. Insert version pointing to external Iberley URL
      const { error: verErr } = await supabase.from('document_versions').insert({
        document_id: doc.id,
        version_name: 'Versión Iberley',
        file_path: conv.link,
        published_at: '2020-01-01', // fallback since it is required in DB schema
        effective_from: '2020-01-01',
        status: 'vigente',
        is_current: true,
      });

      if (verErr) {
        results.errors.push({ title, error: verErr.message });
      } else {
        results.inserted++;
        existingTitles.add(title.toLowerCase());
      }
    } catch (err) {
      results.errors.push({ title, error: err.message });
    }
  }

  return NextResponse.json(results, { status: 200 });
}
