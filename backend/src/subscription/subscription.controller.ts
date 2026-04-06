import { Controller, Put, Body, Req } from '@nestjs/common';
import { Request } from 'express';
import { SubscriptionService, PlanChangeDto } from './subscription.service';

type AuthReq = Request & { user: { userId: string } };

@Controller('subscription')
export class SubscriptionController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  @Put('plan')
  changePlan(@Req() req: AuthReq, @Body() dto: PlanChangeDto) {
    return this.subscriptionService.changePlan(req.user.userId, dto);
  }
}
