import Anthropic from '@anthropic-ai/sdk';
import { env } from '../config/env.js';
import {
  supabase,
  isLiveSupabase,
  localStore,
  UserEntity,
  SpaceEntity,
  BookingEntity,
  AIRecommendationEntity,
} from '../config/supabase.js';

export interface GeneratedRecommendation {
  space_id: string;
  reason: string;
  match_score: number;
}

export class ClaudeService {
  private static anthropicClient: Anthropic | null = null;

  private static getClient(): Anthropic | null {
    if (!this.anthropicClient && env.ANTHROPIC_API_KEY && env.ANTHROPIC_API_KEY.trim() !== '') {
      this.anthropicClient = new Anthropic({
        apiKey: env.ANTHROPIC_API_KEY,
      });
    }
    return this.anthropicClient;
  }

  /**
   * Génère les recommandations d'espaces via Claude API ou via fallback heuristique
   */
  static async generateRecommendations(userId: string): Promise<AIRecommendationEntity[]> {
    // 1. Récupérer les données de l'utilisateur, son historique et le catalogue d'espaces
    let user: UserEntity | undefined;
    let pastBookings: BookingEntity[] = [];
    let spaces: SpaceEntity[] = [];

    if (isLiveSupabase) {
      const [uRes, bRes, sRes] = await Promise.all([
        supabase.from('users').select('*').eq('id', userId).single(),
        supabase.from('bookings').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(5),
        supabase.from('spaces').select('*').limit(20),
      ]);

      if (uRes.data) user = uRes.data as UserEntity;
      if (bRes.data) pastBookings = bRes.data as BookingEntity[];
      if (sRes.data) spaces = sRes.data as SpaceEntity[];
    } else {
      user = localStore.users.find((u) => u.id === userId);
      pastBookings = localStore.bookings.filter((b) => b.user_id === userId);
      spaces = localStore.spaces;
    }

    if (!user) {
      user = localStore.users[0]; // Léa Martin par défaut
    }

    const client = this.getClient();
    let recs: GeneratedRecommendation[] = [];

    if (client && spaces.length > 0) {
      try {
        const prompt = `
Tu es le moteur de recommandation IA de Spotwork, une plateforme de coworking premium.
Ton rôle est de sélectionner exactement 3 espaces parmi le catalogue ci-dessous qui correspondent le mieux au profil de l'utilisateur.

Profil utilisateur:
- Nom: ${user.full_name}
- Préférences: ${JSON.stringify(user.preferences || {})}
- Historique récent: ${pastBookings.length} réservations (${pastBookings.map((b) => `Espace: ${b.space_id}, Date: ${b.booking_date}, Prix: ${b.total_price}€`).join('; ')})

Catalogue d'espaces disponibles:
${JSON.stringify(
  spaces.map((s) => ({
    id: s.id,
    name: s.name,
    location: s.location,
    price_per_hour: s.price_per_hour,
    capacity: s.capacity,
    amenities: s.amenities,
    rating: s.rating,
    description: s.description,
  })),
  null,
  2
)}

Réponds UNIQUEMENT avec un tableau JSON strict contenant 3 objets au format suivant, sans balise markdown superflu:
[
  {
    "space_id": "UUID_DE_L_ESPACE",
    "reason": "Explication personnalisée percutante en français (1 à 2 phrases max) justifiant pourquoi cet espace correspond à ses critères",
    "match_score": 95
  }
]
`;

        const response = await client.messages.create({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 800,
          temperature: 0.2,
          system: 'Tu es un assistant IA spécialisé dans la recommandation d’espaces de coworking. Tu réponds strictement en JSON.',
          messages: [{ role: 'user', content: prompt }],
        });

        const textContent = response.content[0].type === 'text' ? response.content[0].text : '';
        const cleaned = textContent.replace(/```json/g, '').replace(/```/g, '').trim();
        recs = JSON.parse(cleaned);
      } catch (error) {
        console.warn('Claude API indisponible ou erreur d’inférence, passage en fallback heuristique:', error);
        recs = this.calculateHeuristicRecommendations(user, spaces, pastBookings);
      }
    } else {
      // Fallback heuristique local
      recs = this.calculateHeuristicRecommendations(user, spaces, pastBookings);
    }

    // 2. Persister les recommandations générées
    const createdEntities: AIRecommendationEntity[] = [];

    for (const rec of recs.slice(0, 3)) {
      const entity: AIRecommendationEntity = {
        id: crypto.randomUUID ? crypto.randomUUID() : `rec-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        user_id: user.id,
        recommended_space_id: rec.space_id,
        reason: rec.reason,
        clicked: false,
        created_at: new Date().toISOString(),
      };

      if (isLiveSupabase) {
        await supabase.from('ai_recommendations').insert({
          id: entity.id,
          user_id: entity.user_id,
          recommended_space_id: entity.recommended_space_id,
          reason: entity.reason,
          clicked: false,
        });
      } else {
        // Enregistrer dans le local store (remplacer les anciennes)
        localStore.aiRecommendations = localStore.aiRecommendations.filter(
          (r) => !(r.user_id === user!.id && r.recommended_space_id === entity.recommended_space_id)
        );
        localStore.aiRecommendations.unshift(entity);
      }

      createdEntities.push(entity);
    }

    return createdEntities;
  }

  /**
   * Algorithme heuristique déterministe de recommandation (Fallback intelligent & résilient)
   */
  private static calculateHeuristicRecommendations(
    user: UserEntity,
    spaces: SpaceEntity[],
    pastBookings: BookingEntity[]
  ): GeneratedRecommendation[] {
    const prefs = user.preferences || {};
    const cityPref = String(prefs.city || prefs.location_preference || user.city || 'Casablanca').toLowerCase();
    const typePref = String(prefs.type || '').toLowerCase();
    const maxBudget = Number(prefs.budget_max) || 200;
    const neededAmenities = new Set(prefs.equipment_needed || ['wifi', 'coffee']);

    // Analyse des habitudes de réservation passées
    const bookedSpacesCount: Record<string, number> = {};
    const bookedCitiesCount: Record<string, number> = {};
    let totalSpent = 0;

    for (const b of pastBookings) {
      bookedSpacesCount[b.space_id] = (bookedSpacesCount[b.space_id] || 0) + 1;
      const sp = spaces.find(s => s.id === b.space_id);
      if (sp) {
        const city = sp.location.split('·')[0].trim().toLowerCase();
        bookedCitiesCount[city] = (bookedCitiesCount[city] || 0) + 1;
        totalSpent += sp.price_per_hour;
      }
    }

    let topHabitCity = '';
    let maxCityBookings = 0;
    for (const [c, cnt] of Object.entries(bookedCitiesCount)) {
      if (cnt > maxCityBookings) {
        maxCityBookings = cnt;
        topHabitCity = c;
      }
    }

    const avgPriceHabit = pastBookings.length > 0 ? Math.round(totalSpent / pastBookings.length) : 50;

    const scored = spaces.map((space) => {
      let score = 50;
      const spaceCity = space.location.split('·')[0].trim().toLowerCase();
      const reasons: string[] = [];

      // 1. Bonus Note d'excellence (jusqu'à 25 pts)
      score += Math.round(space.rating * 5);

      // 2. Bonus Préférence et Habitude de Ville (jusqu'à 25 pts)
      if (cityPref && spaceCity.includes(cityPref)) {
        score += 25;
        reasons.push(`dans votre ville de prédilection (${space.location.split('·')[0].trim()})`);
      } else if (topHabitCity && spaceCity.includes(topHabitCity)) {
        score += 18;
        reasons.push(`selon vos habitudes régulières à ${space.location.split('·')[0].trim()}`);
      }

      // 3. Bonus Préférence de Type d'espace (jusqu'à 20 pts)
      if (typePref && space.description.toLowerCase().includes(typePref)) {
        score += 20;
        reasons.push(`adapté à votre préférence de format de travail`);
      }

      // 4. Bonus Habitude Budgétaire (jusqu'à 15 pts)
      if (space.price_per_hour <= maxBudget) {
        score += 10;
        if (Math.abs(space.price_per_hour - avgPriceHabit) <= 25) {
          score += 5;
        }
      }

      // 5. Bonus Équipements récurrents
      const matchedAmenities = space.amenities.filter((a) => neededAmenities.has(a));
      score += Math.min(matchedAmenities.length * 4, 15);

      // 6. Bonus d'historique (espace favori habituel ou nouvelle opportunité)
      const timesBooked = bookedSpacesCount[space.id] || 0;
      if (timesBooked > 0) {
        score += 8;
        reasons.push(`espace déjà réservé ${timesBooked} fois par vous`);
      } else {
        score += 5; // Découverte
      }

      score = Math.min(Math.max(score, 70), 99);

      let reason = `Sélectionné pour vous : `;
      if (reasons.length > 0) {
        reason += reasons.slice(0, 2).join(' et ') + `. `;
      }
      if (matchedAmenities.length > 0) {
        reason += `Équipé de ${matchedAmenities.slice(0, 2).join(' et ')} pour ${space.price_per_hour} DH/h.`;
      } else {
        reason += `Noté ${space.rating}/5 par les coworkers avec accès premium.`;
      }

      return {
        space_id: space.id,
        reason,
        match_score: score,
      };
    });

    scored.sort((a, b) => b.match_score - a.match_score);
    return scored.slice(0, 3);
  }
}
