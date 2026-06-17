export interface UserPayload {
  id: string;
  role: string;
  hospitalId: string | null;
}


declare global {
  namespace Express {
    interface Request {
      user?: UserPayload;
    }
  }
}
