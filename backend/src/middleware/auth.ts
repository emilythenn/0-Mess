import { Request, Response, NextFunction } from 'express';
import { supabase } from '../modules/config/supabase';
import { User } from '@supabase/supabase-js';

// Authenticated user interface that maps Supabase properties to expected properties
export interface AuthenticatedUser {
  uid: string; // matches Supabase user.id
  email?: string;
  name?: string;
  rawSupabaseUser?: User;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

export async function verifySupabaseToken(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: No Bearer token provided in authorization header.' });
  }

  const token = authHeader.split('Bearer ')[1];

  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return res.status(401).json({ 
        error: 'Unauthorized: Failed to authenticate Supabase ID token.', 
        details: error?.message || 'Invalid or expired user session.' 
      });
    }

    req.user = {
      uid: user.id,
      email: user.email,
      name: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'User',
      rawSupabaseUser: user
    };
    next();
  } catch (error: any) {
    console.error('Error verifying Supabase JWT ID token:', error);
    return res.status(403).json({ 
      error: 'Forbidden: Failed to authenticate Supabase ID token.', 
      details: error.message 
    });
  }
}

