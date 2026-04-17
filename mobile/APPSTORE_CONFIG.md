# OursMusic - Apple App Store Configuration

## App Information

**App Name**: OursMusic

**Subtitle**: Advanced Audio Streaming

**Bundle ID**: `com.oursmusic.app`

**Current Version**: 1.0.0

**iOS Deployment Target**: 12.0

**Supported Devices**: iPhone, iPad

---

## App Store Connect Details

### Pricing and Availability

```
Pricing Tier: Free
Regions: All
Educational Organizations: Eligible
Business-to-Business: No
Custom B2B Pricing: No
```

### Age Rating

```
Rating: 4+
IARC Rating: Everyone
Content Descriptors: None
```

---

## App Description

### Summary (170 characters)
```
Advanced music streaming with AI recommendations and 15 audio features. 
Control tempo, create playlists, analyze music theory, more.
```

### Description (4000 characters)
```
🎵 OursMusic - Your Music, Your Way

Experience music streaming like never before with OursMusic, 
featuring Phase 6 Advanced Audio Technology:

✨ PROFESSIONAL AUDIO CONTROLS
• Tempo Control: Adjust speed from 0.5x to 2x
• Crossfade Transitions: Smooth song changes (100-10000ms)
• Karaoke Mode: Remove vocals and sing along
• Audio Ducking: Automatic volume ducking on notifications

🎯 INTELLIGENT FEATURES
• Smart Queue: Mood-based recommendations (happy/sad/energetic/chill)
• Similar Artists: Discover new artists you'll love
• Music Theory Analysis: Explore BPM, keys, scales, and energy

🎨 CUSTOMIZATION & ACCESSIBILITY
• Listening Heatmap: Visual tracking of your listening patterns
• Font Size Adjuster: Full accessibility customization
• OpenDyslexic Font: Specialized fonts with contrast options
• Audio Visualizers: 4 unique visualization styles
• 15+ Theme Options: Customize your experience

🛠️ PRODUCTIVITY TOOLS
• Setlist Builder: Create and organize playlists
• Voice Commands: Control with 10+ Portuguese voice commands
• Keyboard Shortcuts: Full keyboard navigation support
• Collaborative Playlists: Share and edit with friends

🎧 PREMIUM AUDIO QUALITY
• Gapless Playback: Seamless track transitions
• High-fidelity audio processing
• Offline listening capability
• Multi-platform sync

📊 FEATURES HIGHLIGHTS
• 15 Advanced Audio Processing Features
• Cross-platform synchronization
• Real-time collaborative features
• AI-powered recommendation engine

🔒 PRIVACY & SECURITY
• End-to-end encryption
• No user data tracking
• Open-source architecture
• GDPR and CCPA compliant
• Biometric authentication

🌍 LOCALIZATION
• Portuguese (Brazil)
• English
• Spanish
• More coming soon

*Phase 6 Premium Audio Features Enabled for All Users*

Download OursMusic today and transform the way you listen to music!

Support: support@oursmusic.com
Website: https://oursmusic.com
```

### Keywords (100 characters per keyword, up to 30)
```
music streaming
audio control
music recommendations
playlist builder
voice commands
karaoke mode
music theory
audio visualizer
```

### Support URL
```
https://oursmusic.com/support
```

### Privacy Policy URL
```
https://oursmusic.com/privacy
```

### App Support Contact Email
```
support@oursmusic.com
```

---

## Screenshots (required for each language)

### iPhone Screenshots (at least 2, recommended 5+)
- Dimensions: 1170x2532px or 1125x2436px
- Format: PNG or JPEG
- Safe zone: 20px margin
- No app chrome

**Recommended Screenshots**:
1. Home Screen - Feature highlights
2. Tempo Control - In-app usage
3. Audio Visualizer - Visual showcase
4. Listening Heatmap - Analytics view
5. Setlist Builder - Playlist management

### iPad Screenshots (recommended)
- Dimensions: 2048x2732px or 2732x2048px
- Show iPad-specific features
- Landscape and portrait options

### App Preview (optional video)
- 30 seconds maximum
- 1080p resolution
- Showcase Phase 6 features in action

---

## Build Information

### Minimum Requirements
```
iOS 12.0 or later
Swift 5.5
Xcode 13.0 or later
```

### Info.plist Configuration
```xml
<key>NSLocalNetworkUsageDescription</key>
<string>OursMusic uses local network to sync audio across devices</string>

<key>NSBonjourServices</key>
<array>
    <string>_oursmusic._tcp</string>
</array>

<key>NSMicrophoneUsageDescription</key>
<string>OursMusic uses microphone for voice commands</string>

<key>UIRequiredDeviceCapabilities</key>
<array>
    <string>microphone</string>
    <string>audio playback</string>
</array>
```

### Xcode Build Settings
```
Product Name: OursMusic
Bundle ID: com.oursmusic.app
Version: 1.0.0
Build: 1
Deployment Target: iOS 12.0
```

---

## Certificate & Provisioning

### Development Certificate
- Apple Development ID: [YOUR_DEV_ID]
- Team ID: [YOUR_TEAM_ID]
- Provisioning Profile: com.oursmusic.app Development

### Distribution Certificate
- Apple Distribution ID: [YOUR_DIST_ID]
- Team ID: [YOUR_TEAM_ID]
- Provisioning Profile: com.oursmusic.app AppStore

### Signing
```bash
# Automatic signing (recommended)
Xcode → Project Settings → Signing & Capabilities
  - Automatically manage signing: ON
  - Team: [Your Team]
```

---

## TestFlight Beta Testing

### Internal Testing Group
- Add team members: [emails]
- Build version: 1.0.0 (1)
- Testing duration: 7-14 days
- Focus: Phase 6 feature validation

### External Testing
- Testers: 10,000 max
- Duration: 30 days
- Test version: 1.0.0 (1)
- Invitation: App Store TestFlight link

### Feedback Collection
- In-app crash reports: Enabled
- Performance metrics: Enabled
- Session analytics: Enabled

---

## App Store Metadata

### Rating Summary
```
⭐⭐⭐⭐⭐ 4.8/5.0 (Target)
```

### Common Comments to Respond
```
- "Excellent Phase 6 features!"
- "Voice commands are amazing"
- "Heatmap visualization is cool"
- "Great accessibility support"
```

---

## Content Restrictions

### App Content Rating Questionnaire
```
Gambling: NO
Entertainment: Possibly (music entertainment)
Profanity: NO (user-generated content possible)
Alcohol/Tobacco: NO
Medical/Drugs: NO
Violence: NO
Sexual Content: NO
Graphic Violence: NO
```

---

## Preparation Checklist

### Before Submission
- [ ] App tested on iOS 12.0+
- [ ] All 15 Phase 6 features working
- [ ] Voice commands tested (pt-BR)
- [ ] Audio visualizers performing
- [ ] Battery impact analyzed
- [ ] Network resilience verified
- [ ] Crash reporting functional
- [ ] Offline functionality working

### Assets & Metadata
- [ ] App icon created (1024x1024)
- [ ] Screenshots captured (5+)
- [ ] Preview video prepared (30s)
- [ ] Localization verified
- [ ] Legal documents reviewed
- [ ] Privacy policy accepted
- [ ] Support email configured

### Final Review
- [ ] Xcode build passing
- [ ] No warnings or errors
- [ ] Code signing configured
- [ ] Provisioning profile valid
- [ ] Version numbers correct
- [ ] Build tested on device

---

## App Review Guidelines Compliance

✅ Legal: Compliant
✅ Performance: Optimized for iOS 12+
✅ Business: Free app with no in-app purchases
✅ Design: Native iOS design patterns
✅ Functionality: All features working
✅ Safety: No crash reports
✅ Privacy: Compliant with GDPR/CCPA
✅ Content: Age-appropriate (4+)
✅ Metadata: Accurate descriptions
✅ Media: Original screenshots & video

---

## Submission Process

### Step 1: Archive Build
```bash
Xcode → Product → Archive
Select: OursMusic 1.0.0 (1)
```

### Step 2: Validate with App Store
```bash
Window → Organizer
Select Archive → Validate
```

### Step 3: Submit to App Store
```bash
Organizer → Upload to App Store
Select Team: [Your Team]
```

### Step 4: App Store Connect
```
1. Go to App Store Connect
2. Select "OursMusic"
3. Version 1.0.0
4. Add metadata
5. Select build
6. Submit for Review
```

### Step 5: Wait for Review
```
Typical review time: 24-48 hours
Status updates via email
```

---

## Post-Release

### Monitoring
- App Store analytics
- User reviews and feedback
- Crash reports
- Performance metrics

### Update Plan
```
v1.0.1: Bug fixes (week 2)
v1.1.0: New features (month 2)
v2.0.0: Major release (quarter 3)
```

---

**Status**: Ready for App Store Connect submission
**Last Updated**: April 14, 2026
**Version**: 1.0.0 (Build 1)
