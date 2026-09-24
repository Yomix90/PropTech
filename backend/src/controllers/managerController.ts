import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { AnalyticsService } from '../services/analyticsService.js';

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
}
