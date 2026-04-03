import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/guards';
import { StorageModule } from './storage/storage.module';
import { SongsModule } from './songs/songs.module';
import { ImportModule } from './import/import.module';
import { PlaylistsModule } from './playlists/playlists.module';
import { FavoritesModule } from './favorites/favorites.module';
import { OfflineModule } from './offline/offline.module';
import { SearchModule } from './search/search.module';
import { ActivityModule } from './activity/activity.module';
import { SubscriptionModule } from './subscription/subscription.module';
import { AdminModule } from './admin/admin.module';
import { SpotifyModule } from './spotify/spotify.module';
import { AppUpdateModule } from './app-update/app-update.module';
import { InteractionsModule } from './interactions/interactions.module';
import { SocialModule } from './social/social.module';
import { DevicesModule } from './devices/devices.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    EventEmitterModule.forRoot(),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 1 minute in ms
        limit: 100,
      },
    ]),
    PrismaModule,
    AuthModule,
    StorageModule,
    SongsModule,
    ImportModule,
    PlaylistsModule,
    FavoritesModule,
    OfflineModule,
    SearchModule,
    ActivityModule,
    SubscriptionModule,
    AdminModule,
    SpotifyModule,
    SocialModule,
    DevicesModule,
    AppUpdateModule,
    InteractionsModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
