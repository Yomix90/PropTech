import { createClient } from '@supabase/supabase-js';

const url = 'https://yhtgqugdsfwgqvmpulcy.supabase.co';
const key = 'sb_publishable_Ju2xF0_S1YInzEMXECbL5A_XuKfXubO';

const supabase = createClient(url, key);

const MOROCCAN_USERS = [
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
      equipment_needed: ['wifi', 'coffee', 'screen']
    }
  },
  {
    id: '00000000-0000-0000-0000-000000000002',
    email: 'mehdi@spotwork.ma',
    full_name: 'Mehdi El Fassi',
    phone: '+212 6 62 34 56 78',
    role: 'manager',
    preferences: { location_preference: 'Casablanca' }
  },
  {
    id: '00000000-0000-0000-0000-000000000003',
    email: 'admin@spotwork.ma',
    full_name: 'Fatima Zahra Alaoui',
    phone: '+212 5 22 40 50 60',
    role: 'admin',
    preferences: {}
  }
];

const MOROCCAN_SPACES = [
  {
    id: '10000000-0000-0000-0000-000000000001',
    name: "L'Atelier Maarif",
    description: "Ancien atelier baigné de lumière naturelle au cœur de Maarif. Postes ergonomiques, phone boxes insonorisées, rooftop et communauté dynamique de résidents tech et startups.",
    location: "Casablanca · Maarif",
    latitude: 33.5855,
    longitude: -7.6322,
    owner_id: '00000000-0000-0000-0000-000000000002',
    price_per_hour: 45.0,
    capacity: 45,
    amenities: ["wifi", "coffee", "screen", "print", "access", "terrace"],
    photos: [
      "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=900&q=70",
      "https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=900&q=70"
    ],
    rating: 4.9
  },
  {
    id: '10000000-0000-0000-0000-000000000002',
    name: "Studio Guéliz",
    description: "Studio créatif et podcast insonorisé avec lumière réglable, fond vert, micros pros et mur inscriptible. Idéal pour ateliers, workshops et sessions brainstorm.",
    location: "Marrakech · Guéliz",
    latitude: 31.6346,
    longitude: -8.0125,
    owner_id: '00000000-0000-0000-0000-000000000002',
    price_per_hour: 65.0,
    capacity: 12,
    amenities: ["wifi", "screen", "board", "coffee"],
    photos: [
      "https://images.unsplash.com/photo-1541746972996-4e0b0f43e02a?auto=format&fit=crop&w=900&q=70"
    ],
    rating: 4.8
  },
  {
    id: '10000000-0000-0000-0000-000000000003',
    name: "Oasis Work Gauthier",
    description: "Bureau privé fermé et climatisé, mobilier haut de gamme, salle de visio dédiée 4K et service de thé à la menthe offert.",
    location: "Casablanca · Gauthier",
    latitude: 33.5912,
    longitude: -7.6258,
    owner_id: '00000000-0000-0000-0000-000000000002',
    price_per_hour: 120.0,
    capacity: 6,
    amenities: ["wifi", "screen", "print", "access", "bike"],
    photos: [
      "https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&w=900&q=70"
    ],
    rating: 4.7
  },
  {
    id: '10000000-0000-0000-0000-000000000004',
    name: "Le Hub Agdal",
    description: "Salle de réunion premium au cœur de Rabat Agdal : écran interactif 4K tactile, visio native Zoom/Teams, paperboard digital. Eau et café offerts.",
    location: "Rabat · Agdal",
    latitude: 33.9981,
    longitude: -6.8525,
    owner_id: '00000000-0000-0000-0000-000000000002',
    price_per_hour: 50.0,
    capacity: 10,
    amenities: ["wifi", "screen", "board", "coffee"],
    photos: [
      "https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=900&q=70"
    ],
    rating: 4.9
  },
  {
    id: '10000000-0000-0000-0000-000000000005',
    name: "Marina Bay Focus",
    description: "Cabine acoustique ultra-silencieuse avec vue panoramique sur la baie de Tanger. Double vitrage acoustique, ventilation douce, prise USB-C 100W.",
    location: "Tanger · Malabata",
    latitude: 35.7767,
    longitude: -5.7984,
    owner_id: '00000000-0000-0000-0000-000000000002',
    price_per_hour: 25.0,
    capacity: 1,
    amenities: ["wifi", "access"],
    photos: [
      "https://images.unsplash.com/photo-1593115057322-e94b77572f20?auto=format&fit=crop&w=900&q=70"
    ],
    rating: 4.6
  },
  {
    id: '10000000-0000-0000-0000-000000000006',
    name: "L'Espace Anfa",
    description: "Espace coworking prestigieux sur le Boulevard d'Anfa. Silence studieux, fibre optique dédiée 1 Gbps et barista permanent.",
    location: "Casablanca · Anfa",
    latitude: 33.5880,
    longitude: -7.6450,
    owner_id: '00000000-0000-0000-0000-000000000002',
    price_per_hour: 40.0,
    capacity: 35,
    amenities: ["wifi", "coffee", "screen", "access", "bike"],
    photos: [
      "https://images.unsplash.com/photo-1527192491265-7e15c55b1ed2?auto=format&fit=crop&w=900&q=70"
    ],
    rating: 4.8
  },
  {
    id: '10000000-0000-0000-0000-000000000007',
    name: "Coworking Palm Hivernage",
    description: "Atelier modulable entouré de palmiers avec terrasse ensoleillée pour les pauses et sessions de networking. Mobilier artisanal contemporain.",
    location: "Marrakech · Hivernage",
    latitude: 31.6230,
    longitude: -8.0160,
    owner_id: '00000000-0000-0000-0000-000000000002',
    price_per_hour: 55.0,
    capacity: 16,
    amenities: ["wifi", "board", "coffee", "terrace"],
    photos: [
      "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=900&q=70"
    ],
    rating: 4.8
  },
  {
    id: '10000000-0000-0000-0000-000000000008',
    name: "Technopark Agadir Hub",
    description: "Bureau d'équipe moderne au sein du Technopark d'Agadir. Équipements complets, environnement innovant et parking sécurisé 24/7.",
    location: "Agadir · Tilila",
    latitude: 30.4050,
    longitude: -9.5580,
    owner_id: '00000000-0000-0000-0000-000000000002',
    price_per_hour: 75.0,
    capacity: 8,
    amenities: ["wifi", "screen", "access", "print"],
    photos: [
      "https://images.unsplash.com/photo-1497215842964-222b430dc094?auto=format&fit=crop&w=900&q=70"
    ],
    rating: 4.7
  },
  {
    id: '10000000-0000-0000-0000-000000000009',
    name: "Détroit Meeting Tanger",
    description: "Salle panoramique en plein centre-ville de Tanger avec vue sur le détroit de Gibraltar. Configuration flexible en U ou théâtre.",
    location: "Tanger · Centre",
    latitude: 35.7820,
    longitude: -5.8110,
    owner_id: '00000000-0000-0000-0000-000000000002',
    price_per_hour: 45.0,
    capacity: 14,
    amenities: ["wifi", "screen", "board", "coffee", "terrace"],
    photos: [
      "https://images.unsplash.com/photo-1517502884422-41eaead166d4?auto=format&fit=crop&w=900&q=70"
    ],
    rating: 4.8
  },
  {
    id: '10000000-0000-0000-0000-000000000010',
    name: "Fès Medina Lab",
    description: "Hub collaboratif moderne mêlant architecture marocaine et équipements high-tech. Ambiance chaleureuse et communauté cosmopolite.",
    location: "Fès · Ville Nouvelle",
    latitude: 34.0330,
    longitude: -5.0010,
    owner_id: '00000000-0000-0000-0000-000000000002',
    price_per_hour: 35.0,
    capacity: 30,
    amenities: ["wifi", "coffee", "print", "access"],
    photos: [
      "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=900&q=70"
    ],
    rating: 4.8
  }
];

async function seed() {
  console.log('Synchronisation des données marocaines vers Supabase Cloud...');
  
  // 1. Users
  for (const u of MOROCCAN_USERS) {
    const { error } = await supabase.from('users').upsert(u);
    if (error) console.warn('User upsert notice:', u.full_name, error.message);
    else console.log('✅ Utilisateur synchronisé:', u.full_name);
  }

  // 2. Spaces
  for (const s of MOROCCAN_SPACES) {
    const { error } = await supabase.from('spaces').upsert(s);
    if (error) console.warn('Space upsert notice:', s.name, error.message);
    else console.log('✅ Espace synchronisé:', s.name);
  }

  console.log('Terminé !');
}

seed();
