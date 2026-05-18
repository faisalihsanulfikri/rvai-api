import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { findOrCreateUser } from './auth.service.js';
import { GoogleProfile } from './auth.types.js';

export function createGoogleStrategy() {
  return new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      callbackURL:
        process.env.GOOGLE_CALLBACK_URL ||
        'http://localhost:3001/api/auth/google/callback',
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const googleProfile: GoogleProfile = {
          id: profile.id,
          displayName: profile.displayName,
          emails: profile.emails || [],
          photos: profile.photos || [],
        };

        await findOrCreateUser(googleProfile);
        return done(null, profile);
      } catch (error) {
        return done(error);
      }
    }
  );
}
