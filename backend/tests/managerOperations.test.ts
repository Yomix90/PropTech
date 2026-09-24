import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { localStore } from '../config/supabase.js';

const app = createApp();

const clientToken = 'mock-token-client'; // Youssef Amrani (client)
const managerToken = 'mock-token-manager'; // Mehdi El Fassi (manager)
const adminToken = 'mock-token-admin'; // Fatima Zahra Alaoui (admin)

describe('API Manager Operations - Gestion des espaces & demandes', () => {
  it('permet à un gestionnaire de modifier le tarif d’un espace existant', async () => {
    const spaceId = '10000000-0000-0000-0000-000000000001'; // L'Atelier Maarif
    const res = await request(app)
      .patch(`/api/spaces/${spaceId}`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        price_per_hour: 55,
        capacity: 50,
      });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
    expect(res.body.data.space.price_per_hour).toBe(55);
    expect(res.body.data.space.capacity).toBe(50);
  });

  it('refuse la modification d’un espace à un simple client (403 Forbidden)', async () => {
    const spaceId = '10000000-0000-0000-0000-000000000001';
    const res = await request(app)
      .patch(`/api/spaces/${spaceId}`)
      .set('Authorization', `Bearer ${clientToken}`)
      .send({ price_per_hour: 10 });

    expect(res.status).toBe(403);
    expect(res.body.code).toBe('FORBIDDEN');
  });

  it('permet au gestionnaire de consulter toutes les demandes de réservations', async () => {
    const res = await request(app)
      .get('/api/manager/bookings')
      .set('Authorization', `Bearer ${managerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
    expect(Array.isArray(res.body.data.bookings)).toBe(true);
    expect(res.body.results).toBeGreaterThan(0);
  });

  it('permet au gestionnaire d’accepter et confirmer une réservation en attente', async () => {
    const bookingId = '20000000-0000-0000-0000-000000000002'; // Réservation pending
    const res = await request(app)
      .patch(`/api/bookings/${bookingId}/status`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ status: 'confirmed' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
    expect(res.body.data.booking.status).toBe('confirmed');
  });

  it('permet à un administrateur de supprimer un espace', async () => {
    // Créer un espace temporaire pour le supprimer
    const created = await request(app)
      .post('/api/spaces')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Espace Test Suppression',
        description: 'Espace temporaire pour tester la suppression administrative',
        location: 'Casablanca · Maarif',
        price_per_hour: 40,
        capacity: 10,
        amenities: ['wifi'],
        photos: ['https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=900&q=70'],
      });

    const tempId = created.body.data.space.id;

    const res = await request(app)
      .delete(`/api/spaces/${tempId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
    expect(res.body.message).toContain('supprimé');
  });

  it('bloque la consultation des paiements et revenus pour un client (403)', async () => {
    const res = await request(app)
      .get('/api/manager/payments')
      .set('Authorization', `Bearer ${clientToken}`);

    expect(res.status).toBe(403);
    expect(res.body.code).toBe('FORBIDDEN');
  });

  it('permet au gestionnaire d’accéder à l’historique des paiements et revenus (200)', async () => {
    const res = await request(app)
      .get('/api/manager/payments')
      .set('Authorization', `Bearer ${managerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
    expect(res.body.data.summary).toBeDefined();
    expect(res.body.data.summary.totalGross).toBeGreaterThan(0);
    expect(res.body.data.summary.currency).toBe('MAD');
    expect(Array.isArray(res.body.data.payments)).toBe(true);
  });
});
