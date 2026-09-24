import { Request, Response, NextFunction } from 'express';
import { supabase, isLiveSupabase, localStore, UserEntity } from '../config/supabase.js';
import { AuthenticatedRequest } from '../middleware/auth.js';

export class AuthController {
  static async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    const { email, password, full_name, phone, role, preferences } = req.body;

    try {
      if (isLiveSupabase) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name,
              phone,
              role: role || 'client',
              preferences: preferences || {},
            },
          },
        });

        if (error) {
          res.status(400).json({ status: 'error', code: 'SIGNUP_ERROR', message: error.message });
          return;
        }

        res.status(201).json({
          status: 'success',
          message: 'Compte utilisateur créé avec succès',
          data: {
            user: data.user,
            session: data.session,
          },
        });
        return;
      }

      // Local / Mock store implementation
      const existing = localStore.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
      if (existing) {
        res.status(409).json({
          status: 'error',
          code: 'USER_ALREADY_EXISTS',
          message: 'Un compte avec cette adresse email existe déjà',
        });
        return;
      }

      const newUser: UserEntity = {
        id: crypto.randomUUID ? crypto.randomUUID() : `usr-${Date.now()}`,
        email,
        full_name,
        phone,
        role: role || 'client',
        preferences: preferences || {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      localStore.users.push(newUser);

      res.status(201).json({
        status: 'success',
        message: 'Compte créé avec succès',
        data: {
          user: newUser,
          token: `mock-token-${newUser.role}`,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  static async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    const { email, password } = req.body;

    try {
      if (isLiveSupabase) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          res.status(401).json({ status: 'error', code: 'INVALID_CREDENTIALS', message: error.message });
          return;
        }

        res.status(200).json({
          status: 'success',
          message: 'Connexion réussie',
          data: {
            user: data.user,
            session: data.session,
          },
        });
        return;
      }

      // Local mock login
      const user = localStore.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
      if (!user) {
        res.status(401).json({
          status: 'error',
          code: 'INVALID_CREDENTIALS',
          message: 'Adresse email ou mot de passe incorrect',
        });
        return;
      }

      res.status(200).json({
        status: 'success',
        message: 'Connexion réussie',
        data: {
          user,
          token: `mock-token-${user.role}`,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  static async getMe(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      res.status(200).json({
        status: 'success',
        data: {
          user: req.user,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  static async updatePreferences(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    const preferences = req.body;

    try {
      if (!req.user) {
        res.status(401).json({ status: 'error', message: 'Non authentifié' });
        return;
      }

      if (isLiveSupabase) {
        const { data, error } = await supabase
          .from('users')
          .update({ preferences, updated_at: new Date().toISOString() })
          .eq('id', req.user.id)
          .select()
          .single();

        if (error) throw error;

        res.status(200).json({
          status: 'success',
          message: 'Préférences mises à jour',
          data: { user: data },
        });
        return;
      }

      const user = localStore.users.find((u) => u.id === req.user!.id);
      if (user) {
        user.preferences = { ...user.preferences, ...preferences };
        user.updated_at = new Date().toISOString();
      }

      res.status(200).json({
        status: 'success',
        message: 'Préférences mises à jour',
        data: { user },
      });
    } catch (error) {
      next(error);
    }
  }
}
