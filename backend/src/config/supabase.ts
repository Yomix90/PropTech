import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { env } from './env.js';

export interface UserEntity {
  id: string;
  email: string;
  password_hash?: string;
  full_name: string;
  phone?: string;
  role: 'client' | 'manager' | 'admin';
  preferences: {
    budget_min?: number;
    budget_max?: number;
    location_preference?: string;
    equipment_needed?: string[];
    [key: string]: unknown;
  };
  created_at: string;
  updated_at: string;
}

export interface SpaceEntity {
  id: string;
  name: string;
  description: string;
  location: string;
  latitude: number;
  longitude: number;
  owner_id: string;
  price_per_hour: number;
  capacity: number;
  amenities: string[];
  photos: string[];
  rating: number;
  available_from: string;
  created_at: string;
}

export interface BookingEntity {
  id: string;
  user_id: string;
  space_id: string;
  booking_date: string; // YYYY-MM-DD
  start_time: string; // HH:MM:SS
  end_time: string; // HH:MM:SS
  total_price: number;
  seats?: number;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  created_at: string;
}

export interface ReviewEntity {
  id: string;
  booking_id: string;
  user_id: string;
  space_id: string;
  rating: number;
  comment: string;
  created_at: string;
}

export interface AIRecommendationEntity {
  id: string;
  user_id: string;
  recommended_space_id: string;
  reason: string;
  clicked: boolean;
  created_at: string;
}

// In-Memory Database Store for Instant Local Testing & Seamless Development
export class LocalDataStore {
  users: UserEntity[] = [
    {
      id: '00000000-0000-0000-0000-000000000001',
      email: 'youssef@proptech.ma',
      full_name: 'Youssef Amrani',
      phone: '+212 6 61 23 45 67',
      role: 'client',
      preferences: {
        budget_min: 30,
        budget_max: 120,
        location_preference: 'Casablanca',
        equipment_needed: ['wifi', 'coffee', 'screen'],
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: '00000000-0000-0000-0000-000000000002',
      email: 'mehdi@spotwork.ma',
      full_name: 'Mehdi El Fassi',
      phone: '+212 6 62 34 56 78',
      role: 'manager',
      preferences: { location_preference: 'Casablanca' },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: '00000000-0000-0000-0000-000000000003',
      email: 'admin@spotwork.ma',
      full_name: 'Fatima Zahra Alaoui',
      phone: '+212 5 22 40 50 60',
      role: 'admin',
      preferences: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];

  spaces: SpaceEntity[] = [
    {
      id: '10000000-0000-0000-0000-000000000001',
      name: "L'Atelier Maarif",
      description: 'Ancien atelier baigné de lumière au cœur de Maarif. Postes ergonomiques, phone boxes, rooftop et communauté dynamique de résidents.',
      location: 'Casablanca · Maarif',
      latitude: 33.5883,
      longitude: -7.6335,
      owner_id: '00000000-0000-0000-0000-000000000002',
      price_per_hour: 45.0,
      capacity: 45,
      amenities: ['wifi', 'coffee', 'screen', 'print', 'access', 'terrace'],
      photos: [
        'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=900&q=70',
        'https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=900&q=70',
      ],
      rating: 4.9,
      available_from: new Date().toISOString(),
      created_at: new Date().toISOString(),
    },
    {
      id: '10000000-0000-0000-0000-000000000002',
      name: 'Studio Guéliz',
      description: 'Studio créatif insonorisé avec lumière réglable, fond vert, matériel podcast et mur inscriptible.',
      location: 'Marrakech · Guéliz',
      latitude: 31.6346,
      longitude: -8.0125,
      owner_id: '00000000-0000-0000-0000-000000000002',
      price_per_hour: 65.0,
      capacity: 12,
      amenities: ['wifi', 'screen', 'board', 'coffee'],
      photos: [
        'https://images.unsplash.com/photo-1541746972996-4e0b0f43e02a?auto=format&fit=crop&w=900&q=70',
      ],
      rating: 4.8,
      available_from: new Date().toISOString(),
      created_at: new Date().toISOString(),
    },
    {
      id: '10000000-0000-0000-0000-000000000003',
      name: 'Oasis Work Gauthier',
      description: 'Bureau privé fermé et climatisé, mobilier haut de gamme, salle de visio dédiée et thé à la menthe offert.',
      location: 'Casablanca · Gauthier',
      latitude: 33.5912,
      longitude: -7.6258,
      owner_id: '00000000-0000-0000-0000-000000000002',
      price_per_hour: 85.0,
      capacity: 6,
      amenities: ['wifi', 'screen', 'print', 'access', 'bike'],
      photos: [
        'https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&w=900&q=70',
      ],
      rating: 4.7,
      available_from: new Date().toISOString(),
      created_at: new Date().toISOString(),
    },
    {
      id: '10000000-0000-0000-0000-000000000004',
      name: 'Le Hub Agdal',
      description: 'Salle de réunion premium au cœur de Rabat : écran 4K interactif, visio native Zoom/Teams, paperboard digital.',
      location: 'Rabat · Agdal',
      latitude: 33.9981,
      longitude: -6.8525,
      owner_id: '00000000-0000-0000-0000-000000000002',
      price_per_hour: 50.0,
      capacity: 10,
      amenities: ['wifi', 'screen', 'board', 'coffee'],
      photos: [
        'https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=900&q=70',
      ],
      rating: 4.9,
      available_from: new Date().toISOString(),
      created_at: new Date().toISOString(),
    },
    {
      id: '10000000-0000-0000-0000-000000000005',
      name: 'Marina Bay Focus',
      description: 'Cabine acoustique ultra-silencieuse avec vue panoramique sur le détroit de Tanger. Prise USB-C 100W.',
      location: 'Tanger · Malabata',
      latitude: 35.7767,
      longitude: -5.795,
      owner_id: '00000000-0000-0000-0000-000000000002',
      price_per_hour: 25.0,
      capacity: 1,
      amenities: ['wifi', 'access'],
      photos: [
        'https://images.unsplash.com/photo-1593115057322-e94b77572f20?auto=format&fit=crop&w=900&q=70',
      ],
      rating: 4.6,
      available_from: new Date().toISOString(),
      created_at: new Date().toISOString(),
    },
  ];

  bookings: BookingEntity[] = [
    {
      id: '20000000-0000-0000-0000-000000000001',
      user_id: '00000000-0000-0000-0000-000000000001',
      space_id: '10000000-0000-0000-0000-000000000001',
      booking_date: '2026-10-01',
      start_time: '09:00:00',
      end_time: '18:00:00',
      total_price: 405.0,
      status: 'confirmed',
      created_at: new Date().toISOString(),
    },
    {
      id: '20000000-0000-0000-0000-000000000002',
      user_id: '00000000-0000-0000-0000-000000000001',
      space_id: '10000000-0000-0000-0000-000000000004',
      booking_date: '2026-10-05',
      start_time: '14:00:00',
      end_time: '17:00:00',
      total_price: 150.0,
      status: 'pending',
      created_at: new Date().toISOString(),
    },
    {
      id: '20000000-0000-0000-0000-000000000003',
      user_id: '00000000-0000-0000-0000-000000000001',
      space_id: '10000000-0000-0000-0000-000000000002',
      booking_date: '2026-09-20',
      start_time: '10:00:00',
      end_time: '13:00:00',
      total_price: 195.0,
      status: 'completed',
      created_at: new Date().toISOString(),
    },
  ];

  reviews: ReviewEntity[] = [
    {
      id: '30000000-0000-0000-0000-000000000001',
      booking_id: '20000000-0000-0000-0000-000000000003',
      user_id: '00000000-0000-0000-0000-000000000001',
      space_id: '10000000-0000-0000-0000-000000000002',
      rating: 5,
      comment: 'Superbe studio à Guéliz, parfait pour nos sessions de captation et réunions clients !',
      created_at: new Date().toISOString(),
    },
  ];

  aiRecommendations: AIRecommendationEntity[] = [
    {
      id: '40000000-0000-0000-0000-000000000001',
      user_id: '00000000-0000-0000-0000-000000000001',
      recommended_space_id: '10000000-0000-0000-0000-000000000003',
      reason: 'Recommandé pour votre profil à Casablanca : Oasis Work Gauthier offre une connexion fibre optimale et un calme propice aux projets PropTech.',
      clicked: false,
      created_at: new Date().toISOString(),
    },
  ];
}

export const localStore = new LocalDataStore();

// Check if live Supabase is configured
export const isLiveSupabaseConfigured = Boolean(
  env.NODE_ENV !== 'test' &&
  env.SUPABASE_URL &&
    !env.SUPABASE_URL.includes('mock.supabase.co') &&
    env.SUPABASE_ANON_KEY &&
    !env.SUPABASE_ANON_KEY.includes('mock')
);

export const supabase: SupabaseClient = createClient(
  env.SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_ANON_KEY
);

export let isLiveSupabase = false;

export async function verifySupabaseSchema(): Promise<boolean> {
  if (env.NODE_ENV === 'test' || !isLiveSupabaseConfigured) {
    isLiveSupabase = false;
    return false;
  }

  try {
    const { error } = await supabase.from('spaces').select('id').limit(1);
    if (!error) {
      isLiveSupabase = true;
      console.log('✅ Schéma PostgreSQL Supabase validé et opérationnel !');
      return true;
    }
    if (error.code === 'PGRST205') {
      isLiveSupabase = false;
      const projectRef = env.SUPABASE_URL.replace('https://', '').split('.')[0];
      console.warn('\n========================================================================');
      console.warn('⚠️ Supabase Cloud est connecté, mais les tables ne sont pas encore créées.');
      console.warn('👉 Exécutez le script supabase/setup_complete.sql dans le SQL Editor Supabase :');
      console.warn(`   https://supabase.com/dashboard/project/${projectRef}/sql/new`);
      console.warn('💡 Le backend bascule automatiquement sur le store de données local en attendant.');
      console.warn('========================================================================\n');
      return false;
    }
    return false;
  } catch {
    isLiveSupabase = false;
    return false;
  }
}


