import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth.js';

export const requireRole = (...allowedRoles: Array<'client' | 'manager' | 'admin'>) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        status: 'error',
        code: 'UNAUTHORIZED',
        message: 'Utilisateur non authentifié',
      });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        status: 'error',
        code: 'FORBIDDEN',
        message: `Accès refusé. Rôles autorisés: ${allowedRoles.join(', ')} (votre rôle: ${req.user.role})`,
      });
      return;
    }

    next();
  };
};
