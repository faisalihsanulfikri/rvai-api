import mongoose, { Schema, Document } from 'mongoose';
import { User } from '../../shared/types/index.js';

export interface UserDocument extends User, Document {}

const userSchema = new Schema<UserDocument>(
  {
    googleId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    name: String,
    picture: String,
  },
  {
    timestamps: true,
  }
);

export const UserModel = mongoose.model<UserDocument>('User', userSchema);
