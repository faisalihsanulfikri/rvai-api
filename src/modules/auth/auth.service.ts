import { decode } from 'jsonwebtoken';
import { UserModel } from './user.model.js';
import { GoogleProfile, AuthToken } from './auth.types.js';

export async function findOrCreateUser(profile: GoogleProfile) {
  const email = profile.emails[0]?.value;
  if (!email) throw new Error('No email from Google');

  const picture = profile.photos && profile.photos.length > 0 ? profile.photos[0].value : undefined;

  let user = await UserModel.findOne({ googleId: profile.id });

  if (!user) {
    user = await UserModel.create({
      googleId: profile.id,
      email,
      name: profile.displayName,
      picture,
    });
    console.log(`✓ New user created: ${email}`);
  } else {
    user.name = profile.displayName;
    user.picture = picture;
    await user.save();
  }

  return user;
}

export function generateToken(userId: string, email: string, name: string): string {
  const token: AuthToken = {
    userId: userId.toString(),
    email,
    name,
    iat: Date.now(),
  };

  return Buffer.from(JSON.stringify(token)).toString('base64');
}

export async function getUserById(id: string) {
  return UserModel.findById(id).select('-__v');
}

export async function verifyAndCreateUserFromGoogleToken(googleToken: string) {
  const decoded = decode(googleToken) as any;

  if (!decoded) {
    throw new Error('Invalid Google token');
  }

  const googleProfile: GoogleProfile = {
    id: decoded.sub,
    displayName: decoded.name || 'User',
    emails: [{ value: decoded.email }],
    photos: decoded.picture ? [{ value: decoded.picture }] : [],
  };

  const user = await findOrCreateUser(googleProfile);
  const token = generateToken(user._id.toString(), user.email, user.name);

  return {
    token,
    user: {
      id: user._id,
      email: user.email,
      name: user.name,
      picture: user.picture,
    },
  };
}
