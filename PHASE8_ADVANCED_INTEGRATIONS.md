# Phase 8: Advanced Integrations 🔗

## Overview
Complete ecosystem integration enabling OurMusic to work seamlessly across all platforms and devices users already own.

---

## 1. Spotify Connect Integration

### Features
- Mirror playback control across devices
- Queue synchronization
- Cross-device playback restart
- Seamless handoff between devices
- Remote volume control
- Playback status streaming

### Architecture

```typescript
// SpotifyConnectService
interface SpotifyDevice {
  id: string;
  name: string;
  type: 'Smartphone' | 'Tablet' | 'Computer' | 'Speaker' | 'TV';
  isActive: boolean;
  volume: number;
  supportsVolume: boolean;
  isPrivateSession: boolean;
}

interface PlaybackState {
  device: SpotifyDevice;
  currentTrack: TrackInfo;
  isPlaying: boolean;
  positionMs: number;
  durationMs: number;
  timestamp: Date;
}

class SpotifyConnectService {
  // Get all connected devices
  async getDevices(userId: string): Promise<SpotifyDevice[]>;
  
  // Transfer playback to device
  async transferPlayback(userId: string, deviceId: string, play?: boolean): Promise<void>;
  
  // Get current playback state
  async getCurrentPlayback(userId: string): Promise<PlaybackState>;
  
  // WebSocket stream for real-time updates
  subscribeToPlayback(userId: string): Observable<PlaybackState>;
  
  // Control playback
  async play(userId: string, deviceId?: string): Promise<void>;
  async pause(userId: string, deviceId?: string): Promise<void>;
  async setVolume(userId: string, volumePercent: number, deviceId?: string): Promise<void>;
  async next(userId: string): Promise<void>;
  async previous(userId: string): Promise<void>;
}
```

### Endpoints (NestJS)
```
GET    /integrations/spotify/devices                    - List devices
POST   /integrations/spotify/playback/transfer          - Transfer playback
GET    /integrations/spotify/playback/current           - Get playback state
POST   /integrations/spotify/playback/play              - Resume playback
POST   /integrations/spotify/playback/pause             - Pause playback
PUT    /integrations/spotify/playback/volume            - Set volume
POST   /integrations/spotify/playback/next              - Next track
POST   /integrations/spotify/playback/previous          - Previous track
WS     /integrations/spotify/playback/stream            - Real-time playback
```

---

## 2. Apple Home / HomeKit Integration

### Features
- Control music via Siri
- Play on any room speaker
- Multi-room audio setup
- Scene automation ("Hey Siri, party mode")
- Home theater mode with video sync
- Family room access

### Architecture

```typescript
// AppleHomeService
interface HomeKitDevice {
  id: string;
  name: string;
  type: 'Speaker' | 'AppleTV' | 'HomePod' | 'AirPlay';
  room: string;
  volume: number;
  isAvailable: boolean;
}

interface HomeKitScene {
  id: string;
  name: string;
  actions: SceneAction[];
  isActive: boolean;
}

interface SceneAction {
  type: 'play' | 'pause' | 'volume' | 'playlist';
  device?: string;
  value?: any;
}

class AppleHomeService {
  // HomeKit Accessory Protocol bridge
  async pairHomeKit(userId: string, setupCode: string): Promise<void>;
  
  // Get home devices
  async getHomeDevices(userId: string, homeId: string): Promise<HomeKitDevice[]>;
  
  // Get rooms & zones
  async getZones(userId: string, homeId: string): Promise<HomeKitZone[]>;
  
  // Play on device/room
  async playOnDevice(userId: string, deviceId: string, playlistId: string): Promise<void>;
  async playOnZone(userId: string, zoneId: string, playlistId: string): Promise<void>;
  
  // Get HomeKit scenes
  async getScenes(userId: string, homeId: string): Promise<HomeKitScene[]>;
  async activateScene(userId: string, sceneId: string): Promise<void>;
  
  // Create smart automations
  async createSceneAction(userId: string, sceneId: string, action: SceneAction): Promise<void>;
  
  // Siri voice command handling
  async handleSiriCommand(userId: string, command: string): Promise<PlaybackAction>;
}
```

### Siri Commands Support
```
"Play [playlist] on [device]"
"Add this song to My Library"
"Play my Discover Weekly"
"Create a party playlist"
"Play [mood] music in [room]"
"Set volume to [number]%"
"Skip this song"
"What's playing?"
```

### Endpoints
```
POST   /integrations/homekit/pair                       - Pair HomeKit
GET    /integrations/homekit/devices                    - List devices
GET    /integrations/homekit/zones                      - List zones
POST   /integrations/homekit/play/device/:id            - Play on device
POST   /integrations/homekit/play/zone/:id              - Play on zone
GET    /integrations/homekit/scenes                     - List scenes
POST   /integrations/homekit/scenes/:id/activate        - Activate scene
POST   /integrations/homekit/siri/command               - Process Siri command
```

---

## 3. Google Home / Alexa Integration

### Features
- Voice control via Google Assistant & Alexa
- Multi-room playback
- Routine automation
- Custom voice commands
- Device discovery / pairing
- Sync with smart displays

### Architecture

```typescript
// VoiceAssistantService
interface VoiceCommand {
  platform: 'google_home' | 'alexa';
  userId: string;
  command: string;
  intent: VoiceIntent;
  entities: CommandEntity[];
  confidence: number;
}

interface VoiceIntent {
  type: 'play' | 'pause' | 'skip' | 'volume' | 'query' | 'create' | 'add';
  target?: string; // playlist, song, artist, device
}

interface CommandEntity {
  type: 'playlist' | 'artist' | 'song' | 'device' | 'number';
  value: string;
}

class VoiceAssistantService {
  // Google Home endpoints
  async linkGoogleHome(userId: string, accessToken: string): Promise<void>;
  async getGoogleHomeDevices(userId: string): Promise<GoogleDevice[]>;
  async playOnGoogleDevice(userId: string, deviceId: string, playlistId: string): Promise<void>;
  
  // Alexa endpoints
  async linkAlexa(userId: string, accessToken: string): Promise<void>;
  async getAlexaDevices(userId: string): Promise<AlexaDevice[]>;
  async playOnAlexaDevice(userId: string, deviceId: string, playlistId: string): Promise<void>;
  
  // Voice command processing
  async processVoiceCommand(command: VoiceCommand): Promise<PlaybackAction>;
  
  // Intent mapping
  async resolveCommandIntent(text: string, platform: string): Promise<VoiceIntent>;
  
  // Custom routines
  async createRoutine(userId: string, name: string, triggers: string[], actions: PlaybackAction[]): Promise<Routine>;
  async listRoutines(userId: string): Promise<Routine[]>;
  async executeRoutine(userId: string, routineId: string): Promise<void>;
}

// Custom voice command examples support
const VOICE_COMMANDS = [
  "Alexa, play my workout playlist on the kitchen speaker",
  "Google, add this song to My Favorites",
  "Alexa, what's playing in the bedroom?",
  "Google, create a morning playlist",
  "Alexa, increase volume in the living room",
  "Google, shuffle my Discover Weekly",
];
```

### Endpoints
```
POST   /integrations/voice/google/link                  - Link Google Home
GET    /integrations/voice/google/devices               - List devices
POST   /integrations/voice/google/play                  - Play on device
POST   /integrations/voice/alexa/link                   - Link Alexa
GET    /integrations/voice/alexa/devices                - List devices
POST   /integrations/voice/alexa/play                   - Play on device
POST   /integrations/voice/command/process              - Process voice command
GET    /integrations/voice/routines                     - List routines
POST   /integrations/voice/routines                     - Create routine
POST   /integrations/voice/routines/:id/execute         - Execute routine
```

---

## 4. Wearables Integration (Apple Watch, Wear OS, Garmin)

### Features
- Playback control from wrist
- Activity-synced playlists
- Heart rate-based recommendations
- Watch complications showing now playing
- Offline sync for running
- Sleep timer on watch

### Architecture

```typescript
// WearablesService
interface WearableDevice {
  id: string;
  type: 'apple_watch' | 'wear_os' | 'garmin';
  model: string;
  pairedPhone: string;
  hasStorage: boolean;
  storageCapacity?: number;
}

interface ActivityData {
  type: 'running' | 'cycling' | 'gym' | 'walking' | 'sleeping';
  heartRate?: number;
  calories?: number;
  distance?: number;
  duration: number;
  timestamp: Date;
}

class WearablesService {
  // Device management
  async linkWearable(userId: string, deviceInfo: WearableDevice): Promise<void>;
  async getWearables(userId: string): Promise<WearableDevice[]>;
  async removeWearable(userId: string, wearableId: string): Promise<void>;
  
  // Activity tracking
  async syncActivityData(userId: string, wearableId: string, data: ActivityData): Promise<void>;
  async getActivityData(userId: string, timeRange: TimeRange): Promise<ActivityData[]>;
  
  // Playback control
  async sendPlaybackControl(wearableId: string, action: 'play' | 'pause' | 'next' | 'previous'): Promise<void>;
  async adjustVolume(wearableId: string, direction: 'up' | 'down'): Promise<void>;
  
  // Synced playlists for offline
  async syncPlaylistToWearable(userId: string, wearableId: string, playlistId: string): Promise<void>;
  async getWearableStorage(wearableId: string): Promise<StorageInfo>;
  
  // Watch complications
  async setNowPlayingComplication(wearableId: string, trackInfo: TrackInfo): Promise<void>;
  async getWatchFaceWidgets(userId: string, wearableId: string): Promise<WatchWidget[]>;
  
  // Sleep mode
  async setSleepTimer(wearableId: string, minutes: number): Promise<void>;
  async autoPlaySleepMusic(userId: string, wearableId: string): Promise<void>;
}
```

### Watch App Features
- **Apple Watch:**
  - Siri integration ("Play my workout mix")
  - Now Playing complication
  - Control Center shortcut
  - Offline storage (500MB-1GB)
  - Heart rate zone-based playlists

- **Wear OS:**
  - Notifications for liked songs
  - Quick settings tile
  - On-device storage (2-4GB)
  - Google Assistant integration
  - Sleep tracking music

- **Garmin:**
  - Activity-synced music
  - Music store integration
  - Sport app integration
  - Connect IQ app

### Endpoints
```
POST   /integrations/wearables/link                     - Link wearable
GET    /integrations/wearables                          - List devices
POST   /integrations/wearables/:id/activity/sync        - Sync activity data
GET    /integrations/wearables/:id/activity             - Get activity data
POST   /integrations/wearables/:id/playback/:action     - Control playback
POST   /integrations/wearables/:id/volume/:direction    - Adjust volume
POST   /integrations/wearables/:id/sync-playlist        - Sync offline playlist
GET    /integrations/wearables/:id/storage              - Get storage info
POST   /integrations/wearables/:id/sleep-timer          - Set sleep timer
POST   /integrations/wearables/:id/sleep-music          - Auto-play sleep music
```

---

## 5. Car Integration (Android Auto, Apple CarPlay, Tesla, Hyundai)

### Features
- Safe voice control while driving
- One-hand operation
- Navigation integration
- Contextual playlists (coffee shop → morning vibe)
- Automatic car detection
- Driving time recommendations

### Architecture

```typescript
// CarIntegrationService
interface CarDevice {
  id: string;
  make: string;
  model: string;
  year: number;
  os: 'android_auto' | 'carplay' | 'tesla' | 'hyundai' | 'other';
  canControlMusic: boolean;
  hasNavigation: boolean;
}

interface DrivingContext {
  isActive: boolean;
  location?: GeoLocation;
  destination?: GeoLocation;
  estimatedDuration: number;
  traffic: 'light' | 'moderate' | 'heavy';
}

class CarIntegrationService {
  // Car pairing
  async linkCar(userId: string, carInfo: CarDevice): Promise<void>;
  async getCars(userId: string): Promise<CarDevice[]>;
  
  // Context-aware playlists
  async getContextualPlaylist(userId: string, context: DrivingContext): Promise<Playlist>;
  async generateDrivePlaylist(
    userId: string,
    durationMinutes: number,
    mood?: string,
    era?: string
  ): Promise<Playlist>;
  
  // Safety features
  async enableDrivingMode(userId: string, carId: string): Promise<void>;
  async disableDrivingMode(userId: string): Promise<void>;
  async isDrivingModeActive(userId: string): Promise<boolean>;
  
  // Voice command for car
  async processCarVoiceCommand(userId: string, command: string): Promise<PlaybackAction>;
  
  // Destination integration
  async onNavigationStart(userId: string, destination: GeoLocation, estimatedDuration: number): Promise<void>;
  async suggestPlaylistForRoute(userId: string, destination: GeoLocation): Promise<PlaylistSuggestion>;
  
  // Spotify/Apple Music integration in car
  async syncCarPreferences(userId: string, carId: string): Promise<void>;
}

const DRIVING_PLAYLISTS = [
  { name: 'Long Road Trip', duration: 240, vibe: 'energetic', eras: ['70s', '80s', '90s', '2000s'] },
  { name: 'Focus Drive', duration: 120, vibe: 'calm', eras: 'all' },
  { name: 'Commute Vibes', duration: 60, vibe: 'motivational', eras: ['2010s', '2020s'] },
  { name: 'Late Night Highway', duration: 180, vibe: 'chill', eras: 'all' },
  { name: 'Road Trip: Coffee Stop Edition', duration: 90, vibe: 'upbeat', eras: 'all' },
];
```

### Features by Platform

**Android Auto:**
- Full voice control
- Hands-free operation
- Simplified UI for safety
- GPS integration
- Notification support

**Apple CarPlay:**
- Siri voice control
- Dashboard integration
- Waze/Maps routing
- Safe UI design
- Night mode support

**Tesla:**
- Center console control
- Autopilot-aware recommendations
- Supercharger playlists
- Ambient driving sounds
- Dashboard display

**Hyundai/Others:**
- OEM integration
- Automatic car detection
- Voice assistant support
- APIs for third-party cars

### Endpoints
```
POST   /integrations/car/link                           - Link car
GET    /integrations/car/devices                        - List cars
POST   /integrations/car/:id/driving-mode/enable        - Enable driving mode
POST   /integrations/car/:id/driving-mode/disable       - Disable driving mode
GET    /integrations/car/:id/driving-mode/status        - Check driving mode
POST   /integrations/car/:id/voice-command              - Process voice cmd
GET    /integrations/car/:id/contextual-playlist        - Get contextual playlist
POST   /integrations/car/:id/navigation/start           - On navigation start
POST   /integrations/car/:id/generate-drive-playlist    - Generate drive playlist
POST   /integrations/car/:id/sync-preferences           - Sync preferences
```

---

## 6. Gaming Platform Integration (Twitch, Discord, YouTube)

### Features
- Stream music selection interface
- Viewer-controlled playlist voting
- Streamer mode with chat controls
- Gaming soundtrack recommendations
- Overlay for stream display
- Revenue sharing from streamer plays

### Architecture

```typescript
// GamingIntegrationService
interface StreamingContext {
  platform: 'twitch' | 'youtube' | 'discord';
  streamerId: string;
  viewers: number;
  gameCategory: string;
  streamTitle: string;
  isLive: boolean;
}

interface StreamWidget {
  type: 'now_playing' | 'queue' | 'voting' | 'recommendations';
  position: 'overlay' | 'panel' | 'chat_bot';
  size: 'small' | 'medium' | 'large';
  customColors: string[];
}

class GamingIntegrationService {
  // Twitch integration
  async linkTwitch(userId: string, twitchToken: string): Promise<void>;
  async getTwitchStreamStatus(userId: string): Promise<StreamingContext>;
  
  // YouTube integration
  async linkYouTube(userId: string, youtubeToken: string): Promise<void>;
  async getYouTubeStreamStatus(userId: string): Promise<StreamingContext>;
  
  // Discord integration
  async linkDiscord(userId: string, discordToken: string): Promise<void>;
  async getDiscordVoiceChannels(userId: string): Promise<VoiceChannel[]>;
  
  // Playlist voting system
  async createViewerVotingPlaylist(streamerId: string, basePlaylist: Playlist): Promise<VotingPlaylist>;
  async submitVote(userId: string, playlistId: string, songId: string, voteType: 'up' | 'down'): Promise<void>;
  async getVotingResults(playlistId: string): Promise<VotingResults>;
  
  // Stream widgets
  async createStreamWidget(streamerId: string, config: StreamWidget): Promise<StreamWidgetInstance>;
  async getStreamWidgets(streamerId: string): Promise<StreamWidgetInstance[]>;
  
  // Chat bot commands
  async setupChatBot(streamerId: string, platform: 'twitch' | 'discord'): Promise<void>;
  async processCommandFromChat(command: ChatCommand, context: StreamingContext): Promise<PlaybackAction>;
  
  // Gaming soundtracks
  async getGameSoundtrack(gameTitle: string): Promise<Playlist>;
  async recommendSoundtrackForGame(gameCategory: string, viewers: number): Promise<Playlist>;
  
  // Revenue tracking
  async trackStreamerPlays(streamerId: string, timeRange: TimeRange): Promise<StreamerRevenue>;
  async getStreamerStats(streamerId: string): Promise<StreamerStats>;
}

const CHAT_BOT_COMMANDS = [
  { command: '!np', description: 'Show now playing' },
  { command: '!queue', description: 'Show queue' },
  { command: '!addmusic [song]', description: 'Add song to playlist' },
  { command: '!upvote', description: 'Upvote current song' },
  { command: '!downvote', description: 'Downvote current song' },
  { command: '!lastfm', description: 'Get streamer stats' },
  { command: '!soundtrack [game]', description: 'Get game soundtrack' },
];
```

### Stream Widget Examples
```typescript
interface NowPlayingWidget {
  showAlbumArt: boolean;
  showArtistName: boolean;
  showSongDuration: boolean;
  animationStyle: 'fade' | 'slide' | 'bounce';
  fontFamily: string;
  theme: 'dark' | 'light' | 'custom';
}

interface QueueWidget {
  maxItems: number;
  showUpcomingArtist: boolean;
  sortBy: 'queue_order' | 'votes';
  allowRequeues: boolean;
}

interface VotingWidget {
  showVoteCount: boolean;
  updateFrequency: number; // ms
  allowNegativeVotes: boolean;
}
```

### Endpoints
```
POST   /integrations/gaming/twitch/link                 - Link Twitch
GET    /integrations/gaming/twitch/stream-status        - Get stream status
POST   /integrations/gaming/youtube/link                - Link YouTube
POST   /integrations/gaming/discord/link                - Link Discord
GET    /integrations/gaming/discord/voice-channels      - List VC
POST   /integrations/gaming/voting-playlist             - Create voting playlist
POST   /integrations/gaming/vote                        - Submit vote
GET    /integrations/gaming/voting-results/:playlistId  - Get vote results
POST   /integrations/gaming/widget                      - Create widget
GET    /integrations/gaming/widgets                     - List widgets
POST   /integrations/gaming/chat-bot/setup              - Setup bot
POST   /integrations/gaming/chat-command                - Process command
GET    /integrations/gaming/game-soundtrack/:title      - Get game soundtrack
GET    /integrations/gaming/streamer-stats              - Get streamer stats
```

---

## Database Schema

```prisma
model ExternalIntegration {
  id                 String   @id @default(cuid())
  userId             String
  type               String   // 'spotify_connect', 'homekit', 'alarmxender', etc
  platform           String   // Device platform
  deviceId           String
  deviceName         String
  accessToken        String   @encrypted
  refreshToken       String?  @encrypted
  integrationData    Json     // Platform-specific data
  isActive           Boolean  @default(true)
  lastSyncedAt       DateTime?
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt
  
  user               User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@unique([userId, type, deviceId])
  @@index([userId, type])
}

model VoiceCommand {
  id                 String   @id @default(cuid())
  userId             String
  platform           String   // 'google_home', 'alexa', 'siri'
  command            String
  intent             String
  entities           Json
  confidence         Float
  action             String   // What was executed
  success            Boolean
  executedAt         DateTime @default(now())
  
  user               User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@index([userId, platform])
}

model StreamingActivity {
  id                 String   @id @default(cuid())
  userId             String
  platform           String   // 'twitch', 'youtube', 'discord'
  streamId           String
  viewCount          Int
  plays              Int
  upvotes            Int
  downvotes          Int
  startedAt          DateTime
  endedAt            DateTime?
  
  user               User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@index([userId, platform])
  @@index([startedAt])
}
```

---

## Implementation Timeline

- **Week 1:** Spotify Connect + HomeKit
- **Week 2:** Google Home + Alexa
- **Week 3:** Wearables (Watch, Wear OS, Garmin)
- **Week 4:** Car integrations (Android Auto, CarPlay, Tesla)
- **Week 5:** Gaming integrations (Twitch, YouTube, Discord)
- **Week 6:** Testing + refinement

---

## Success Metrics

- ✅ 5+ platform integrations
- ✅ <500ms voice command latency
- ✅ 95% voice recognition accuracy
- ✅ 99.9% device sync reliability
- ✅ 10,000+ concurrent device connections
- ✅ Zero critical bugs in integrations
