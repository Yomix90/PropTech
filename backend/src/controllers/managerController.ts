import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { AnalyticsService } from '../services/analyticsService.js';
import { supabase, isLiveSupabase, localStore } from '../config/supabase.js';

export class ManagerController {
  static async getDashboard(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ status: 'error', message: 'Non authentifié' });
        return;
      }

      const metrics = await AnalyticsService.getManagerMetrics(req.user.id);

      res.status(200).json({
        status: 'success',
        data: metrics,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getManagerBookings(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ status: 'error', message: 'Non authentifié' });
        return;
      }

      if (isLiveSupabase) {
        let query = supabase
          .from('bookings')
          .select('*, spaces(*), users(id, full_name, email, phone)')
          .order('created_at', { ascending: false });

        if (req.user.role !== 'admin') {
          // Filtrer par les espaces dont req.user.id est propriétaire
          const { data: spaces } = await supabase.from('spaces').select('id').eq('owner_id', req.user.id);
          const spaceIds = (spaces || []).map((s) => s.id);
          query = query.in('space_id', spaceIds);
        }

        const { data: bookings, error } = await query;
        if (error) throw error;

        res.status(200).json({
          status: 'success',
          results: bookings.length,
          data: { bookings: bookings || [] },
        });
        return;
      }

      // Local store
      let managedSpaceIds = localStore.spaces.map((s) => s.id);
      if (req.user.role !== 'admin') {
        managedSpaceIds = localStore.spaces.filter((s) => s.owner_id === req.user!.id).map((s) => s.id);
      }

      const bookings = localStore.bookings
        .filter((b) => managedSpaceIds.includes(b.space_id))
        .map((b) => {
          const space = localStore.spaces.find((s) => s.id === b.space_id);
          const client = localStore.users.find((u) => u.id === b.user_id);
          return {
            ...b,
            space,
            user: client ? { id: client.id, full_name: client.full_name, email: client.email, phone: client.phone } : null,
          };
        })
        .sort((a, b) => (b.created_at > a.created_at ? 1 : -1));

      res.status(200).json({
        status: 'success',
        results: bookings.length,
        data: { bookings },
      });
    } catch (error) {
      next(error);
    }
  }
}
