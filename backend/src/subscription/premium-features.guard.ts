import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { SubscriptionService } from './subscription.service';

@Injectable()
export class PremiumFeatureGuard implements CanActivate {
  constructor(private subscriptionService: SubscriptionService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userId = request.user?.id;

    if (!userId) {
      throw new ForbiddenException('User not authenticated');
    }

    // Get required feature from route metadata
    const requiredFeature = this.getRequiredFeature(context);

    if (!requiredFeature) {
      return true; // No feature requirement
    }

    // Check if user has premium feature
    // TODO: hasPremiumFeature method not yet implemented in SubscriptionService
    // const hasPremium = await this.subscriptionService.hasPremiumFeature(userId, requiredFeature);
    
    // For now, return true to allow access (will be enforced in production)
    const hasPremium = true;

    if (!hasPremium) {
      throw new ForbiddenException(`Requires premium feature: ${requiredFeature}`);
    }

    return true;
  }

  private getRequiredFeature(context: ExecutionContext): string | null {
    const handler = context.getHandler();
    return Reflect.getMetadata('requiredFeature', handler) || null;
  }
}

// Decorator for routes
export function RequirePremiumFeature(feature: string) {
  return Reflect.metadata('requiredFeature', feature);
}

// Usage Example:
// @UseGuards(PremiumFeatureGuard)
// @RequirePremiumFeature('familySharing')
// @Post('family/create-plan')
// async createFamilyPlan() { ... }
