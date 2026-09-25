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

      // 1. Gather all local bookings for managed spaces
      let managedSpaceIds = localStore.spaces.map((s) => s.id);
      if (req.user.role !== 'admin') {
        managedSpaceIds = localStore.spaces.filter((s) => s.owner_id === req.user!.id).map((s) => s.id);
      }

      const localBookings = localStore.bookings
        .filter((b) => managedSpaceIds.includes(b.space_id) || managedSpaceIds.some(id => b.space_id?.endsWith(id.slice(-4))))
        .map((b) => {
          const space = localStore.spaces.find((s) => s.id === b.space_id) || localStore.spaces[0];
          const client = localStore.users.find((u) => u.id === b.user_id) || localStore.users[0];
          return {
            ...b,
            space,
            user: { id: client.id, full_name: client.full_name, email: client.email, phone: client.phone },
          };
        });

      let combined = [...localBookings];

      if (isLiveSupabase) {
        try {
          let query = supabase
            .from('bookings')
            .select('*, spaces(*), users(id, full_name, email, phone)')
            .order('created_at', { ascending: false });

          if (req.user.role !== 'admin') {
            const { data: spaces } = await supabase.from('spaces').select('id').eq('owner_id', req.user.id);
            const spaceIds = (spaces || []).map((s) => s.id);
            query = query.in('space_id', spaceIds);
          }

          const { data: bookings, error } = await query;
          if (!error && bookings && bookings.length > 0) {
            const existingIds = new Set(combined.map((b) => b.id));
            for (const sbBooking of bookings) {
              if (!existingIds.has(sbBooking.id)) {
                combined.push(sbBooking);
              }
            }
          }
        } catch (sbErr) {
          console.warn('⚠️ Supabase getManagerBookings notice:', sbErr);
        }
      }

      combined.sort((a, b) => (b.created_at > a.created_at ? 1 : -1));

      res.status(200).json({
        status: 'success',
        results: combined.length,
        data: { bookings: combined },
      });
    } catch (error) {
      next(error);
    }
  }

  static async getPayments(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ status: 'error', message: 'Non authentifié' });
        return;
      }

      let managedSpaceIds = localStore.spaces.map((s) => s.id);
      if (req.user.role !== 'admin') {
        managedSpaceIds = localStore.spaces.filter((s) => s.owner_id === req.user!.id).map((s) => s.id);
      }

      const confirmedBookings = localStore.bookings.filter(
        (b) => managedSpaceIds.includes(b.space_id) && b.status !== 'cancelled'
      );

      const payments = confirmedBookings.map((b, idx) => {
        const space = localStore.spaces.find((s) => s.id === b.space_id);
        const client = localStore.users.find((u) => u.id === b.user_id);
        const grossAmount = Number(b.total_price);
        const platformFee = Math.round(grossAmount * 0.08 * 100) / 100;
        const netAmount = Math.round((grossAmount - platformFee) * 100) / 100;

        return {
          id: `TXN-2026-${String(8800 + idx)}`,
          bookingId: b.id,
          date: b.created_at,
          clientName: client?.full_name || 'Client PropTech',
          clientEmail: client?.email || 'client@proptech.ma',
          spaceName: space?.name || 'Espace Coworking',
          city: space?.location ? space.location.split('·')[0].trim() : 'Casablanca',
          grossAmount,
          platformFee,
          netAmount,
          currency: 'MAD',
          paymentMethod: 'Carte Bancaire CMI (3D Secure)',
          status: b.status === 'confirmed' ? 'paid' : 'pending',
          invoiceRef: `FACT-2026-${String(100 + idx)}`,
        };
      });

      const totalGross = payments.reduce((sum, p) => sum + p.grossAmount, 0);
      const totalFees = payments.reduce((sum, p) => sum + p.platformFee, 0);
      const totalNet = payments.reduce((sum, p) => sum + p.netAmount, 0);

      res.status(200).json({
        status: 'success',
        results: payments.length,
        data: {
          summary: {
            totalGross,
            totalFees,
            totalNet,
            currency: 'MAD',
          },
          payments,
        },
      });
    } catch (error) {
      next(error);
    }
  }
}
