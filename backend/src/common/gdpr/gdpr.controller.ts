import { Controller, Get, Delete, Post, Body } from '@nestjs/common';
import { GdprService, UserDataExport } from './gdpr.service';

// TODO: Import guards/decorators when auth module is ready
// import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
// import { CurrentUser } from '../auth/decorators/current-user.decorator';

interface PrivacyPreferences {
  shareListeningHistory?: boolean;
  sharePlaylistsPublicly?: boolean;
  allowFollowers?: boolean;
  allowMessages?: boolean;
}

@Controller('api/v1/gdpr')
export class GdprController {
  constructor(private gdprService: GdprService) {}

  /**
   * Export all user data (GDPR right of access)
   * TODO: Add @UseGuards(JwtAuthGuard) when auth module is ready
   */
  @Get('export')
  async exportUserData() {
    // TODO: Get user from @CurrentUser() decorator when ready
    const userId = 'test-user-id'; // Placeholder
    return this.gdprService.exportUserData(userId);
  }

  /**
   * Delete all user data (GDPR right to be forgotten)
   * Requires confirmation via email
   * TODO: Add @UseGuards(JwtAuthGuard) when auth module is ready
   */
  @Delete('delete')
  async deleteUserData() {
    const userId = 'test-user-id'; // Placeholder
    // In production, send confirmation email first
    // Only delete after user confirms via email link

    await this.gdprService.deleteUserData(userId);

    return {
      message: 'User account and associated data have been deleted',
      deletedAt: new Date(),
    };
  }

  /**
   * Get privacy preferences
   * TODO: Add @UseGuards(JwtAuthGuard) when auth module is ready
   */
  @Get('preferences')
  async getPreferences() {
    const userId = 'test-user-id'; // Placeholder
    return this.gdprService.getPrivacyPreferences(userId);
  }

  /**
   * Update privacy preferences
   * TODO: Add @UseGuards(JwtAuthGuard) when auth module is ready
   */
  @Post('preferences')
  async updatePreferences(@Body() preferences: PrivacyPreferences) {
    const userId = 'test-user-id'; // Placeholder
    return this.gdprService.updatePrivacyPreferences(userId, preferences);
  }

  /**
   * Get data retention status
   * TODO: Add @UseGuards(JwtAuthGuard) when auth module is ready
   */
  @Get('retention-status')
  async getRetentionStatus() {
    const userId = 'test-user-id'; // Placeholder
    return this.gdprService.getRetentionStatus(userId);
  }

  /**
   * Request data archive
   * TODO: Add @UseGuards(JwtAuthGuard) when auth module is ready
   */
  @Post('archive')
  async archiveData() {
    const userId = 'test-user-id'; // Placeholder
    await this.gdprService.archiveUserData(userId);

    return {
      message: 'Old user data has been archived',
      archivedAt: new Date(),
    };
  }
}
