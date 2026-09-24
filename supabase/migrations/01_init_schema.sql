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
