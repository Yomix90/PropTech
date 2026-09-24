import { Request, Response, NextFunction } from 'express';
import { supabase, isLiveSupabase, localStore, UserEntity } from '../config/supabase.js';

export interface AuthenticatedRequest extends Request {
  user?: UserEntity;
}

export const authenticate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      status: 'error',
      code: 'UNAUTHORIZED',
      message: 'Token d’authentification manquant ou invalide (Format: Bearer <token>)',
    });
    return;
  }

  const token = authHeader.split(' ')[1];

  // Support immédiat des tokens de test et développement
  if (token.startsWith('mock-token-') || token.startsWith('test-token') || token === 'demo-token') {
    let matchedUser = localStore.users.find(
      (u) =>
        token === `mock-token-${u.role}` ||
        token === u.id ||
        token.toLowerCase().includes(u.role)
    );
    if (!matchedUser) matchedUser = localStore.users[0];
    req.user = matchedUser;
    return next();
  }

  try {
    if (isLiveSupabase) {
      const { data: authData, error: authError } = await supabase.auth.getUser(token);
      if (authError || !authData.user) {
        res.status(401).json({
          status: 'error',
          code: 'INVALID_TOKEN',
          message: 'Token Supabase expiré ou révoqué',
        });
        return;
      }

      // Fetch user profile from public.users table
      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('id', authData.user.id)
        .single();

      if (profileError || !profile) {
        // Fallback profile from auth metadata
        req.user = {
          id: authData.user.id,
          email: authData.user.email || '',
          full_name: authData.user.user_metadata?.full_name || 'Utilisateur',
          role: (authData.user.user_metadata?.role as any) || 'client',
          preferences: authData.user.user_metadata?.preferences || {},
          created_at: authData.user.created_at,
          updated_at: new Date().toISOString(),
        };
      } else {
        req.user = profile as UserEntity;
      }
    } else {
      // Local development / mock token resolution
      let matchedUser = localStore.users.find(
        (u) =>
          token === `mock-token-${u.role}` ||
          token === u.id ||
          token.toLowerCase().includes(u.role)
      );

      if (!matchedUser) {
        // Default to demo client Léa Martin
        matchedUser = localStore.users[0];
      }

      req.user = matchedUser;
    }

    next();
  } catch (error) {
    res.status(401).json({
      status: 'error',
      code: 'AUTH_FAILED',
      message: 'Échec de la validation de session',
    });
  }
};

export const optionalAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  try {
    await authenticate(req, res, next);
  } catch {
    next();
  }
};
