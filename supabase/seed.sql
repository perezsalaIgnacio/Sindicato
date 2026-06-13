-- 1. Poblar Sectores Económicos
INSERT INTO public.sectors (name, slug) VALUES
('General / Todos los Sectores', 'general'),
('Panadería y Pastelería', 'panaderia-pasteleria'),
('Hostelería y Turismo', 'hosteleria-turismo'),
('Construcción y Obras Públicas', 'construccion'),
('Sanidad y Servicios Sanitarios', 'sanidad')
ON CONFLICT (name) DO NOTHING;

-- 2. Poblar Ámbitos Geográficos
INSERT INTO public.geographic_scopes (type, region_name, province_name) VALUES
('nacional', NULL, NULL),
('autonomico', 'Comunidad de Madrid', NULL),
('provincial', 'Comunidad de Madrid', 'Madrid'),
('autonomico', 'Cataluña', NULL),
('provincial', 'Cataluña', 'Barcelona')
ON CONFLICT ON CONSTRAINT unique_scope DO NOTHING;

-- 3. Insertar Documentos y sus Versiones
-- Usamos bloques DO o transacciones para obtener referencias de IDs limpiamente.

DO $$
DECLARE
    v_sector_general_id INT;
    v_sector_panaderia_id INT;
    v_scope_nacional_id INT;
    v_scope_madrid_prov_id INT;
    v_doc_estatuto_id UUID;
    v_doc_panaderia_id UUID;
BEGIN
    -- Obtener IDs de Sectores
    SELECT id INTO v_sector_general_id FROM public.sectors WHERE slug = 'general';
    SELECT id INTO v_sector_panaderia_id FROM public.sectors WHERE slug = 'panaderia-pasteleria';
    
    -- Obtener IDs de Ámbitos
    SELECT id INTO v_scope_nacional_id FROM public.geographic_scopes WHERE type = 'nacional';
    SELECT id INTO v_scope_madrid_prov_id FROM public.geographic_scopes WHERE type = 'provincial' AND province_name = 'Madrid';

    ----------------------------------------------------------------------------
    -- DOCUMENTO 1: Estatuto de los Trabajadores
    ----------------------------------------------------------------------------
    INSERT INTO public.documents (title, description, sector_id, scope_id, is_active)
    VALUES (
        'Estatuto de los Trabajadores',
        'Texto refundido de la Ley del Estatuto de los Trabajadores, norma fundamental que regula las relaciones laborales en España.',
        v_sector_general_id,
        v_scope_nacional_id,
        TRUE
    )
    RETURNING id INTO v_doc_estatuto_id;

    -- Versión Antigua (Derogada)
    INSERT INTO public.document_versions (document_id, version_name, file_path, published_at, effective_from, status, is_current, file_size)
    VALUES (
        v_doc_estatuto_id,
        'RDL 2/2015 (Versión Original)',
        'https://www.boe.es/descargas/pdf/codigo.php?id=002_Codigo_del_Trabajo&modo=2', -- Simulamos una URL de descarga pública
        '2015-10-24',
        '2015-10-25',
        'derogado',
        FALSE,
        2541098
    );

    -- Versión Vigente (Con la Reforma Laboral)
    INSERT INTO public.document_versions (document_id, version_name, file_path, published_at, effective_from, status, is_current, file_size)
    VALUES (
        v_doc_estatuto_id,
        'Versión Vigente - Reforma Laboral 2022/2026',
        'https://www.boe.es/descargas/pdf/codigo.php?id=002_Codigo_del_Trabajo&modo=2',
        '2021-12-30',
        '2022-01-01',
        'vigente',
        TRUE,
        3124500
    );

    ----------------------------------------------------------------------------
    -- DOCUMENTO 2: Convenio Colectivo de Panadería y Pastelería de Madrid
    ----------------------------------------------------------------------------
    INSERT INTO public.documents (title, description, sector_id, scope_id, is_active)
    VALUES (
        'Convenio Colectivo de Panadería y Pastelería de la Comunidad de Madrid',
        'Regulación de las condiciones de trabajo para las empresas y trabajadores dedicados a la fabricación, venta y distribución de pan y pastelería en Madrid.',
        v_sector_panaderia_id,
        v_scope_madrid_prov_id,
        TRUE
    )
    RETURNING id INTO v_doc_panaderia_id;

    -- Versión Anterior (Ultraactividad / Histórica)
    INSERT INTO public.document_versions (document_id, version_name, file_path, published_at, effective_from, status, is_current, file_size)
    VALUES (
        v_doc_panaderia_id,
        'Convenio Colectivo 2018-2021',
        'https://www.comunidad.madrid/sites/default/files/convenios_colectivos_ejemplo.pdf',
        '2018-06-12',
        '2018-01-01',
        'derogado',
        FALSE,
        1423100
    );

    -- Versión Vigente
    INSERT INTO public.document_versions (document_id, version_name, file_path, published_at, effective_from, status, is_current, file_size)
    VALUES (
        v_doc_panaderia_id,
        'Convenio Vigente 2022-2025 (Prórroga Ultraactividad)',
        'https://www.comunidad.madrid/sites/default/files/convenios_colectivos_ejemplo.pdf',
        '2022-03-24',
        '2022-01-01',
        'ultraactividad',
        TRUE,
        1856300
    );

    ----------------------------------------------------------------------------
    -- OTROS CONVENIOS DE PRUEBA
    ----------------------------------------------------------------------------
    -- Convenio de Hostelería de Madrid (Para enriquecer la búsqueda)
    DECLARE
        v_sector_hosteleria_id INT;
        v_doc_hosteleria_id UUID;
    BEGIN
        SELECT id INTO v_sector_hosteleria_id FROM public.sectors WHERE slug = 'hosteleria-turismo';
        
        INSERT INTO public.documents (title, description, sector_id, scope_id, is_active)
        VALUES (
            'Convenio Colectivo del Sector de Hostelería de la Comunidad de Madrid',
            'Convenio regulador aplicable a hoteles, hostales, pensiones, restaurantes, cafeterías, bares y empresas de catering en Madrid.',
            v_sector_hosteleria_id,
            v_scope_madrid_prov_id,
            TRUE
        )
        RETURNING id INTO v_doc_hosteleria_id;

        INSERT INTO public.document_versions (document_id, version_name, file_path, published_at, effective_from, status, is_current, file_size)
        VALUES (
            v_doc_hosteleria_id,
            'Convenio Colectivo Hostelería Madrid 2023-2026',
            'https://www.comunidad.madrid/sites/default/files/convenios_colectivos_ejemplo.pdf',
            '2023-09-18',
            '2023-07-01',
            'vigente',
            TRUE,
            2450000
        );
    END;

END $$;

----------------------------------------------------------------------------
-- 4. Creación de Usuario Administrador para Pruebas en Supabase Real
----------------------------------------------------------------------------
-- Para crear el administrador en un entorno real de Supabase, puedes ejecutar el siguiente SQL.
-- Nota: La contraseña predeterminada configurada para perezsalaignacio@gmail.com es 'adminSindicato123'
/*
-- Habilitar pgcrypto si no está habilitada
CREATE EXTENSION IF NOT EXISTS pgcrypto;

INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  recovery_sent_at,
  last_sign_in_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  'a7b7e61e-1f7c-487f-94df-4411f5cb1234', -- UUID único para el admin
  'authenticated',
  'authenticated',
  'perezsalaignacio@gmail.com',
  crypt('adminSindicato123', gen_salt('bf')),
  now(),
  NULL,
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"Ignacio Pérez Sala","role":"admin"}',
  now(),
  now(),
  '',
  '',
  '',
  ''
) ON CONFLICT (id) DO NOTHING;

-- En caso de que el trigger no se dispare por políticas de restricción, insertamos el perfil directamente
INSERT INTO public.profiles (id, email, full_name, role)
VALUES (
  'a7b7e61e-1f7c-487f-94df-4411f5cb1234',
  'perezsalaignacio@gmail.com',
  'Ignacio Pérez Sala',
  'admin'
) ON CONFLICT (id) DO NOTHING;
*/
