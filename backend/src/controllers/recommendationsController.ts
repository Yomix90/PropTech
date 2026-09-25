import { Response, NextFunction } from 'express';
import { supabase, isLiveSupabase, localStore } from '../config/supabase.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { ClaudeService } from '../services/claudeService.js';

export class RecommendationsController {
  static async getRecommendations(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ status: 'error', message: 'Non authentifié' });
        return;
      }

      let recs: any[] = [];

      if (isLiveSupabase) {
        const { data, error } = await supabase
          .from('ai_recommendations')
          .select('*, spaces(*)')
          .eq('user_id', req.user.id)
          .order('created_at', { ascending: false })
          .limit(3);

        if (error) throw error;
        recs = data || [];

        if (recs.length === 0) {
          const generated = await ClaudeService.generateRecommendations(req.user.id);
          const { data: refreshed } = await supabase
            .from('ai_recommendations')
            .select('*, spaces(*)')
            .eq('user_id', req.user.id)
            .order('created_at', { ascending: false })
            .limit(3);
          recs = refreshed || generated;
        }
      } else {
        recs = localStore.aiRecommendations
          .filter((r) => r.user_id === req.user!.id)
          .slice(0, 3)
          .map((r) => {
            const space = localStore.spaces.find((s) => s.id === r.recommended_space_id);
            return {
              ...r,
              spaces: space,
            };
          });

        if (recs.length === 0) {
          await ClaudeService.generateRecommendations(req.user.id);
          recs = localStore.aiRecommendations
            .filter((r) => r.user_id === req.user!.id)
            .slice(0, 3)
            .map((r) => {
              const space = localStore.spaces.find((s) => s.id === r.recommended_space_id);
              return {
                ...r,
                spaces: space,
              };
            });
        }
      }

      res.status(200).json({
        status: 'success',
        results: recs.length,
        data: { recommendations: recs },
      });
    } catch (error) {
      next(error);
    }
  }

  static async markClicked(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    const { id } = req.params;

    try {
      if (isLiveSupabase) {
        const { data, error } = await supabase
          .from('ai_recommendations')
          .update({ clicked: true })
          .eq('id', id)
          .select()
          .single();

        if (error) throw error;

        res.status(200).json({
          status: 'success',
          message: 'Statut de clic enregistré',
          data: { recommendation: data },
        });
        return;
      }

      const rec = localStore.aiRecommendations.find((r) => r.id === id);
      if (rec) {
        rec.clicked = true;
      }

      res.status(200).json({
        status: 'success',
        message: 'Statut de clic enregistré',
        data: { recommendation: rec },
      });
    } catch (error) {
      next(error);
    }
  }

  static async submitFeedback(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { space_id, feedback } = req.body;
      res.status(200).json({
        status: 'success',
        message: 'Feedback enregistré pour affiner vos recommandations IA',
        data: { space_id, feedback },
      });
    } catch (error) {
      next(error);
    }
  }
}
