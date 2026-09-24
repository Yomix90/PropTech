import { Request, Response, NextFunction } from 'express';
import { supabase, isLiveSupabase, localStore, SpaceEntity } from '../config/supabase.js';
import { AuthenticatedRequest } from '../middleware/auth.js';

export class SpacesController {
  static async getSpaces(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { city, min_price, max_price, capacity, min_rating, search } = req.query as any;

      if (isLiveSupabase) {
        let query = supabase.from('spaces').select('*, users(full_name, email)');

        if (city) {
          query = query.ilike('location', `%${city}%`);
        }
        if (min_price) {
          query = query.gte('price_per_hour', Number(min_price));
        }
        if (max_price) {
          query = query.lte('price_per_hour', Number(max_price));
        }
        if (capacity) {
          query = query.gte('capacity', Number(capacity));
        }
        if (min_rating) {
          query = query.gte('rating', Number(min_rating));
        }
        if (search) {
          query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
        }

        const { data, error } = await query;
        if (error) throw error;

        res.status(200).json({
          status: 'success',
          results: data.length,
          data: { spaces: data },
        });
        return;
      }

      // Local store filtering
      let spaces = [...localStore.spaces];

      if (city) {
        spaces = spaces.filter((s) => s.location.toLowerCase().includes(String(city).toLowerCase()));
      }
      if (min_price) {
        spaces = spaces.filter((s) => s.price_per_hour >= Number(min_price));
      }
      if (max_price) {
        spaces = spaces.filter((s) => s.price_per_hour <= Number(max_price));
      }
      if (capacity) {
        spaces = spaces.filter((s) => s.capacity >= Number(capacity));
      }
      if (min_rating) {
        spaces = spaces.filter((s) => s.rating >= Number(min_rating));
      }
      if (search) {
        const q = String(search).toLowerCase();
        spaces = spaces.filter((s) => s.name.toLowerCase().includes(q) || s.description.toLowerCase().includes(q));
      }

      res.status(200).json({
        status: 'success',
        results: spaces.length,
        data: { spaces },
      });
    } catch (error) {
      next(error);
    }
  }

  static async getSpaceById(req: Request, res: Response, next: NextFunction): Promise<void> {
    const { id } = req.params;

    try {
      if (isLiveSupabase) {
        const [sRes, rRes] = await Promise.all([
          supabase.from('spaces').select('*, users(id, full_name, email)').eq('id', id).single(),
          supabase.from('reviews').select('*, users(full_name)').eq('space_id', id).order('created_at', { ascending: false }),
        ]);

        if (sRes.error || !sRes.data) {
          res.status(404).json({
            status: 'error',
            code: 'SPACE_NOT_FOUND',
            message: 'Espace de travail introuvable',
          });
          return;
        }

        res.status(200).json({
          status: 'success',
          data: {
            space: sRes.data,
            reviews: rRes.data || [],
          },
        });
        return;
      }

      const space = localStore.spaces.find((s) => s.id === id);
      if (!space) {
        res.status(404).json({
          status: 'error',
          code: 'SPACE_NOT_FOUND',
          message: 'Espace de travail introuvable',
        });
        return;
      }

      const reviews = localStore.reviews.filter((r) => r.space_id === id);
      const owner = localStore.users.find((u) => u.id === space.owner_id);

      res.status(200).json({
        status: 'success',
        data: {
          space: {
            ...space,
            owner: owner ? { id: owner.id, full_name: owner.full_name, email: owner.email } : null,
          },
          reviews,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  static async createSpace(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ status: 'error', message: 'Non authentifié' });
        return;
      }

      const { name, description, location, latitude, longitude, price_per_hour, capacity, amenities, photos } = req.body;

      const newSpace: SpaceEntity = {
        id: crypto.randomUUID ? crypto.randomUUID() : `spc-${Date.now()}`,
        name,
        description,
        location,
        latitude: latitude || 48.8566,
        longitude: longitude || 2.3522,
        owner_id: req.user.id,
        price_per_hour,
        capacity,
        amenities: amenities || [],
        photos: photos || [],
        rating: 0,
        available_from: new Date().toISOString(),
        created_at: new Date().toISOString(),
      };

      if (isLiveSupabase) {
        const { data, error } = await supabase.from('spaces').insert(newSpace).select().single();
        if (error) throw error;

        res.status(201).json({
          status: 'success',
          message: 'Espace créé avec succès',
          data: { space: data },
        });
        return;
      }

      localStore.spaces.push(newSpace);

      res.status(201).json({
        status: 'success',
        message: 'Espace créé avec succès',
        data: { space: newSpace },
      });
    } catch (error) {
      next(error);
    }
  }
}
