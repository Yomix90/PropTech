import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';

const app = createApp();

describe('Sécurité RBAC et Dashboard Gestionnaire', () => {
  const clientToken = 'mock-token-client';
  const managerToken = 'mock-token-manager';

  it('bloque l’accès au dashboard gestionnaire sans token (401)', async () => {
    const res = await request(app).get('/api/manager/dashboard');

    expect(res.status).toBe(401);
    expect(res.body.code).toBe('UNAUTHORIZED');
  });

  it('bloque l’accès au dashboard gestionnaire pour un simple client (403 Forbidden)', async () => {
    const res = await request(app)
      .get('/api/manager/dashboard')
      .set('Authorization', `Bearer ${clientToken}`);

    expect(res.status).toBe(403);
    expect(res.body.code).toBe('FORBIDDEN');
    expect(res.body.message).toContain('Rôles autorisés: manager, admin');
  });

  it('autorise l’accès au dashboard gestionnaire pour un manager (200 OK)', async () => {
    const res = await request(app)
      .get('/api/manager/dashboard')
      .set('Authorization', `Bearer ${managerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
    expect(res.body.data.kpis).toBeDefined();
    expect(res.body.data.kpis.monthlyRevenue).toBeGreaterThan(0);
    expect(Array.isArray(res.body.data.revenueByMonth)).toBe(true);
    expect(Array.isArray(res.body.data.weeklyOccupancy)).toBe(true);
    expect(Array.isArray(res.body.data.spacesOccupancy)).toBe(true);
    expect(Array.isArray(res.body.data.aiInsights)).toBe(true);
  });

  it('empêche un client d’ajouter un espace de coworking (403)', async () => {
    const res = await request(app)
      .post('/api/spaces')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({
        name: 'Tentative Fraude',
        description: 'Espace non autorisé par un client',
        location: 'Paris',
        price_per_hour: 50,
        capacity: 10,
      });

    expect(res.status).toBe(403);
    expect(res.body.code).toBe('FORBIDDEN');
  });

  it('autorise un manager à créer un nouvel espace (201)', async () => {
    const res = await request(app)
      .post('/api/spaces')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        name: 'Espace Panoramique Étoile',
        description: 'Magnifique espace avec vue panoramique sur l’Arc de Triomphe.',
        location: 'Paris · 8e Étoile',
        price_per_hour: 45,
        capacity: 20,
        amenities: ['wifi', 'coffee', 'screen'],
      });

    expect(res.status).toBe(201);
    expect(res.body.status).toBe('success');
    expect(res.body.data.space.name).toBe('Espace Panoramique Étoile');
  });
});
