export interface GoogleProfile {
  id: string;
  displayName: string;
  emails: Array<{ value: string }>;
  photos: Array<{ value: string }>;
}

export interface AuthToken {
  userId: string;
  email: string;
  name: string;
  iat: number;
}
