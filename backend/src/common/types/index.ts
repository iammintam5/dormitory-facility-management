export interface JwtPayload {
  sub: number;
  role: string;
  iat?: number;
  exp?: number;
}
