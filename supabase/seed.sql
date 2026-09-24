-- ==============================================================================
-- SPOTWORK - Coworking Space Management Platform (PropTech Maroc)
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
