export interface AdminLoginResponse {
  accessToken: string;
  tokenType: 'Bearer';
  expiresAt: string;
  user: {
    email: string;
    displayName: string;
  };
}

export interface AdminCredentials {
  email: string;
  password: string;
}
