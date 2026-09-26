-- ==============================================================================
-- SPOTWORK PROPTECH — Synchronisation Complète Base de Données Supabase Cloud
-- À exécuter dans : Supabase Dashboard > SQL Editor > New query > RUN
-- ==============================================================================

-- 1. Configuration des extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Création des utilisateurs marocains de démonstration
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
ON CONFLICT (id) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  phone = EXCLUDED.phone,
  preferences = EXCLUDED.preferences;

-- 3. Mise à jour et insertion des 10 Espaces de Coworking Marocains Authentiques
INSERT INTO public.spaces (id, name, description, location, latitude, longitude, owner_id, price_per_hour, capacity, amenities, photos, rating)
VALUES
  (
    '10000000-0000-0000-0000-000000000001',
    'L''Atelier Maarif',
    'Ancien atelier baigné de lumière naturelle au cœur de Maarif. Postes ergonomiques, phone boxes insonorisées, rooftop et communauté dynamique de résidents tech et startups.',
    'Casablanca · Maarif',
    33.585500, -7.632200,
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
    'Studio créatif et podcast insonorisé avec lumière réglable, fond vert, micros pros et mur inscriptible. Idéal pour ateliers, workshops et sessions brainstorm.',
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
    'Bureau privé fermé et climatisé, mobilier haut de gamme, salle de visio dédiée 4K et service de thé à la menthe offert.',
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
    'Salle de réunion premium au cœur de Rabat Agdal : écran interactif 4K tactile, visio native Zoom/Teams, paperboard digital. Eau et café offerts.',
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
    'Cabine acoustique ultra-silencieuse avec vue panoramique sur la baie de Tanger. Double vitrage acoustique, ventilation douce, prise USB-C 100W.',
    'Tanger · Malabata',
    35.776700, -5.798400,
    '00000000-0000-0000-0000-000000000002',
    25.00,
    1,
    '["wifi", "access"]'::jsonb,
    '["https://images.unsplash.com/photo-1593115057322-e94b77572f20?auto=format&fit=crop&w=900&q=70"]'::jsonb,
    4.60
  ),
  (
    '10000000-0000-0000-0000-000000000006',
    'L''Espace Anfa',
    'Espace de coworking moderne et lumineux au cœur du quartier d''affaires d''Anfa. Fibre optique dédiée 1 Gbps, mobilier ergonomique Steelcase et café barista à volonté.',
    'Casablanca · Anfa',
    33.588000, -7.645000,
    '00000000-0000-0000-0000-000000000002',
    40.00,
    35,
    '["wifi", "coffee", "screen", "print", "access", "bike"]'::jsonb,
    '["https://images.unsplash.com/photo-1527192491265-7e15c55b1ed2?auto=format&fit=crop&w=900&q=70"]'::jsonb,
    4.80
  ),
  (
    '10000000-0000-0000-0000-000000000007',
    'Coworking Palm Hivernage',
    'Oasis créative modulable entourée de végétation et palmiers avec terrasse ensoleillée pour pauses et networking. Mobilier artisanal contemporain et climatisation.',
    'Marrakech · Hivernage',
    31.623000, -8.016000,
    '00000000-0000-0000-0000-000000000002',
    55.00,
    16,
    '["wifi", "board", "coffee", "terrace"]'::jsonb,
    '["https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=900&q=70"]'::jsonb,
    4.80
  ),
  (
    '10000000-0000-0000-0000-000000000008',
    'Technopark Agadir Hub',
    'Bureau d''équipe moderne au sein du Technopark d''Agadir. Équipements complets, environnement innovant orienté technologies et parking sécurisé 24/7.',
    'Agadir · Tilila',
    30.405000, -9.558000,
    '00000000-0000-0000-0000-000000000002',
    75.00,
    8,
    '["wifi", "screen", "access", "print"]'::jsonb,
    '["https://images.unsplash.com/photo-1497215842964-222b430dc094?auto=format&fit=crop&w=900&q=70"]'::jsonb,
    4.70
  ),
  (
    '10000000-0000-0000-0000-000000000009',
    'Détroit Meeting Tanger',
    'Salle de conférence panoramique en plein centre-ville de Tanger avec vue sur le détroit de Gibraltar. Configuration flexible en U ou théâtre avec sonorisation JBL.',
    'Tanger · Centre',
    35.782000, -5.811000,
    '00000000-0000-0000-0000-000000000002',
    45.00,
    14,
    '["wifi", "screen", "board", "coffee", "terrace"]'::jsonb,
    '["https://images.unsplash.com/photo-1517502884422-41eaead166d4?auto=format&fit=crop&w=900&q=70"]'::jsonb,
    4.80
  ),
  (
    '10000000-0000-0000-0000-000000000010',
    'Fès Medina Lab',
    'Hub collaboratif moderne mariant architecture marocaine traditionnelle et technologies de pointe. Ambiance chaleureuse, patio arboré et connexion fibre optique.',
    'Fès · Ville Nouvelle',
    34.033000, -5.001000,
    '00000000-0000-0000-0000-000000000002',
    35.00,
    30,
    '["wifi", "coffee", "print", "access"]'::jsonb,
    '["https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=900&q=70"]'::jsonb,
    4.80
  )
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  location = EXCLUDED.location,
  latitude = EXCLUDED.latitude,
  longitude = EXCLUDED.longitude,
  price_per_hour = EXCLUDED.price_per_hour,
  capacity = EXCLUDED.capacity,
  amenities = EXCLUDED.amenities,
  photos = EXCLUDED.photos,
  rating = EXCLUDED.rating;

-- 4. Assurer l'existence de la colonne 'seats' dans la table bookings
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS seats INTEGER NOT NULL DEFAULT 1 CHECK (seats > 0);

-- 5. Insertion de réservations marocaines de démonstration
INSERT INTO public.bookings (id, user_id, space_id, booking_date, start_time, end_time, total_price, status, seats)
VALUES
  (
    '20000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000001',
    CURRENT_DATE + INTERVAL '2 day',
    '09:00:00',
    '13:00:00',
    180.00,
    'confirmed',
    2
  ),
  (
    '20000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000004',
    CURRENT_DATE + INTERVAL '4 day',
    '14:00:00',
    '17:00:00',
    150.00,
    'pending',
    1
  )
ON CONFLICT (id) DO NOTHING;

-- 6. Politiques RLS (Row Level Security) permissives pour l'application web
-- Permet la lecture publique de tous les espaces
DROP POLICY IF EXISTS "Public can view active spaces" ON public.spaces;
CREATE POLICY "Public can view active spaces" ON public.spaces FOR SELECT USING (true);

-- Permet la mise à jour des espaces (admin web)
DROP POLICY IF EXISTS "Allow space update" ON public.spaces;
CREATE POLICY "Allow space update" ON public.spaces FOR UPDATE USING (true) WITH CHECK (true);

-- Permet l'insertion d'espaces (admin web)
DROP POLICY IF EXISTS "Allow space insert" ON public.spaces;
CREATE POLICY "Allow space insert" ON public.spaces FOR INSERT WITH CHECK (true);

-- Permet la lecture et l'insertion directe de réservations depuis le site web
DROP POLICY IF EXISTS "Public can view bookings" ON public.bookings;
CREATE POLICY "Public can view bookings" ON public.bookings FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public can create bookings" ON public.bookings;
CREATE POLICY "Public can create bookings" ON public.bookings FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Public can update bookings" ON public.bookings;
CREATE POLICY "Public can update bookings" ON public.bookings FOR UPDATE USING (true);

-- 7. Rafraîchir le cache de schéma PostgREST
NOTIFY pgrst, 'reload schema';
