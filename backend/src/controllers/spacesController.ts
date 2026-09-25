import { Request, Response, NextFunction } from 'express';
import { supabase, isLiveSupabase, localStore, SpaceEntity } from '../config/supabase.js';
import { AuthenticatedRequest } from '../middleware/auth.js';

export class SpacesController {
  static async getSpaces(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { city, min_price, max_price, capacity, min_rating, search } = req.query as any;

      // Base catalog with all 10 authentic Moroccan spaces
      let spaces = [...localStore.spaces];

      // If Supabase is connected, merge any custom user-created spaces from Supabase
      if (isLiveSupabase) {
        try {
          const { data: sbSpaces } = await supabase.from('spaces').select('*, users(full_name, email)');
          if (sbSpaces && sbSpaces.length > 0) {
            const canonicalIds = new Set(spaces.map((s) => s.id));
            for (const sbSpace of sbSpaces) {
              if (!canonicalIds.has(sbSpace.id)) {
                spaces.push(sbSpace);
              }
            }
          }
        } catch (sbErr) {
          console.warn('⚠️ Supabase getSpaces notice:', sbErr);
        }
      }

      // Filter by city (Casablanca, Rabat, Marrakech, Tanger, Agadir, Fès)
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
    const id = String(req.params.id);

    try {
      // Find in localStore: matches exact UUID, or numeric ID padded to 12 digits, or endsWith
      let space = localStore.spaces.find(
        (s) =>
          s.id === id ||
          s.id.endsWith(id.padStart(12, '0')) ||
          s.id.endsWith(id)
      );

      // If not in canonical catalog and Supabase is live, try remote DB
      if (!space && isLiveSupabase) {
        try {
          const sRes = await supabase.from('spaces').select('*, users(id, full_name, email)').eq('id', id).single();
          if (sRes.data) {
            space = sRes.data;
          }
        } catch {}
      }

      if (!space) {
        res.status(404).json({
          status: 'error',
          code: 'SPACE_NOT_FOUND',
          message: 'Espace de travail introuvable',
        });
        return;
      }

      let reviews = localStore.reviews.filter((r) => r.space_id === space!.id);
      if (reviews.length === 0 && isLiveSupabase) {
        try {
          const rRes = await supabase.from('reviews').select('*, users(full_name)').eq('space_id', space.id).order('created_at', { ascending: false });
          if (rRes.data && rRes.data.length > 0) {
            reviews = rRes.data;
          }
        } catch {}
      }

      const owner = localStore.users.find((u) => u.id === space!.owner_id);

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
        latitude: latitude || 33.5855,
        longitude: longitude || -7.6322,
        owner_id: req.user.id,
        price_per_hour,
        capacity,
        amenities: amenities || [],
        photos: photos || [],
        rating: 5.0,
        available_from: new Date().toISOString(),
        created_at: new Date().toISOString(),
      };

      // Always save to localStore first
      localStore.spaces.unshift(newSpace);

      // Attempt Supabase insert if live
      if (isLiveSupabase) {
        try {
          await supabase.from('spaces').insert(newSpace);
        } catch (sbErr) {
          console.warn('⚠️ Supabase Cloud createSpace notice (persisted locally):', sbErr);
        }
      }

      res.status(201).json({
        status: 'success',
        message: 'Espace créé avec succès',
        data: { space: newSpace },
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateSpace(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    const id = String(req.params.id);

    try {
      if (!req.user) {
        res.status(401).json({ status: 'error', message: 'Non authentifié' });
        return;
      }

      let index = localStore.spaces.findIndex(
        (s) => s.id === id || s.id.endsWith(id.padStart(12, '0')) || s.id.endsWith(id)
      );

      // Si l'espace n'est pas encore dans localStore mais que Supabase est actif, tenter de le récupérer
      if (index === -1 && isLiveSupabase) {
        try {
          const sRes = await supabase.from('spaces').select('*').eq('id', id).single();
          if (sRes.data) {
            localStore.spaces.push(sRes.data);
            index = localStore.spaces.length - 1;
          }
        } catch {}
      }

      if (index === -1) {
        res.status(404).json({ status: 'error', message: 'Espace introuvable' });
        return;
      }

      const current = localStore.spaces[index];
      if (current.owner_id !== req.user.id && req.user.role !== 'admin') {
        res.status(403).json({ status: 'error', code: 'FORBIDDEN', message: 'Action non autorisée sur cet espace' });
        return;
      }

      const body = { ...req.body };
      const newName = body.name !== undefined ? body.name : current.name;
      const newDesc = body.description !== undefined ? body.description : (body.desc !== undefined ? body.desc : current.description);
      const newLocation = body.location !== undefined ? body.location : (body.city && body.district ? `${body.city} · ${body.district}` : current.location);
      const newPrice = body.price_per_hour !== undefined ? Number(body.price_per_hour) : (body.price !== undefined ? Number(body.price) : current.price_per_hour);
      const newCap = body.capacity !== undefined ? Number(body.capacity) : (body.cap !== undefined ? Number(body.cap) : current.capacity);
      const newAmenities = body.amenities !== undefined ? body.amenities : (body.am !== undefined ? body.am : current.amenities);
      const newPhotos = body.photos !== undefined ? body.photos : (body.imgs !== undefined ? body.imgs : current.photos);
      const newLat = body.latitude !== undefined ? Number(body.latitude) : current.latitude;
      const newLng = body.longitude !== undefined ? Number(body.longitude) : current.longitude;

      const updated: SpaceEntity = {
        ...current,
        name: newName,
        description: newDesc,
        location: newLocation,
        price_per_hour: newPrice,
        capacity: newCap,
        amenities: newAmenities,
        photos: newPhotos,
        latitude: newLat,
        longitude: newLng,
      };
      localStore.spaces[index] = updated;

      // Synchronisation Supabase Cloud
      if (isLiveSupabase) {
        try {
          const sbPayload: any = {
            name: newName,
            description: newDesc,
            location: newLocation,
            price_per_hour: newPrice,
            capacity: newCap,
            amenities: newAmenities,
            photos: newPhotos,
            latitude: newLat,
            longitude: newLng,
          };
          await supabase.from('spaces').update(sbPayload).eq('id', current.id);
        } catch (sbErr) {
          console.warn('ℹ️ Supabase Cloud updateSpace notice (persisted in Spotwork store):', sbErr);
        }
      }

      res.status(200).json({
        status: 'success',
        message: 'Informations de l’espace mises à jour avec succès',
        data: { space: updated },
      });
    } catch (error) {
      next(error);
    }
  }

  static async deleteSpace(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    const id = String(req.params.id);

    try {
      if (!req.user) {
        res.status(401).json({ status: 'error', message: 'Non authentifié' });
        return;
      }

      const index = localStore.spaces.findIndex(
        (s) => s.id === id || s.id.endsWith(id.padStart(12, '0')) || s.id.endsWith(id)
      );

      if (index === -1) {
        res.status(404).json({ status: 'error', message: 'Espace introuvable' });
        return;
      }

      const current = localStore.spaces[index];
      if (current.owner_id !== req.user.id && req.user.role !== 'admin') {
        res.status(403).json({ status: 'error', code: 'FORBIDDEN', message: 'Action non autorisée sur cet espace' });
        return;
      }

      localStore.spaces.splice(index, 1);

      // Attempt remote Supabase delete if live
      if (isLiveSupabase) {
        try {
          await supabase.from('spaces').delete().eq('id', current.id);
        } catch (sbErr) {
          console.warn('⚠️ Supabase Cloud deleteSpace notice:', sbErr);
        }
      }

      res.status(200).json({
        status: 'success',
        message: 'Espace supprimé avec succès',
      });
    } catch (error) {
      next(error);
    }
  }
}
