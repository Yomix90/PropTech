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
   * Algorithme heuristique déterministe de recommandation (Fallback transparent)
   */
  private static calculateHeuristicRecommendations(
    user: UserEntity,
    spaces: SpaceEntity[],
    pastBookings: BookingEntity[]
  ): GeneratedRecommendation[] {
    const prefs = user.preferences || {};
    const maxBudget = prefs.budget_max || 100;
    const locPref = (prefs.location_preference || '').toLowerCase();
    const neededAmenities = new Set(prefs.equipment_needed || ['wifi']);

    const pastSpaceIds = new Set(pastBookings.map((b) => b.space_id));

    const scored = spaces.map((space) => {
      let score = 50;

      // Bonus note moyenne
      score += Math.round(space.rating * 6); // ex: 4.9 * 6 = ~29

      // Bonus localisation
      if (locPref && space.location.toLowerCase().includes(locPref)) {
        score += 15;
      }

      // Bonus budget
      if (space.price_per_hour <= maxBudget) {
        score += 10;
      }

      // Bonus équipements correspondants
      const matchedAmenities = space.amenities.filter((a) => neededAmenities.has(a));
      score += matchedAmenities.length * 4;

      // Bonus nouveauté (si pas encore réservé)
      if (!pastSpaceIds.has(space.id)) {
        score += 5;
      }

      score = Math.min(score, 99);

      let reason = `Correspond à vos critères (${space.location.split('·')[0].trim()}) et dispose d'une note d'excellence de ${space.rating}/5.`;
      if (matchedAmenities.length > 0) {
        reason = `Idéal pour vos besoins : comprend ${matchedAmenities.slice(0, 2).join(' et ')} dans votre budget de ${space.price_per_hour} €/h.`;
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
