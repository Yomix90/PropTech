import { Response, NextFunction } from 'express';
import { supabase, isLiveSupabase, localStore, BookingEntity } from '../config/supabase.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { BookingService, calculateTotalPrice } from '../services/bookingService.js';
import { ClaudeService } from '../services/claudeService.js';

export class BookingsController {
  static async createBooking(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ status: 'error', message: 'Non authentifié' });
        return;
      }

      const { space_id, booking_date, start_time, end_time } = req.body;

      // 1. Vérifier l'existence de l'espace
      const space = await BookingService.getSpace(space_id);
      if (!space) {
        res.status(404).json({
          status: 'error',
          code: 'SPACE_NOT_FOUND',
          message: 'L’espace sélectionné n’existe pas',
        });
        return;
      }

      // 2. Vérifier la disponibilité (anti-chevauchement strict)
      const overlapCheck = await BookingService.checkOverlap({
        space_id,
        booking_date,
        start_time,
        end_time,
      });

      if (overlapCheck.hasOverlap) {
        res.status(409).json({
          status: 'error',
          code: 'SLOT_UNAVAILABLE',
          message: 'Ce créneau horaire est déjà réservé pour cet espace',
          conflict: {
            booking_date,
            occupied_start: overlapCheck.conflictingBooking?.start_time,
            occupied_end: overlapCheck.conflictingBooking?.end_time,
          },
        });
        return;
      }

      // 3. Calculer le tarif total
      const totalPrice = calculateTotalPrice(start_time, end_time, Number(space.price_per_hour));

      // 4. Créer la réservation
      const newBooking: BookingEntity = {
        id: crypto.randomUUID ? crypto.randomUUID() : `bkg-${Date.now()}`,
        user_id: req.user.id,
        space_id,
        booking_date,
        start_time,
        end_time,
        total_price: totalPrice,
        status: 'confirmed',
        created_at: new Date().toISOString(),
      };

      if (isLiveSupabase) {
        const { data, error } = await supabase.from('bookings').insert(newBooking).select().single();
        if (error) throw error;

        // Déclencher le recalcul des recommandations IA en arrière-plan
        ClaudeService.generateRecommendations(req.user.id).catch((err) =>
          console.warn('Erreur asynchrone Claude Recommendations:', err)
        );

        res.status(201).json({
          status: 'success',
          message: 'Réservation confirmée avec succès',
          data: { booking: data, space },
        });
        return;
      }

      localStore.bookings.unshift(newBooking);

      // Déclencher le recalcul des recommandations IA en arrière-plan
      ClaudeService.generateRecommendations(req.user.id).catch((err) =>
        console.warn('Erreur asynchrone Claude Recommendations:', err)
      );

      res.status(201).json({
        status: 'success',
        message: 'Réservation confirmée avec succès',
        data: { booking: newBooking, space },
      });
    } catch (error) {
      next(error);
    }
  }

  static async getUserBookings(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ status: 'error', message: 'Non authentifié' });
        return;
      }

      if (isLiveSupabase) {
        const { data, error } = await supabase
          .from('bookings')
          .select('*, spaces(*)')
          .eq('user_id', req.user.id)
          .order('booking_date', { ascending: false });

        if (error) throw error;

        res.status(200).json({
          status: 'success',
          results: data.length,
          data: { bookings: data },
        });
        return;
      }

      // Local store
      const userBookings = localStore.bookings
        .filter((b) => b.user_id === req.user!.id)
        .map((b) => {
          const space = localStore.spaces.find((s) => s.id === b.space_id);
          return {
            ...b,
            space,
          };
        })
        .sort((a, b) => (b.booking_date > a.booking_date ? 1 : -1));

      res.status(200).json({
        status: 'success',
        results: userBookings.length,
        data: { bookings: userBookings },
      });
    } catch (error) {
      next(error);
    }
  }

  static async cancelBooking(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    const { id } = req.params;

    try {
      if (!req.user) {
        res.status(401).json({ status: 'error', message: 'Non authentifié' });
        return;
      }

      if (isLiveSupabase) {
        const { data: booking, error: fetchErr } = await supabase
          .from('bookings')
          .select('*')
          .eq('id', id)
          .single();

        if (fetchErr || !booking) {
          res.status(404).json({ status: 'error', message: 'Réservation introuvable' });
          return;
        }

        if (booking.user_id !== req.user.id && req.user.role !== 'admin') {
          res.status(403).json({ status: 'error', message: 'Action non autorisée' });
          return;
        }

        const { data, error } = await supabase
          .from('bookings')
          .update({ status: 'cancelled' })
          .eq('id', id)
          .select()
          .single();

        if (error) throw error;

        res.status(200).json({
          status: 'success',
          message: 'Réservation annulée',
          data: { booking: data },
        });
        return;
      }

      const booking = localStore.bookings.find((b) => b.id === id);
      if (!booking) {
        res.status(404).json({ status: 'error', message: 'Réservation introuvable' });
        return;
      }

      if (booking.user_id !== req.user.id && req.user.role !== 'admin') {
        res.status(403).json({ status: 'error', message: 'Action non autorisée' });
        return;
      }

      booking.status = 'cancelled';

      res.status(200).json({
        status: 'success',
        message: 'Réservation annulée',
        data: { booking },
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateBookingStatus(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    const { id } = req.params;
    const { status } = req.body;

    try {
      if (!req.user) {
        res.status(401).json({ status: 'error', message: 'Non authentifié' });
        return;
      }

      if (isLiveSupabase) {
        const { data: booking, error: fetchErr } = await supabase
          .from('bookings')
          .select('*, spaces(owner_id)')
          .eq('id', id)
          .single();

        if (fetchErr || !booking) {
          res.status(404).json({ status: 'error', message: 'Demande de réservation introuvable' });
          return;
        }

        // Seul le gestionnaire propriétaire de l'espace ou un admin peut valider/refuser
        const spaceOwnerId = (booking.spaces as any)?.owner_id;
        if (req.user.role !== 'admin' && spaceOwnerId !== req.user.id) {
          res.status(403).json({ status: 'error', message: 'Action non autorisée sur cette réservation' });
          return;
        }

        const { data: updated, error: updateErr } = await supabase
          .from('bookings')
          .update({ status })
          .eq('id', id)
          .select('*, spaces(*), users(id, full_name, email)')
          .single();

        if (updateErr) throw updateErr;

        res.status(200).json({
          status: 'success',
          message: `Statut de la réservation mis à jour : ${status}`,
          data: { booking: updated },
        });
        return;
      }

      // Local store
      const booking = localStore.bookings.find((b) => b.id === id);
      if (!booking) {
        res.status(404).json({ status: 'error', message: 'Demande de réservation introuvable' });
        return;
      }

      const space = localStore.spaces.find((s) => s.id === booking.space_id);
      if (req.user.role !== 'admin' && space?.owner_id !== req.user.id) {
        res.status(403).json({ status: 'error', message: 'Action non autorisée sur cette réservation' });
        return;
      }

      booking.status = status;

      res.status(200).json({
        status: 'success',
        message: `Statut de la réservation mis à jour : ${status}`,
        data: { booking },
      });
    } catch (error) {
      next(error);
    }
  }
}
