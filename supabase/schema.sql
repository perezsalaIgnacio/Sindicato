-- Habilitar extensión para UUIDs si no está habilitada
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Tabla de Perfiles de Usuario (vinculada a auth.users de Supabase)
CREATE TABLE public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT NOT NULL,
    full_name TEXT,
    role TEXT CHECK (role IN ('admin', 'usuario')) DEFAULT 'usuario',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Habilitar RLS en profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 2. Tabla de Sectores Económicos
CREATE TABLE public.sectors (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    slug TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

ALTER TABLE public.sectors ENABLE ROW LEVEL SECURITY;

-- 3. Tabla de Ámbitos Geográficos
CREATE TABLE public.geographic_scopes (
    id SERIAL PRIMARY KEY,
    type TEXT CHECK (type IN ('nacional', 'autonomico', 'provincial')) NOT NULL,
    region_name TEXT, -- Ej: "Comunidad de Madrid", "Cataluña" (null si es nacional)
    province_name TEXT, -- Ej: "Madrid", "Barcelona" (null si es nacional o autonómico)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    CONSTRAINT unique_scope UNIQUE (type, region_name, province_name)
);

ALTER TABLE public.geographic_scopes ENABLE ROW LEVEL SECURITY;

-- 4. Tabla de Documentos (Definición general, ej. "Estatuto de los Trabajadores")
CREATE TABLE public.documents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    sector_id INTEGER REFERENCES public.sectors(id) ON DELETE SET NULL,
    scope_id INTEGER REFERENCES public.geographic_scopes(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- 5. Tabla de Versiones de Documentos
CREATE TABLE public.document_versions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    document_id UUID REFERENCES public.documents(id) ON DELETE CASCADE NOT NULL,
    version_name TEXT NOT NULL, -- Ej: "Versión 2023", "RDL 2/2015"
    file_path TEXT NOT NULL, -- Ruta o URL del PDF en Supabase Storage
    published_at DATE NOT NULL, -- Fecha de publicación en el BOE/BOCM
    effective_from DATE NOT NULL, -- Fecha de entrada en vigor
    status TEXT CHECK (status IN ('vigente', 'no_vigente', 'derogado', 'ultraactividad', 'archivado')) DEFAULT 'vigente' NOT NULL,
    is_current BOOLEAN DEFAULT FALSE NOT NULL, -- Indica si es la versión activa por defecto
    file_size BIGINT, -- Tamaño del PDF en bytes
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

ALTER TABLE public.document_versions ENABLE ROW LEVEL SECURITY;

-- 6. Tabla de Favoritos de Usuario
CREATE TABLE public.favorites (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    document_id UUID REFERENCES public.documents(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    UNIQUE (user_id, document_id)
);

ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;

--------------------------------------------------------------------------------
-- FUNCIONES AUXILIARES Y TRIGGERS
--------------------------------------------------------------------------------

-- Función para verificar si el usuario es administrador
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN (
        SELECT role = 'admin'
        FROM public.profiles
        WHERE id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para crear automáticamente el perfil de un usuario al registrarse
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, role)
    VALUES (
        new.id,
        new.email,
        COALESCE(new.raw_user_meta_data->>'full_name', 'Usuario Sindicato'),
        COALESCE(new.raw_user_meta_data->>'role', 'usuario')
    );
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger para garantizar que solo una versión por documento sea "is_current = true"
CREATE OR REPLACE FUNCTION public.handle_current_version()
RETURNS TRIGGER AS $$
BEGIN
    IF new.is_current = TRUE THEN
        UPDATE public.document_versions
        SET is_current = FALSE
        WHERE document_id = new.document_id AND id <> new.id;
    END IF;
    RETURN new;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER on_version_current_changed
    BEFORE INSERT OR UPDATE OF is_current ON public.document_versions
    FOR EACH ROW
    WHEN (new.is_current = TRUE)
    EXECUTE FUNCTION public.handle_current_version();

--------------------------------------------------------------------------------
-- FUNCION PARA CAMBIAR ESTADO DE VERSION
CREATE OR REPLACE FUNCTION public.set_version_status(p_version_id UUID, p_new_status TEXT)
RETURNS VOID AS $$
DECLARE
    v_doc_id UUID;
BEGIN
    -- Obtener el documento asociado
    SELECT document_id INTO v_doc_id FROM public.document_versions WHERE id = p_version_id;
    IF v_doc_id IS NULL THEN
        RAISE EXCEPTION 'Version % not found', p_version_id;
    END IF;

    -- Actualizar el estado de la versión especificada
    UPDATE public.document_versions
    SET status = p_new_status,
        is_current = (p_new_status = 'vigente')
    WHERE id = p_version_id;

    -- Si la nueva versión se marca como vigente, desactivar otras versiones del mismo documento
    IF p_new_status = 'vigente' THEN
        UPDATE public.document_versions
        SET is_current = FALSE, status = 'no_vigente'
        WHERE document_id = v_doc_id AND id <> p_version_id AND is_current = TRUE;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
--------------------------------------------------------------------------------
-- POLÍTICAS DE ROW LEVEL SECURITY (RLS)
--------------------------------------------------------------------------------

-- Políticas para Profiles
CREATE POLICY "Permitir lectura de perfiles a usuarios autenticados" 
    ON public.profiles FOR SELECT 
    USING (auth.uid() = id OR public.is_admin());

CREATE POLICY "Permitir actualización de perfiles a sí mismos o admin" 
    ON public.profiles FOR UPDATE 
    USING (auth.uid() = id OR public.is_admin());

-- Políticas para Sectores (Lectura libre, escritura solo admins)
CREATE POLICY "Permitir lectura de sectores a cualquiera" 
    ON public.sectors FOR SELECT 
    USING (true);

CREATE POLICY "Permitir escritura de sectores solo a administradores" 
    ON public.sectors FOR ALL 
    USING (public.is_admin());

-- Políticas para Ámbitos Geográficos (Lectura libre, escritura solo admins)
CREATE POLICY "Permitir lectura de ámbitos a cualquiera" 
    ON public.geographic_scopes FOR SELECT 
    USING (true);

CREATE POLICY "Permitir escritura de ámbitos solo a administradores" 
    ON public.geographic_scopes FOR ALL 
    USING (public.is_admin());

-- Políticas para Documentos (Lectura libre, escritura solo admins)
CREATE POLICY "Permitir lectura de documentos a cualquiera" 
    ON public.documents FOR SELECT 
    USING (is_active = true OR public.is_admin());

CREATE POLICY "Permitir escritura de documentos solo a administradores" 
    ON public.documents FOR ALL 
    USING (public.is_admin());

-- Políticas para Versiones de Documentos (Lectura libre, escritura solo admins)
CREATE POLICY "Permitir lectura de versiones a cualquiera" 
    ON public.document_versions FOR SELECT 
    USING (true);

CREATE POLICY "Permitir escritura de versiones solo a administradores" 
    ON public.document_versions FOR ALL 
    USING (public.is_admin());

-- Políticas para Favoritos (Lectura y escritura solo para el propio usuario)
CREATE POLICY "Permitir ver favoritos propios" 
    ON public.favorites FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Permitir gestionar favoritos propios" 
    ON public.favorites FOR ALL 
    USING (auth.uid() = user_id);

--------------------------------------------------------------------------------
-- STORAGE BUCKETS (Documentación sobre políticas requeridas en Supabase Storage)
--------------------------------------------------------------------------------
-- Nombre del bucket: 'labor-documents'
-- Políticas sugeridas en Storage.objects:
-- 1. "Permitir lectura pública de documentos PDF" -> SELECT en bucket 'labor-documents' para cualquiera (public).
-- 2. "Permitir subida y gestión de PDFs a administradores" -> INSERT/UPDATE/DELETE en bucket 'labor-documents' si public.is_admin() es true.

--------------------------------------------------------------------------------
-- 7. Tabla de Notas de Usuario (vinculadas a un documento/convenio opcionalmente)
--------------------------------------------------------------------------------
CREATE TABLE public.notes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    document_id UUID REFERENCES public.documents(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Habilitar RLS en la tabla de notas
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS para notes (solo acceso privado al dueño)
CREATE POLICY "Permitir a los usuarios ver sus propias notas"
    ON public.notes FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Permitir a los usuarios insertar sus propias notas"
    ON public.notes FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Permitir a los usuarios actualizar sus propias notas"
    ON public.notes FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Permitir a los usuarios eliminar sus propias notas"
    ON public.notes FOR DELETE
    USING (auth.uid() = user_id);

-- Trigger para mantener actualizado updated_at en notes
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    new.updated_at = NOW();
    RETURN new;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER on_note_updated
    BEFORE UPDATE ON public.notes
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();
