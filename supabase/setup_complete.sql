-- ==============================================================================
-- SPOTWORK - Coworking Space Management Platform
-- Migration 01: Initial Schema (PostgreSQL / Supabase)
-- ==============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Create Enums
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('client', 'manager', 'admin');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE booking_status AS ENUM ('pending', 'confirmed', 'cancelled', 'completed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. TABLE users
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255),
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    role user_role NOT NULL DEFAULT 'client',
    preferences JSONB DEFAULT '{"budget_min": 0, "budget_max": 150, "location_preference": "Paris", "equipment_needed": ["wifi", "coffee"]}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. TABLE spaces
CREATE TABLE IF NOT EXISTS public.spaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    location VARCHAR(255) NOT NULL,
    latitude DECIMAL(10, 7),
    longitude DECIMAL(10, 7),
    owner_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    price_per_hour NUMERIC(10, 2) NOT NULL CHECK (price_per_hour >= 0),
    capacity INTEGER NOT NULL CHECK (capacity > 0),
    amenities JSONB DEFAULT '[]'::jsonb,
    photos JSONB DEFAULT '[]'::jsonb,
    rating NUMERIC(3, 2) NOT NULL DEFAULT 0.0 CHECK (rating >= 0 AND rating <= 5),
    available_from TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. TABLE bookings
CREATE TABLE IF NOT EXISTS public.bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    space_id UUID NOT NULL REFERENCES public.spaces(id) ON DELETE CASCADE,
    booking_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    total_price NUMERIC(10, 2) NOT NULL CHECK (total_price >= 0),
    status booking_status NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT check_booking_times CHECK (end_time > start_time)
);

-- 5. TABLE reviews
CREATE TABLE IF NOT EXISTS public.reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    space_id UUID NOT NULL REFERENCES public.spaces(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_booking_review UNIQUE (booking_id)
);

-- 6. TABLE ai_recommendations
CREATE TABLE IF NOT EXISTS public.ai_recommendations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    recommended_space_id UUID NOT NULL REFERENCES public.spaces(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    clicked BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- INDEXES FOR QUERY OPTIMIZATION
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_spaces_owner ON public.spaces(owner_id);
CREATE INDEX IF NOT EXISTS idx_spaces_location ON public.spaces(location);
CREATE INDEX IF NOT EXISTS idx_spaces_price ON public.spaces(price_per_hour);
CREATE INDEX IF NOT EXISTS idx_spaces_rating ON public.spaces(rating DESC);

-- Overlap checking composite index
CREATE INDEX IF NOT EXISTS idx_bookings_availability 
ON public.bookings(space_id, booking_date, status, start_time, end_time);

CREATE INDEX IF NOT EXISTS idx_bookings_user ON public.bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_space ON public.reviews(space_id);
CREATE INDEX IF NOT EXISTS idx_ai_recs_user ON public.ai_recommendations(user_id);

-- ==============================================================================
-- AUTOMATIC TRIGGERS
-- ==============================================================================

-- Trigger: auto-update updated_at on users
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_users_updated_at ON public.users;
CREATE TRIGGER trigger_users_updated_at
BEFORE UPDATE ON public.users
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Trigger: auto-recalculate space average rating on new/updated review
CREATE OR REPLACE FUNCTION update_space_rating()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.spaces
    SET rating = COALESCE((
        SELECT ROUND(AVG(rating)::numeric, 2)
        FROM public.reviews
        WHERE space_id = NEW.space_id
    ), 0)
    WHERE id = NEW.space_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_recalculate_space_rating ON public.reviews;
CREATE TRIGGER trigger_recalculate_space_rating
AFTER INSERT OR UPDATE OR DELETE ON public.reviews
FOR EACH ROW
EXECUTE FUNCTION update_space_rating();

-- Trigger: Sync with Supabase auth.users (if running on Supabase Cloud)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, email, full_name, role)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'client'::user_role)
    )
    ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        full_name = EXCLUDED.full_name;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Connect to Supabase Auth table trigger
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'auth') THEN
        DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
        CREATE TRIGGER on_auth_user_created
        AFTER INSERT ON auth.users
        FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
    END IF;
END $$;
-- ==============================================================================
-- SPOTWORK - Coworking Space Management Platform
-- Migration 02: Row Level Security (RLS) Policies
-- ==============================================================================

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_recommendations ENABLE ROW LEVEL SECURITY;

-- Helper function: check if user has admin or manager role
CREATE OR REPLACE FUNCTION public.is_manager_or_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.users
        WHERE id = user_id AND role IN ('manager', 'admin')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ------------------------------------------------------------------------------
-- 1. USERS POLICIES
-- ------------------------------------------------------------------------------
-- Anyone authenticated can view their own profile; managers/admins can view basic user profiles
CREATE POLICY "Users can view own profile"
ON public.users FOR SELECT
USING (auth.uid() = id OR public.is_manager_or_admin(auth.uid()));

-- Users can update only their own profile
CREATE POLICY "Users can update own profile"
ON public.users FOR UPDATE
USING (auth.uid() = id);

-- ------------------------------------------------------------------------------
-- 2. SPACES POLICIES
-- ------------------------------------------------------------------------------
-- Public read access to all spaces
CREATE POLICY "Public can view active spaces"
ON public.spaces FOR SELECT
USING (true);

-- Managers and admins can insert spaces
CREATE POLICY "Managers can insert spaces"
ON public.spaces FOR INSERT
WITH CHECK (
    auth.uid() = owner_id AND public.is_manager_or_admin(auth.uid())
);

-- Space owners and admins can update their spaces
CREATE POLICY "Owners can update spaces"
ON public.spaces FOR UPDATE
USING (
    auth.uid() = owner_id OR 
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
);

-- Space owners and admins can delete spaces
CREATE POLICY "Owners can delete spaces"
ON public.spaces FOR DELETE
USING (
    auth.uid() = owner_id OR 
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
);

-- ------------------------------------------------------------------------------
-- 3. BOOKINGS POLICIES
-- ------------------------------------------------------------------------------
-- Clients can see their own bookings; space owners can see bookings for their spaces; admins see all
CREATE POLICY "Users can view relevant bookings"
ON public.bookings FOR SELECT
USING (
    auth.uid() = user_id OR
    EXISTS (SELECT 1 FROM public.spaces WHERE id = bookings.space_id AND owner_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
);

-- Clients can create their own bookings
CREATE POLICY "Users can create bookings"
ON public.bookings FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Clients can update/cancel their pending bookings; Managers can update bookings for their spaces
CREATE POLICY "Users and managers can update bookings"
ON public.bookings FOR UPDATE
USING (
    auth.uid() = user_id OR
    EXISTS (SELECT 1 FROM public.spaces WHERE id = bookings.space_id AND owner_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
);

-- ------------------------------------------------------------------------------
-- 4. REVIEWS POLICIES
-- ------------------------------------------------------------------------------
-- Anyone can view reviews
CREATE POLICY "Public can view reviews"
ON public.reviews FOR SELECT
USING (true);

-- Only verified clients who booked the space can insert a review
CREATE POLICY "Clients can review completed bookings"
ON public.reviews FOR INSERT
WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
        SELECT 1 FROM public.bookings
        WHERE id = booking_id AND user_id = auth.uid() AND space_id = reviews.space_id
    )
);

-- ------------------------------------------------------------------------------
-- 5. AI RECOMMENDATIONS POLICIES
-- ------------------------------------------------------------------------------
-- Users can only view and update their own recommendations
CREATE POLICY "Users can view own AI recommendations"
ON public.ai_recommendations FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update click status on own recommendations"
ON public.ai_recommendations FOR UPDATE
USING (auth.uid() = user_id);
-- ==============================================================================
-- SPOTWORK - Coworking Space Management Platform
-- Seed Data (Users, Spaces, Bookings, Reviews, AI Recommendations)
-- ==============================================================================

-- 1. Insert Users
INSERT INTO public.users (id, email, full_name, phone, role, preferences)
VALUES 
  (
    '00000000-0000-0000-0000-000000000001',
    'youssef@proptech.ma',
    'Youssef Amrani',
    '+212 6 61 23 45 67',
    'client',
    '{"budget_min": 30, "budget_max": 120, "location_preference": "Casablanca", "equipment_needed": ["wifi", "coffee", "screen"]}'::jsonb
  ),
  (
    '00000000-0000-0000-0000-000000000002',
    'mehdi@spotwork.ma',
    'Mehdi El Fassi',
    '+212 6 62 34 56 78',
    'manager',
    '{"location_preference": "Casablanca"}'::jsonb
  ),
  (
    '00000000-0000-0000-0000-000000000003',
    'admin@spotwork.ma',
    'Fatima Zahra Alaoui',
    '+212 5 22 40 50 60',
    'admin',
    '{}'::jsonb
  )
ON CONFLICT (id) DO NOTHING;

-- 2. Insert Spaces
INSERT INTO public.spaces (id, name, description, location, latitude, longitude, owner_id, price_per_hour, capacity, amenities, photos, rating)
VALUES
  (
    '10000000-0000-0000-0000-000000000001',
    'L''Atelier Maarif',
    'Ancien atelier baigné de lumière au cœur de Maarif. Postes ergonomiques, phone boxes, rooftop et communauté dynamique de résidents.',
    'Casablanca · Maarif',
    33.588300, -7.633500,
    '00000000-0000-0000-0000-000000000002',
    45.00,
    45,
    '["wifi", "coffee", "screen", "print", "access", "terrace"]'::jsonb,
    '["https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=900&q=70", "https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=900&q=70"]'::jsonb,
    4.90
  ),
  (
    '10000000-0000-0000-0000-000000000002',
    'Studio Guéliz',
    'Studio créatif insonorisé avec lumière réglable, fond vert, matériel podcast et mur inscriptible.',
    'Marrakech · Guéliz',
    31.634600, -8.012500,
    '00000000-0000-0000-0000-000000000002',
    65.00,
    12,
    '["wifi", "screen", "board", "coffee"]'::jsonb,
    '["https://images.unsplash.com/photo-1541746972996-4e0b0f43e02a?auto=format&fit=crop&w=900&q=70"]'::jsonb,
    4.80
  ),
  (
    '10000000-0000-0000-0000-000000000003',
    'Oasis Work Gauthier',
    'Bureau privé fermé et climatisé, mobilier haut de gamme, salle de visio dédiée et thé à la menthe offert.',
    'Casablanca · Gauthier',
    33.591200, -7.625800,
    '00000000-0000-0000-0000-000000000002',
    85.00,
    6,
    '["wifi", "screen", "print", "access", "bike"]'::jsonb,
    '["https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&w=900&q=70"]'::jsonb,
    4.70
  ),
  (
    '10000000-0000-0000-0000-000000000004',
    'Le Hub Agdal',
    'Salle de réunion premium au cœur de Rabat : écran 4K interactif, visio native Zoom/Teams, paperboard digital.',
    'Rabat · Agdal',
    33.998100, -6.852500,
    '00000000-0000-0000-0000-000000000002',
    50.00,
    10,
    '["wifi", "screen", "board", "coffee"]'::jsonb,
    '["https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=900&q=70"]'::jsonb,
    4.90
  ),
  (
    '10000000-0000-0000-0000-000000000005',
    'Marina Bay Focus',
    'Cabine acoustique ultra-silencieuse avec vue panoramique sur la baie de Tanger. Prise USB-C 100W.',
    'Tanger · Malabata',
    35.776700, -5.795000,
    '00000000-0000-0000-0000-000000000002',
    25.00,
    1,
    '["wifi", "access"]'::jsonb,
    '["https://images.unsplash.com/photo-1593115057322-e94b77572f20?auto=format&fit=crop&w=900&q=70"]'::jsonb,
    4.60
  )
ON CONFLICT (id) DO NOTHING;

-- 3. Insert Bookings
INSERT INTO public.bookings (id, user_id, space_id, booking_date, start_time, end_time, total_price, status)
VALUES
  (
    '20000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000001',
    CURRENT_DATE + INTERVAL '2 day',
    '09:00:00',
    '18:00:00',
    405.00,
    'confirmed'
  ),
  (
    '20000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000004',
    CURRENT_DATE + INTERVAL '5 day',
    '14:00:00',
    '17:00:00',
    150.00,
    'pending'
  ),
  (
    '20000000-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000002',
    CURRENT_DATE - INTERVAL '3 day',
    '10:00:00',
    '13:00:00',
    195.00,
    'completed'
  )
ON CONFLICT (id) DO NOTHING;

-- 4. Insert Review for completed booking
INSERT INTO public.reviews (id, booking_id, user_id, space_id, rating, comment)
VALUES
  (
    '30000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000002',
    5,
    'Superbe studio à Guéliz, parfait pour nos sessions de captation et réunions clients !'
  )
ON CONFLICT (id) DO NOTHING;

-- 5. Insert AI Recommendations
INSERT INTO public.ai_recommendations (id, user_id, recommended_space_id, reason, clicked)
VALUES
  (
    '40000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000003',
    'Recommandé pour votre profil à Casablanca : Oasis Work Gauthier offre une connexion fibre optimale et un calme propice aux projets PropTech.',
    false
  )
ON CONFLICT (id) DO NOTHING;
