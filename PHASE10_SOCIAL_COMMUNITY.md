# Phase 10: Social & Community 👥

## Overview
Turn OurMusic into a vibrant social platform where users discover, collaborate, and connect through music.

---

## 1. User Profiles & Social Features

### Features
- Public/private profiles
- Follow system with notifications
- User badges & achievements
- Bio + music taste summary
- Profile customization

### Architecture

```typescript
// UserProfileService
interface UserProfile {
  id: string;
  userId: string;
  username: string;
  displayName: string;
  bio: string;
  avatar: string;
  banner: string;
  joinedDate: Date;
  musicTaste: MusicTaste;
  stats: UserStats;
  isPublic: boolean;
  verifiedStatus: 'none' | 'artist' | 'label' | 'influencer';
  badges: Badge[];
  followers: number;
  following: number;
  topGenres: Genre[];
  topArtists: Artist[];
}

interface MusicTaste {
  topGenres: { genre: string; percentage: number }[];
  eraPreference: { era: string; percentage: number }[];
  energyPreference: number; // 0-1
  acousticnessPreference: number; // 0-1
  danceabilityPreference: number; // 0-1
}

interface UserStats {
  totalListens: number;
  totalMinutes: number;
  totalPlaylists: number;
  totalFollowers: number;
  totalFollowing: number;
  mostPlayedSong: Track;
  mostPlayedArtist: Artist;
  joinStreak: number;
}

interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  earnedDate: Date;
}

class UserProfileService {
  // Profile management
  async getProfile(userId: string): Promise<UserProfile>;
  async updateProfile(userId: string, updates: Partial<UserProfile>): Promise<UserProfile>;
  async uploadAvatar(userId: string, file: Buffer): Promise<string>;
  async uploadBanner(userId: string, file: Buffer): Promise<string>;
  
  // Follow system
  async follow(userId: string, targetUserId: string): Promise<void>;
  async unfollow(userId: string, targetUserId: string): Promise<void>;
  async getFollowers(userId: string, limit: number): Promise<User[]>;
  async getFollowing(userId: string, limit: number): Promise<User[]>;
  async isFollowing(userId: string, targetUserId: string): Promise<boolean>;
  
  // Profile discovery
  async discoverProfiles(userId: string, filters: DiscoveryFilters): Promise<UserProfile[]>;
  async getRecommendedProfiles(userId: string): Promise<UserProfile[]>;
  async searchProfiles(query: string): Promise<UserProfile[]>;
  
  // Badges & achievements
  async awardBadge(userId: string, badgeName: string): Promise<void>;
  async getBadges(userId: string): Promise<Badge[]>;
  async getAvailableBadges(): Promise<Badge[]>;
  
  // Profile visibility
  async setProfileVisibility(userId: string, isPublic: boolean): Promise<void>;
  async blockUser(userId: string, targetUserId: string): Promise<void>;
  async unblockUser(userId: string, targetUserId: string): Promise<void>;
  async isBlocked(userId: string, targetUserId: string): Promise<boolean>;
}
```

### Badge System

```typescript
const ACHIEVEMENT_BADGES = [
  {
    name: 'Early Adopter',
    description: 'Part of the first 1000 users',
    rarity: 'legendary',
    icon: '🌟',
  },
  {
    name: 'Music Lover',
    description: 'Listened to 1,000 songs',
    rarity: 'common',
    icon: '❤️',
  },
  {
    name: 'Playlist Master',
    description: 'Created 50 playlists',
    rarity: 'rare',
    icon: '📋',
  },
  {
    name: 'Social Butterfly',
    description: 'Have 1,000 followers',
    rarity: 'epic',
    icon: '🦋',
  },
  {
    name: 'Curator',
    description: 'Had a playlist followed by 10,000 users',
    rarity: 'legendary',
    icon: '🎨',
  },
  {
    name: 'Night Owl',
    description: 'Most listened between 12 AM - 6 AM',
    rarity: 'rare',
    icon: '🦉',
  },
  {
    name: 'Trend Setter',
    description: 'Created a viral playlist',
    rarity: 'epic',
    icon: '🔥',
  },
  {
    name: 'Genre Adventurer',
    description: 'Listened to 50+ different genres',
    rarity: 'rare',
    icon: '🗺️',
  },
];
```

### Endpoints
```
GET    /profiles/:userId                                - Get user profile
PUT    /profiles/:userId                                - Update profile
POST   /profiles/:userId/avatar                         - Upload avatar
POST   /profiles/:userId/banner                         - Upload banner
POST   /profiles/:userId/follow                         - Follow user
POST   /profiles/:userId/unfollow                       - Unfollow user
GET    /profiles/:userId/followers                      - Get followers
GET    /profiles/:userId/following                      - Get following
GET    /profiles/:userId/badges                         - Get badges
POST   /profiles/:userId/block                          - Block user
GET    /profiles/discover                               - Discover profiles
GET    /profiles/search                                 - Search profiles
```

---

## 2. Live Listening Parties

### Features
- Real-time synchronized playback
- Live chat during listening
- Voting on next track
- Virtual venues
- Limited-time events
- Streamer controls

### Architecture

```typescript
// ListeningPartyService
interface ListeningParty {
  id: string;
  creatorId: string;
  name: string;
  description: string;
  currentTrack: Track;
  currentTrackStartTime: Date;
  queue: Track[];
  participants: PartyParticipant[];
  chat: ChatMessage[];
  votingEnabled: boolean;
  votes: Record<string, number>; // trackId -> upvotes
  status: 'upcoming' | 'live' | 'ended';
  scheduledStartTime?: Date;
  endTime?: Date;
  venue?: string; // virtual venue theme
  isPublic: boolean;
  maxParticipants: number;
}

interface PartyParticipant {
  userId: string;
  joinedAt: Date;
  role: 'host' | 'participant';
  isActive: boolean;
}

interface ChatMessage {
  id: string;
  userId: string;
  username: string;
  avatar: string;
  content: string;
  timestamp: Date;
  reactions: Reaction[];
}

class ListeningPartyService {
  // Party management
  async createListeningParty(hostId: string, config: PartyConfig): Promise<ListeningParty>;
  async getParty(partyId: string): Promise<ListeningParty>;
  async joinParty(userId: string, partyId: string): Promise<void>;
  async leaveParty(userId: string, partyId: string): Promise<void>;
  async endParty(partyId: string): Promise<void>;
  
  // Playback sync
  async getCurrentPlaybackState(partyId: string): Promise<PlaybackState>;
  async syncPlayback(partyId: string): Observable<PlaybackState>;
  async getPlaybackOffset(userId: string): Promise<number>;
  
  // Queue management
  async addToQueue(partyId: string, track: Track, addedBy: string): Promise<void>;
  async removeFromQueue(partyId: string, trackId: string): Promise<void>;
  async reorderQueue(partyId: string, trackId: string, newPosition: number): Promise<void>;
  
  // Voting system
  async enableVoting(partyId: string): Promise<void>;
  async disableVoting(partyId: string): Promise<void>;
  async voteOnTrack(userId: string, partyId: string, trackId: string, voteType: 'up' | 'down'): Promise<void>;
  async applyVotingResults(partyId: string): Promise<void>;
  
  // Chat
  async sendMessage(userId: string, partyId: string, content: string): Promise<ChatMessage>;
  async getMessages(partyId: string, limit: number): Promise<ChatMessage[]>;
  async addReaction(userId: string, messageId: string, emoji: string): Promise<void>;
  
  // Discovery
  async getPublicParties(): Promise<ListeningParty[]>;
  async searchParties(query: string): Promise<ListeningParty[]>;
  async getPartyRecommendations(userId: string): Promise<ListeningParty[]>;
  
  // Venues
  async getAvailableVenues(): Promise<VirtualVenue[]>;
  async setPartyVenue(partyId: string, venue: string): Promise<void>;
}

const VIRTUAL_VENUES = [
  { name: 'Underground Club', theme: 'dark', capacity: 100 },
  { name: 'Rooftop Bar', theme: 'night-sky', capacity: 50 },
  { name: 'Concert Hall', theme: 'elegant', capacity: 500 },
  { name: 'Beach Party', theme: 'tropical', capacity: 200 },
  { name: 'Festival Main Stage', theme: 'vibrant', capacity: 1000 },
];
```

### Endpoints
```
POST   /listening-parties/create                        - Create party
GET    /listening-parties/:partyId                      - Get party details
POST   /listening-parties/:partyId/join                 - Join party
POST   /listening-parties/:partyId/leave                - Leave party
GET    /listening-parties/:partyId/playback-state       - Get playback state
WS     /listening-parties/:partyId/sync                 - Sync stream
POST   /listening-parties/:partyId/queue                - Add to queue
POST   /listening-parties/:partyId/vote                 - Vote on track
POST   /listening-parties/:partyId/chat                 - Send message
GET    /listening-parties/public                        - List public parties
GET    /listening-parties/search                        - Search parties
```

---

## 3. Collaborative Playlists v2

### Features (Extended)
- Real-time collaboration (10+ users)
- Playlist forking (create variation)
- Comment threads on tracks
- Contribution tracking
- Voting on additions
- Permissions system (viewer/editor/can_vote)

### Architecture

```typescript
// EnhancedPlaylistService
interface PlaylistPermission {
  userId: string;
  role: 'owner' | 'editor' | 'voter' | 'viewer';
  addedAt: Date;
}

interface PlaylistComment {
  id: string;
  trackId: string;
  userId: string;
  username: string;
  content: string;
  createdAt: Date;
  replies: PlaylistReply[];
  reactions: Reaction[];
}

interface TrackContribution {
  userId: string;
  trackId: string;
  action: 'added' | 'removed' | 'reordered';
  createdAt: Date;
}

class EnhancedPlaylistService {
  // Advanced collaboration
  async forkPlaylist(userId: string, playlistId: string): Promise<Playlist>;
  async mergePlaylistBranches(playlistId: string, sourceId: string): Promise<void>;
  async getPlaylistHistory(playlistId: string): Promise<PlaylistVersion[]>;
  
  // Comments & discussion
  async addTrackComment(playlistId: string, trackId: string, userId: string, content: string): Promise<PlaylistComment>;
  async getTrackComments(playlistId: string, trackId: string): Promise<PlaylistComment[]>;
  async replyToComment(commentId: string, userId: string, content: string): Promise<PlaylistReply>;
  
  // Voting system
  async nominate TrackToPlaylist(playlistId: string, track: Track, nominatedBy: string): Promise<void>;
  async voteOnNominatedTrack(playlistId: string, trackId: string, userId: string, value: number): Promise<void>;
  async getVotingResults(playlistId: string): Promise<VotingResult[]>;
  
  // Contribution tracking
  async getPlaylistContributions(playlistId: string): Promise<TrackContribution[]>;
  async getUserContributions(playlistId: string, userId: string): Promise<TrackContribution[]>;
  async getContributorStats(playlistId: string): Promise<ContributorStats[]>;
  
  // Permissions
  async setPermission(playlistId: string, userId: string, role: PermissionRole): Promise<void>;
  async getPermissions(playlistId: string): Promise<PlaylistPermission[]>;
}
```

---

## 4. Music Challenges & Competitions

### Features
- Global challenges (theme-based)
- Leaderboards (weekly/monthly/all-time)
- Rewards & prizes
- Voting by community
- Showcase winner playlists

### Architecture

```typescript
// ChallengeService
interface Challenge {
  id: string;
  name: string;
  description: string;
  theme: string; // e.g., "Cosmic Love Songs", "Guilty Pleasures"
  startDate: Date;
  endDate: Date;
  rules: string[];
  prize: string;
  maxParticipants?: number;
  participants: Participant[];
  submissions: ChallengeSubmission[];
  winner?: string;
  status: 'upcoming' | 'active' | 'voting' | 'completed';
}

interface ChallengeSubmission {
  id: string;
  playlistId: string;
  userId: string;
  username: string;
  submittedAt: Date;
  votes: number;
  rank: number;
  userScore: number; // Algorithm score
}

class ChallengeService {
  // Challenge management
  async getActiveChallenges(): Promise<Challenge[]>;
  async getChallenge(challengeId: string): Promise<Challenge>;
  async createChallenge(admin: User, config: ChallengeConfig): Promise<Challenge>;
  
  // Participation
  async joinChallenge(userId: string, challengeId: string): Promise<void>;
  async submitPlaylist(userId: string, challengeId: string, playlist: Playlist): Promise<ChallengeSubmission>;
  async getMySubmission(userId: string, challengeId: string): Promise<ChallengeSubmission>;
  
  // Voting
  async voteOnSubmission(voterId: string, submissionId: string): Promise<void>;
  async getSubmissionVotes(submissionId: string): Promise<number>;
  
  // Leaderboards
  async getChallengeLeaderboard(challengeId: string): Promise<ChallengeSubmission[]>;
  async getGlobalLeaderboard(): Promise<GlobalLeaderboardEntry[]>;
  async getWeeklyLeaderboard(): Promise<GlobalLeaderboardEntry[]>;
  
  // Results
  async determineWinner(challengeId: string): Promise<User>;
  async declareResults(challengeId: string): Promise<void>;
  async awardPrizes(challengeId: string): Promise<void>;
}

const CHALLENGE_EXAMPLES = [
  { name: 'Cosmic Love Songs', theme: 'space-themed love songs', duration: 7 },
  { name: 'Guilty Pleasures', theme: 'songs you love but never admit', duration: 7 },
  { name: 'One Hit Wonders', theme: 'celebrate lesser-known artists', duration: 14 },
  { name: 'Genre Mashup', theme: 'mix 2 unexpected genres', duration: 7 },
  { name: 'Decade Wars', theme: 'best from your birth decade', duration: 7 },
];
```

---

## 5. Fan Groups & Artist Communities

### Features
- Artist-led communities
- Exclusive content access
- Member-only discussions
- Fan art walls
- Direct artist interaction
- Exclusive merch access

### Architecture

```typescript
// CommunityService
interface FanGroup {
  id: string;
  artistId: string;
  artistName: string;
  memberCount: number;
  members: CommunityMember[];
  posts: CommunityPost[];
  exclusiveContent: ExclusiveContent[];
  merch: MerchItem[];
  discussions: Discussion[];
  isOfficial: boolean;
  joinCode?: string;
}

interface CommunityMember {
  userId: string;
  joinedAt: Date;
  role: 'member' | 'moderator' | 'admin';
  contributions: number;
  isArtist: boolean;
}

interface CommunityPost {
  id: string;
  authorId: string;
  content: string;
  media: string[];
  createdAt: Date;
  likes: number;
  comments: PostComment[];
}

interface ExclusiveContent {
  id: string;
  type: 'song' | 'performance' | 'message' | 'behind_the_scenes';
  content: string;
  createdAt: Date;
  artistOnly: boolean;
  accessLevel: 'free' | 'member' | 'premium_member';
}

class CommunityService {
  // Group management
  async createFanGroup(artistId: string, config: GroupConfig): Promise<FanGroup>;
  async getFanGroup(groupId: string): Promise<FanGroup>;
  async joinGroup(userId: string, groupId: string): Promise<void>;
  async leaveGroup(userId: string, groupId: string): Promise<void>;
  
  // Posts & discussions
  async createPost(userId: string, groupId: string, content: string, media?: string[]): Promise<CommunityPost>;
  async getGroupFeed(groupId: string, limit: number): Promise<CommunityPost[]>;
  async likePost(userId: string, postId: string): Promise<void>;
  async commentOnPost(userId: string, postId: string, content: string): Promise<PostComment>;
  
  // Exclusive content
  async uploadExclusiveContent(artistId: string, groupId: string, content: ExclusiveContent): Promise<void>;
  async getExclusiveContent(userId: string, groupId: string): Promise<ExclusiveContent[]>;
  
  // Merch integration
  async addMerch(groupId: string, item: MerchItem): Promise<void>;
  async getMerch(groupId: string): Promise<MerchItem[]>;
  async purchaseMerch(userId: string, groupId: string, merchId: string): Promise<Order>;
  
  // Moderation
  async moderatePost(moderatorId: string, postId: string, action: 'approve' | 'remove'): Promise<void>;
  async banMember(adminId: string, groupId: string, userId: string): Promise<void>;
}
```

---

## Database Schema

```prisma
model UserProfile {
  id                 String   @id @default(cuid())
  userId             String   @unique
  username           String   @unique
  displayName        String
  bio                String?
  avatar             String?
  banner             String?
  musicTaste         Json
  stats              Json
  isPublic           Boolean  @default(true)
  verifiedStatus     String   @default('none')
  badges             Json
  followersCount     Int      @default(0)
  followingCount     Int      @default(0)
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt
  
  user               User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@unique([userId])
}

model Following {
  id                 String   @id @default(cuid())
  followerId         String
  followingId        String
  createdAt          DateTime @default(now())
  
  @@unique([followerId, followingId])
  @@index([followerId])
  @@index([followingId])
}

model ListeningParty {
  id                 String   @id @default(cuid())
  creatorId          String
  name               String
  status             String   @default('upcoming')
  startTime          DateTime
  endTime            DateTime?
  participants       Json
  queue              Json
  currentTrack       String?
  isPublic           Boolean  @default(true)
  createdAt          DateTime @default(now())
  
  @@index([creatorId, startTime])
  @@index([isPublic])
}

model Challenge {
  id                 String   @id @default(cuid())
  name               String
  theme              String
  startDate          DateTime
  endDate            DateTime
  prize              String?
  status             String   @default('upcoming')
  submissions        Json
  winner             String?
  createdAt          DateTime @default(now())
  
  @@index([startDate, endDate])
}

model FanGroup {
  id                 String   @id @default(cuid())
  artistId           String
  name               String
  memberCount        Int      @default(0)
  isOfficial         Boolean  @default(false)
  createdAt          DateTime @default(now())
  
  @@index([artistId])
}
```

---

## Implementation Timeline

- **Week 1:** User profiles + follow system
- **Week 2:** Listening parties
- **Week 3:** Enhanced collaboration
- **Week 4:** Challenges & competitions
- **Week 5:** Fan groups & communities
- **Week 6:** Testing + refinement

---

## Success Metrics

- ✅ 100K+ user profiles created
- ✅ 10,000+ listening parties hosted
- ✅ 50+ active challenges
- ✅ 1,000+ fan groups
- ✅ 500K+ community posts
- ✅ 99.95% chat latency <100ms
- ✅ 95% user engagement increase
