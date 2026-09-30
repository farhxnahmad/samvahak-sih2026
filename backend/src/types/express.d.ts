import { UserRole } from "../constants/enums";

declare global {
  namespace Express {
    interface Request {
      /** Set by the `authenticate` middleware. */
      user?: {
        id: string;
        name: string;
        email: string;
        role: UserRole;
        district?: string;
      };
    }
  }
}

export {};
