-- ==============================================================================
-- SPOTWORK - Migration 03: Support Multi-Seat Bookings
-- Ajout de la colonne 'seats' dans la table bookings
-- ==============================================================================

-- 1. Ajouter la colonne seats avec valeur par défaut 1
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS seats INTEGER NOT NULL DEFAULT 1 CHECK (seats > 0);

-- 2. Commentaire descriptif sur la colonne
COMMENT ON COLUMN public.bookings.seats IS 'Nombre de places réservées pour ce créneau horaire';

-- 3. Notification PostgREST pour recharger le cache de schéma
NOTIFY pgrst, 'reload schema';
