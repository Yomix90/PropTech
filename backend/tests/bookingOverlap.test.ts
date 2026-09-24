import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import {
  parseTimeToMinutes,
  doTimesOverlap,
  calculateTotalPrice,
} from '../src/services/bookingService.js';

const app = createApp();

describe('Booking Service - Algorithme de chevauchement temporel', () => {
  it('convertit correctement les chaînes d’heure en minutes', () => {
    expect(parseTimeToMinutes('00:00')).toBe(0);
    expect(parseTimeToMinutes('09:00')).toBe(540);
    expect(parseTimeToMinutes('09:30')).toBe(570);
    expect(parseTimeToMinutes('18:00')).toBe(1080);
    expect(parseTimeToMinutes('23:59')).toBe(1439);
  });

  it('détecte correctement l’absence de chevauchement pour des créneaux contigus ou disjoints', () => {
    // A se termine quand B commence (contigus)
    expect(doTimesOverlap('09:00', '10:00', '10:00', '11:00')).toBe(false);
    // A est strictement avant B
    expect(doTimesOverlap('08:00', '09:00', '14:00', '15:00')).toBe(false);
    // A est strictement après B
    expect(doTimesOverlap('15:00', '16:00', '10:00', '12:00')).toBe(false);
  });

  it('détecte tous les cas de chevauchement conflictuel', () => {
    // Créneau A empiète sur le début de B
    expect(doTimesOverlap('09:30', '10:30', '10:00', '12:00')).toBe(true);
    // Créneau A empiète sur la fin de B
    expect(doTimesOverlap('11:30', '13:00', '10:00', '12:00')).toBe(true);
    // Créneau A est complètement à l’intérieur de B
    expect(doTimesOverlap('10:15', '11:45', '10:00', '12:00')).toBe(true);
    // Créneau A englobe complètement B
    expect(doTimesOverlap('09:00', '13:00', '10:00', '12:00')).toBe(true);
    // Créneaux exactement identiques
    expect(doTimesOverlap('10:00', '12:00', '10:00', '12:00')).toBe(true);
  });

  it('calcule exactement le tarif total selon la durée et le prix horaire', () => {
    // 2 heures à 29 €/h = 58 €
    expect(calculateTotalPrice('09:00', '11:00', 29)).toBe(58);
    // 1 heure et demie à 38 €/h = 57 €
    expect(calculateTotalPrice('10:00', '11:30', 38)).toBe(57);
    // 8 heures à 9 €/h = 72 €
    expect(calculateTotalPrice('09:00', '17:00', 9)).toBe(72);
  });
});

describe('API Bookings - Tests d’intégration REST', () => {
  const clientToken = 'mock-token-client';
  const spaceId = '10000000-0000-0000-0000-000000000005'; // Cabine Mute (9€/h)

  it('refuse une réservation si l’utilisateur n’est pas authentifié', async () => {
    const res = await request(app).post('/api/bookings').send({
      space_id: spaceId,
      booking_date: '2026-11-15',
      start_time: '10:00',
      end_time: '12:00',
    });

    expect(res.status).toBe(401);
    expect(res.body.status).toBe('error');
  });

  it('rejette une réservation si l’heure de fin est antérieure à l’heure de début', async () => {
    const res = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({
        space_id: spaceId,
        booking_date: '2026-11-15',
        start_time: '14:00',
        end_time: '12:00',
      });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  it('crée avec succès une réservation valide', async () => {
    const res = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({
        space_id: spaceId,
        booking_date: '2026-11-15',
        start_time: '14:00',
        end_time: '16:00',
      });

    expect(res.status).toBe(201);
    expect(res.body.status).toBe('success');
    expect(res.body.data.booking.total_price).toBe(50); // 2h * 25 DH
    expect(res.body.data.booking.status).toBe('confirmed');
  });

  it('rejette avec 409 Conflict une tentative de réservation sur un créneau chevauchant', async () => {
    // Même espace, même date, créneau chevauchant 15:00 - 17:00 (empiète sur 14:00 - 16:00)
    const res = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({
        space_id: spaceId,
        booking_date: '2026-11-15',
        start_time: '15:00',
        end_time: '17:00',
      });

    expect(res.status).toBe(409);
    expect(res.body.code).toBe('SLOT_UNAVAILABLE');
    expect(res.body.message).toContain('déjà réservé');
  });

  it('permet de lister les réservations de l’utilisateur', async () => {
    const res = await request(app)
      .get('/api/bookings/user')
      .set('Authorization', `Bearer ${clientToken}`);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
    expect(Array.isArray(res.body.data.bookings)).toBe(true);
    expect(res.body.data.bookings.length).toBeGreaterThan(0);
  });
});
