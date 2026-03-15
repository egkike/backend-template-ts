import { Request, Response } from 'express';

export const healthCheck = (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    version: '1.0.1',
    timestamp: new Date().toISOString(),
  });
};
