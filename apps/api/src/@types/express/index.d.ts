export interface UserPayload {
  id: string;
  role: string;
  hospitalId: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: UserPayload;
    }
  }
}
