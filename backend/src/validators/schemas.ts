import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email('Format email invalide'),
  password: z.string().min(6, 'Le mot de passe doit comporter au moins 6 caractères'),
  full_name: z.string().min(2, 'Le nom complet est obligatoire'),
  phone: z.string().optional(),
  role: z.enum(['client', 'manager', 'admin']).default('client'),
  preferences: z
    .object({
      budget_min: z.number().min(0).optional(),
      budget_max: z.number().min(0).optional(),
      location_preference: z.string().optional(),
      equipment_needed: z.array(z.string()).optional(),
    })
    .optional(),
});

export const loginSchema = z.object({
  email: z.string().email('Format email invalide'),
  password: z.string().min(1, 'Le mot de passe est obligatoire'),
});

export const updatePreferencesSchema = z
  .object({
    budget_min: z.number().min(0).optional(),
    budget_max: z.number().min(0).optional(),
    location_preference: z.string().optional(),
    city: z.string().optional(),
    type: z.string().optional(),
    mail: z.boolean().optional(),
    push: z.boolean().optional(),
    news: z.boolean().optional(),
    equipment_needed: z.array(z.string()).optional(),
  })
  .passthrough();

export const spaceFilterSchema = z.object({
  city: z.string().optional(),
  type: z.string().optional(),
  min_price: z.coerce.number().min(0).optional(),
  max_price: z.coerce.number().min(0).optional(),
  capacity: z.coerce.number().min(1).optional(),
  min_rating: z.coerce.number().min(0).max(5).optional(),
  search: z.string().optional(),
});

export const createSpaceSchema = z.object({
  name: z.string().min(2, 'Le nom de l’espace est obligatoire'),
  description: z.string().min(10, 'La description doit comporter au moins 10 caractères'),
  location: z.string().min(3, 'La localisation est obligatoire'),
  latitude: z.number().optional().default(33.5883),
  longitude: z.number().optional().default(-7.6335),
  price_per_hour: z.number().min(1, 'Le tarif horaire doit être positif'),
  capacity: z.number().int().min(1, 'La capacité minimale est de 1 personne'),
  amenities: z.array(z.string()).default([]),
  photos: z.array(z.string().url()).default([]),
});

export const updateSpaceSchema = z.object({
  name: z.string().min(2, 'Le nom de l’espace est obligatoire').optional(),
  description: z.string().min(10, 'La description doit comporter au moins 10 caractères').optional(),
  location: z.string().min(3, 'La localisation est obligatoire').optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  price_per_hour: z.number().min(1, 'Le tarif horaire doit être positif').optional(),
  capacity: z.number().int().min(1, 'La capacité minimale est de 1 personne').optional(),
  amenities: z.array(z.string()).optional(),
  photos: z.array(z.string().url()).optional(),
});

export const updateBookingStatusSchema = z.object({
  status: z.enum(['confirmed', 'cancelled', 'completed', 'pending'], {
    errorMap: () => ({ message: 'Statut de réservation invalide' }),
  }),
});

export const createBookingSchema = z
  .object({
    space_id: z.string().min(1, 'Identifiant d’espace invalide'),
    booking_date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Format de date invalide (YYYY-MM-DD attendu)'),
    start_time: z
      .string()
      .regex(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/, 'Format d’heure de début invalide (HH:MM ou HH:MM:SS)'),
    end_time: z
      .string()
      .regex(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/, 'Format d’heure de fin invalide (HH:MM ou HH:MM:SS)'),
    seats: z.number().int().min(1).optional(),
    total_price: z.number().positive().optional(),
  })
  .refine(
    (data) => {
      const s = data.start_time.slice(0, 5);
      const e = data.end_time.slice(0, 5);
      return e > s;
    },
    {
      message: 'L’heure de fin doit être strictement postérieure à l’heure de début',
      path: ['end_time'],
    }
  );

export const createReviewSchema = z.object({
  booking_id: z.string().uuid('Identifiant de réservation invalide'),
  space_id: z.string().uuid('Identifiant d’espace invalide'),
  rating: z.number().int().min(1, 'Note minimale 1').max(5, 'Note maximale 5'),
  comment: z.string().min(3, 'Le commentaire doit comporter au moins 3 caractères'),
});
