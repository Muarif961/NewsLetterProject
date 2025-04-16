
import { Request, Response, NextFunction } from 'express';

export const webhookLogger = (req: Request, res: Response, next: NextFunction) => {
  console.log('\n=== Stripe Webhook Request ===');
  console.log('Timestamp:', new Date().toISOString());
  console.log('Method:', req.method);
  console.log('Path:', req.path);
  console.log('Headers:', JSON.stringify(req.headers, null, 2));
  console.log('Signature:', req.headers['stripe-signature']);
  console.log('Body Length:', req.body?.length || 0);
  console.log('============================\n');
  
  next();
};
