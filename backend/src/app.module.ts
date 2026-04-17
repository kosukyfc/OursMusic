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
import { GenresModule } from './genres/genres.module';
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
import { ArtistsModule } from './artists/artists.module';
import { DeployModule } from './deploy/deploy.module';
import { FamilyModule } from './family/family.module';
import { HealthModule } from './common/health/health.module';
import { LyricsModule } from './lyrics/lyrics.module';
import { RecommendationsModule } from './recommendations/recommendations.module';
import { VersioningModule } from './common/versioning/versioning.module';
// PHASE 6 Feature Modules
import { HeatmapModule } from './heatmap/heatmap.module';
import { MusicTheoryModule } from './songs/music-theory.module';
import { SetlistPersistenceModule } from './playlists/setlist-persistence.module';
import { UserPreferencesModule } from './storage/user-preferences.module';
import { AudioModule } from './audio/audio.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    // TODO: Enable CacheModule when redis dependencies are resolved
    // CacheModule,
    EventEmitterModule.forRoot(),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000,   // 1 segundo
        limit: 5,    // máx 5 req/s por IP
      },
      {
        name: 'medium',
        ttl: 60000,  // 1 minuto
        limit: 100,  // máx 100 req/min por IP
      },
      {
        name: 'long',
        ttl: 3600000, // 1 hora
        limit: 1000,  // máx 1000 req/h por IP
      },
    ]),
    PrismaModule,
    AuthModule,
    StorageModule,
    SongsModule,
    GenresModule,
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
    ArtistsModule,
    AppUpdateModule,
    InteractionsModule,
    DeployModule,
    FamilyModule,
    HealthModule,
    VersioningModule,
    LyricsModule,
    RecommendationsModule,
    // PHASE 6: Heatmap + Music Theory + Setlist + User Preferences + Audio Features
    HeatmapModule,
    MusicTheoryModule,
    SetlistPersistenceModule,
    UserPreferencesModule,
    AudioModule,
    // TODO: Enable when schema is ready
    // CollaborativePlaylistsModule,
    // TODO: Enable when prom-client is installed
    // MetricsModule,
    // PerformanceModule,
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
