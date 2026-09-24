import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';

const app = createApp();

describe('API Spaces - Tests de consultation et de filtrage', () => {
  it('retourne la liste complète des espaces sans filtre', async () => {
    const res = await request(app).get('/api/spaces');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
    expect(res.body.results).toBeGreaterThan(0);
    expect(Array.isArray(res.body.data.spaces)).toBe(true);
  });

  it('filtre efficacement par ville (Casablanca)', async () => {
    const res = await request(app).get('/api/spaces?city=Casablanca');

    expect(res.status).toBe(200);
    expect(res.body.data.spaces.length).toBeGreaterThan(0);
    for (const space of res.body.data.spaces) {
      expect(space.location.toLowerCase()).toContain('casablanca');
    }
  });

  it('filtre par budget maximum (max_price=30)', async () => {
    const res = await request(app).get('/api/spaces?max_price=30');

    expect(res.status).toBe(200);
    expect(res.body.data.spaces.length).toBeGreaterThan(0);
    for (const space of res.body.data.spaces) {
      expect(space.price_per_hour).toBeLessThanOrEqual(30);
    }
  });

  it('renvoie les détails complets d’un espace avec ses avis', async () => {
    const spaceId = '10000000-0000-0000-0000-000000000002'; // Studio Guéliz
    const res = await request(app).get(`/api/spaces/${spaceId}`);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
    expect(res.body.data.space.id).toBe(spaceId);
    expect(res.body.data.space.name).toBe('Studio Guéliz');
    expect(Array.isArray(res.body.data.reviews)).toBe(true);
  });

  it('retourne une 404 pour un identifiant d’espace inexistant', async () => {
    const res = await request(app).get('/api/spaces/10000000-0000-0000-0000-000000000999');

    expect(res.status).toBe(404);
    expect(res.body.code).toBe('SPACE_NOT_FOUND');
  });
});
