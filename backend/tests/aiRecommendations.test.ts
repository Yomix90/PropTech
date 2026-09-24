import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';

const app = createApp();

describe('Moteur d’IA Recommandations (Claude API) et Avis Clients', () => {
  const clientToken = 'mock-token-client';

  it('génère et retourne les 3 recommandations IA pour l’utilisateur', async () => {
    const res = await request(app)
      .get('/api/recommendations')
      .set('Authorization', `Bearer ${clientToken}`);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
    expect(Array.isArray(res.body.data.recommendations)).toBe(true);
    expect(res.body.data.recommendations.length).toBeLessThanOrEqual(3);

    const firstRec = res.body.data.recommendations[0];
    expect(firstRec).toBeDefined();
    expect(firstRec.reason).toBeDefined();
    expect(typeof firstRec.reason).toBe('string');
    expect(firstRec.spaces).toBeDefined();
    expect(firstRec.spaces.name).toBeDefined();
  });

  it('permet d’enregistrer le clic sur une recommandation', async () => {
    // 1. Récupérer l'id d'une recommandation
    const listRes = await request(app)
      .get('/api/recommendations')
      .set('Authorization', `Bearer ${clientToken}`);

    const recId = listRes.body.data.recommendations[0].id;

    // 2. Marquer comme cliqué
    const clickRes = await request(app)
      .post(`/api/recommendations/${recId}/click`)
      .set('Authorization', `Bearer ${clientToken}`);

    expect(clickRes.status).toBe(200);
    expect(clickRes.body.status).toBe('success');
    expect(clickRes.body.data.recommendation.clicked).toBe(true);
  });

  it('rejette un avis si l’utilisateur n’a pas réservé cet espace', async () => {
    const res = await request(app)
      .post('/api/reviews')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({
        booking_id: '00000000-0000-0000-0000-000000000999',
        space_id: '10000000-0000-0000-0000-000000000001',
        rating: 5,
        comment: 'Très bon espace',
      });

    expect(res.status).toBe(403);
    expect(res.body.code).toBe('INVALID_REVIEW_TARGET');
  });

  it('enregistre l’avis et recalcule la note de l’espace pour une réservation valide', async () => {
    // Réservation existante pour Studio Canopée (space_id: 10000000-0000-0000-0000-000000000002)
    // Créons d'abord une réservation dédiée pour tester l'avis
    const bookRes = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({
        space_id: '10000000-0000-0000-0000-000000000003', // Le Hub Bastille
        booking_date: '2026-11-20',
        start_time: '09:00',
        end_time: '12:00',
      });

    expect(bookRes.status).toBe(201);
    const bookingId = bookRes.body.data.booking.id;

    const reviewRes = await request(app)
      .post('/api/reviews')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({
        booking_id: bookingId,
        space_id: '10000000-0000-0000-0000-000000000003',
        rating: 5,
        comment: 'Bureau d’un calme exceptionnel, visio 4K sans accroc !',
      });

    expect(reviewRes.status).toBe(201);
    expect(reviewRes.body.status).toBe('success');
    expect(reviewRes.body.data.review.rating).toBe(5);
  });
});
