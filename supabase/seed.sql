-- ==============================================================================
-- SPOTWORK - Coworking Space Management Platform
-- Seed Data (Users, Spaces, Bookings, Reviews, AI Recommendations)
-- ==============================================================================

-- 1. Insert Users
INSERT INTO public.users (id, email, full_name, phone, role, preferences)
VALUES 
  (
    '00000000-0000-0000-0000-000000000001',
    'lea@studio.fr',
    'Léa Martin',
    '+33 6 12 34 56 78',
    'client',
    '{"budget_min": 20, "budget_max": 90, "location_preference": "Paris", "equipment_needed": ["wifi", "coffee", "screen"]}'::jsonb
  ),
  (
    '00000000-0000-0000-0000-000000000002',
    'claire@spotwork.fr',
    'Claire Moreau',
    '+33 6 98 76 54 32',
    'manager',
    '{"location_preference": "Paris"}'::jsonb
  ),
  (
    '00000000-0000-0000-0000-000000000003',
    'admin@spotwork.fr',
    'Admin Spotwork',
    '+33 1 40 00 00 00',
    'admin',
    '{}'::jsonb
  )
ON CONFLICT (id) DO NOTHING;

-- 2. Insert Spaces
INSERT INTO public.spaces (id, name, description, location, latitude, longitude, owner_id, price_per_hour, capacity, amenities, photos, rating)
VALUES
  (
    '10000000-0000-0000-0000-000000000001',
    'La Verrière',
    'Ancien atelier baigné de lumière sous verrière d''époque. Postes ergonomiques, phone boxes, rooftop et communauté de résidents.',
    'Paris · 11e Oberkampf',
    48.864716, 2.378942,
    '00000000-0000-0000-0000-000000000002',
    29.00,
    45,
    '["wifi", "coffee", "screen", "print", "access", "terrace"]'::jsonb,
    '["https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=900&q=70", "https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=900&q=70"]'::jsonb,
    4.90
  ),
  (
    '10000000-0000-0000-0000-000000000002',
    'Studio Canopée',
    'Studio créatif insonorisé avec lumière ajustable, fond vert, matériel de captation et mur inscriptible.',
    'Lyon · 2e Confluence',
    45.748460, 4.819380,
    '00000000-0000-0000-0000-000000000002',
    38.00,
    12,
    '["wifi", "screen", "board", "coffee"]'::jsonb,
    '["https://images.unsplash.com/photo-1541746972996-4e0b0f43e02a?auto=format&fit=crop&w=900&q=70"]'::jsonb,
    4.80
  ),
  (
    '10000000-0000-0000-0000-000000000003',
    'Le Hub Bastille',
    'Bureau privé fermé, climatisé, mobilier Herman Miller. Salle de visio dédiée et service de réception de colis.',
    'Paris · 11e Bastille',
    48.853183, 2.369144,
    '00000000-0000-0000-0000-000000000002',
    89.00,
    6,
    '["wifi", "screen", "print", "access", "bike"]'::jsonb,
    '["https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&w=900&q=70"]'::jsonb,
    4.70
  ),
  (
    '10000000-0000-0000-0000-000000000004',
    'Salle Horizon',
    'Salle de réunion premium : écran 4K interactif, visio native Teams/Zoom, paperboard digital. Café et thés offerts.',
    'Bordeaux · Chartrons',
    44.856870, -0.569420,
    '00000000-0000-0000-0000-000000000002',
    24.00,
    10,
    '["wifi", "screen", "board", "coffee"]'::jsonb,
    '["https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=900&q=70"]'::jsonb,
    4.90
  ),
  (
    '10000000-0000-0000-0000-000000000005',
    'Cabine Mute',
    'Cabine acoustique ultra-silencieuse pour calls et sessions focus en toute confidentialité.',
    'Lille · Euralille',
    50.638520, 3.076320,
    '00000000-0000-0000-0000-000000000002',
    9.00,
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
    232.00,
    'confirmed'
  ),
  (
    '20000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000004',
    CURRENT_DATE + INTERVAL '5 day',
    '14:00:00',
    '17:00:00',
    72.00,
    'pending'
  ),
  (
    '20000000-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000002',
    CURRENT_DATE - INTERVAL '3 day',
    '10:00:00',
    '13:00:00',
    114.00,
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
    'Superbe studio créatif, acoustique parfaite pour nos tournages vidéo !'
  )
ON CONFLICT (id) DO NOTHING;

-- 5. Insert AI Recommendations
INSERT INTO public.ai_recommendations (id, user_id, recommended_space_id, reason, clicked)
VALUES
  (
    '40000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000003',
    'Idéal pour vos séances de concentration à Paris avec connexion fibre et visio dédiée.',
    false
  )
ON CONFLICT (id) DO NOTHING;
