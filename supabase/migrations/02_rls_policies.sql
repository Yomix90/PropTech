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
