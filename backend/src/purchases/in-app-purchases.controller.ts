import { Controller, Post, Get, Body, UseGuards, Req, Param } from '@nestjs/common';
import { InAppPurchasesService } from './in-app-purchases.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('In-App Purchases')
@ApiBearerAuth()
@Controller('purchases')
@UseGuards(JwtAuthGuard)
export class InAppPurchasesController {
  constructor(private purchaseService: InAppPurchasesService) {}

  @Get('products')
  @ApiOperation({ summary: 'Get available products' })
  async getProducts() {
    return this.purchaseService.getAvailableProducts();
  }

  @Get('history')
  @ApiOperation({ summary: 'Get user purchase history' })
  async getHistory(@Req() req: any) {
    return this.purchaseService.getPurchaseHistory(req.user.id);
  }

  @Get('balance')
  @ApiOperation({ summary: 'Get user balance' })
  async getBalance(@Req() req: any) {
    return this.purchaseService.getUserBalance(req.user.id);
  }

  @Post('purchase')
  @ApiOperation({ summary: 'Process purchase' })
  async purchase(@Req() req: any, @Body() body: any) {
    return this.purchaseService.processPurchase(req.user.id, body.productId, body.quantity || 1, body.receipt || '');
  }

  @Post('redeem-code')
  @ApiOperation({ summary: 'Redeem promo code' })
  async redeemCode(@Req() req: any, @Body() body: any) {
    return this.purchaseService.redeemPromoCode(req.user.id, body.code);
  }

  @Get('subscriptions')
  @ApiOperation({ summary: 'Get user subscriptions' })
  async getSubscriptions(@Req() req: any) {
    return { subscriptions: [] };
  }

  @Post('subscription/:productId')
  @ApiOperation({ summary: 'Subscribe to product' })
  async subscribe(@Req() req: any, @Param('productId') productId: string) {
    return this.purchaseService.subscribeToProduct(req.user.id, productId);
  }

  @Post('cancel-subscription/:subscriptionId')
  @ApiOperation({ summary: 'Cancel subscription' })
  async cancelSubscription(@Req() req: any, @Param('subscriptionId') subscriptionId: string) {
    return this.purchaseService.cancelSubscription(req.user.id, subscriptionId);
  }
}
