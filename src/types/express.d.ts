// Login করা admin-এর তথ্য req.user-এ রাখার জন্য TypeScript-কে জানানো
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        name: string;
        email: string;
        role: "admin";
      };
    }
  }
}

export {};
