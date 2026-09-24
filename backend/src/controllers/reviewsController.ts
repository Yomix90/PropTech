import { Response, NextFunction } from 'express';
import { supabase, isLiveSupabase, localStore, ReviewEntity } from '../config/supabase.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { ClaudeService } from '../services/claudeService.js';

export class ReviewsController {
  static async createReview(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ status: 'error', message: 'Non authentifié' });
        return;
      }

      const { booking_id, space_id, rating, comment } = req.body;

      if (isLiveSupabase) {
        // Vérifier que la réservation existe et appartient bien à l'utilisateur
        const { data: booking, error: bErr } = await supabase
          .from('bookings')
          .select('*')
          .eq('id', booking_id)
          .eq('user_id', req.user.id)
          .eq('space_id', space_id)
          .single();

        if (bErr || !booking) {
          res.status(403).json({
            status: 'error',
            code: 'INVALID_REVIEW_TARGET',
            message: 'Vous devez avoir réservé cet espace pour pouvoir y déposer un avis',
          });
          return;
        }

        const newReview: ReviewEntity = {
          id: crypto.randomUUID ? crypto.randomUUID() : `rev-${Date.now()}`,
          booking_id,
          user_id: req.user.id,
          space_id,
          rating,
          comment,
          created_at: new Date().toISOString(),
        };

        const { data, error } = await supabase.from('reviews').insert(newReview).select().single();
        if (error) {
          if (error.code === '23505') {
            res.status(409).json({
              status: 'error',
              code: 'REVIEW_ALREADY_EXISTS',
              message: 'Vous avez déjà déposé un avis pour cette réservation',
            });
            return;
          }
          throw error;
        }

        // Recalculer les recommandations IA
        ClaudeService.generateRecommendations(req.user.id).catch((err) =>
          console.warn('Erreur recalcul recommendations après avis:', err)
        );

        res.status(201).json({
          status: 'success',
          message: 'Votre avis a été publié avec succès',
          data: { review: data },
        });
        return;
      }

      // Local store
      const booking = localStore.bookings.find(
        (b) => b.id === booking_id && b.user_id === req.user!.id && b.space_id === space_id
      );

      if (!booking) {
        res.status(403).json({
          status: 'error',
          code: 'INVALID_REVIEW_TARGET',
          message: 'Vous devez avoir réservé cet espace pour pouvoir y déposer un avis',
        });
        return;
      }

      const existingReview = localStore.reviews.find((r) => r.booking_id === booking_id);
      if (existingReview) {
        res.status(409).json({
          status: 'error',
          code: 'REVIEW_ALREADY_EXISTS',
          message: 'Vous avez déjà déposé un avis pour cette réservation',
        });
        return;
      }

      const review: ReviewEntity = {
        id: crypto.randomUUID ? crypto.randomUUID() : `rev-${Date.now()}`,
        booking_id,
        user_id: req.user.id,
        space_id,
        rating,
        comment,
        created_at: new Date().toISOString(),
      };

      localStore.reviews.unshift(review);

      // Recalculer la note moyenne de l'espace
      const spaceReviews = localStore.reviews.filter((r) => r.space_id === space_id);
      const avg = spaceReviews.reduce((sum, r) => sum + r.rating, 0) / spaceReviews.length;
      const targetSpace = localStore.spaces.find((s) => s.id === space_id);
      if (targetSpace) {
        targetSpace.rating = Math.round(avg * 10) / 10;
      }

      // Recalculer les recommandations IA
      ClaudeService.generateRecommendations(req.user.id).catch((err) =>
        console.warn('Erreur recalcul recommendations après avis:', err)
      );

      res.status(201).json({
        status: 'success',
        message: 'Votre avis a été publié avec succès',
        data: { review },
      });
    } catch (error) {
      next(error);
    }
  }
}
