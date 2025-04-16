
import { Request, Response, NextFunction } from 'express';
import { db } from '../db';
import { user_subscriptions } from '../db/schema';
import { eq } from 'drizzle-orm';
import { checkPlanPermission } from '../lib/plan-features';
import { getSubscriptionDetails } from '../lib/subscription-tracker';

export async function planGuard(feature: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const details = await getSubscriptionDetails(userId);

      if (details.status !== 'active') {
        return res.status(403).json({ message: 'Subscription is not active' });
      }

      const hasPermission = checkPlanPermission(feature, details.tier);
      if (!hasPermission) {
        return res.status(403).json({ 
          message: 'This feature requires a higher tier subscription',
          requiredTier: 'growth' // You may want to make this dynamic based on feature
        });
      }

      // Add subscription details to request for use in route handlers
      req.subscription = details;
      next();
    } catch (error) {
      next(error);
    }
  };
}
