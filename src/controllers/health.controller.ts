import { Request, Response } from 'express';

export const healthCheck = (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    version: '1.0.1',
    timestamp: new Date().toISOString(),
  });
};
