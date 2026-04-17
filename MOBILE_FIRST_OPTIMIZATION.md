# Mobile-First Optimization & Performance Guide

## 1. FLUTTER PERFORMANCE OPTIMIZATION

### Build Configuration

```yaml
# pubspec.yaml
environment:
  sdk: '>=2.19.0 <4.0.0'
  
dependencies:
  flutter:
    sdk: flutter
  
  # Performance
  provider: ^6.0.0
  cached_network_image: ^3.3.0
  flutter_cache_manager: ^3.3.0
  
  # Audio
  just_audio: ^0.9.0
  audio_session: ^0.1.0
  
  # Networking
  dio: ^5.0.0
  connectivity_plus: ^5.0.0
  
  # Storage
  hive: ^2.2.0
  hive_flutter: ^1.1.0
  
  # UI Performance
  flutter_staggered_grid_view: ^0.7.0
  visibility_detector: ^0.10.0

dev_dependencies:
  flutter_test:
    sdk: flutter
  integration_test:
    sdk: flutter
```

### Android Performance (build.gradle)

```gradle
android {
    compileSdkVersion 34
    
    defaultConfig {
        minSdkVersion 24
        targetSdkVersion 34
        
        // Enable D8 optimization
        multiDexEnabled true
    }
    
    buildTypes {
        release {
            // ProGuard obfuscation
            minifyEnabled true
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
            
            // Shrink resources
            shrinkResources true
            
            // Enable code cache
            enableCodeCache true
        }
    }
    
    // Bundle size optimization
    bundle {
        enableSplit = true
    }
}
```

### iOS Optimization (ios/Runner.xcodeproj)

```swift
// Build Settings
- Strip Linked Product: YES
- Dead Code Stripping: YES
- Optimizer Level: -Osize
- Link-Time Optimization: YES (LTO)
```

## 2. OFFLINE SYNC ARCHITECTURE

```dart
// lib/services/offline_sync_service.dart
import 'package:hive_flutter/hive_flutter.dart';
import 'package:connectivity_plus/connectivity_plus.dart';

class OfflineSyncService {
  static const String QUEUE_BOX = 'sync_queue';
  static const String CACHE_BOX = 'offline_cache';
  
  final Connectivity _connectivity = Connectivity();
  late Box _queueBox;
  late Box _cacheBox;

  Future<void> initialize() async {
    await Hive.initFlutter();
    _queueBox = await Hive.openBox(QUEUE_BOX);
    _cacheBox = await Hive.openBox(CACHE_BOX);
    
    // Listen for connectivity changes
    _connectivity.onConnectivityChanged.listen((result) {
      if (result != ConnectivityResult.none) {
        syncPendingData();
      }
    });
  }

  /// Queue operation for offline execution
  Future<void> queueOperation(SyncOperation operation) async {
    await _queueBox.add({
      'type': operation.type,
      'data': operation.data,
      'timestamp': DateTime.now().toIso8601String(),
      'retries': 0,
    });
  }

  /// Cache data for offline access
  Future<void> cacheData(String key, dynamic data) async {
    await _cacheBox.put(key, {
      'data': data,
      'timestamp': DateTime.now().toIso8601String(),
    });
  }

  /// Get cached data
  dynamic getCachedData(String key) {
    return _cacheBox.get(key)?['data'];
  }

  /// Sync pending operations
  Future<void> syncPendingData() async {
    final operations = _queueBox.values.toList();
    
    for (var i = 0; i < operations.length; i++) {
      final op = operations[i];
      
      try {
        await _executeSyncOperation(op);
        await _queueBox.deleteAt(i);
      } catch (e) {
        // Retry with exponential backoff
        final retries = (op['retries'] ?? 0) + 1;
        if (retries < 3) {
          await _queueBox.putAt(i, {...op, 'retries': retries});
        } else {
          // Failed permanently
          await _queueBox.deleteAt(i);
        }
      }
    }
  }

  Future<void> _executeSyncOperation(Map op) async {
    switch (op['type']) {
      case 'add_to_playlist':
        // await _api.addToPlaylist(op['data']);
        break;
      case 'rate_song':
        // await _api.rateSong(op['data']);
        break;
      case 'create_playlist':
        // await _api.createPlaylist(op['data']);
        break;
    }
  }
}
```

## 3. BACKGROUND AUDIO STREAMING

```dart
// lib/services/background_audio_service.dart
import 'package:audio_service/audio_service.dart';
import 'package:audio_session/audio_session.dart';

class BackgroundAudioService extends BaseAudioHandler with SeekHandler {
  late AudioPlayer _audioPlayer;
  final _playlistNotifier = ValueNotifier<List<MediaItem>>([]);

  @override
  Future<void> onTaskRemoved() async {
    await stop();
  }

  @override
  Future<void> play() => _audioPlayer.play();

  @override
  Future<void> pause() => _audioPlayer.pause();

  @override
  Future<void> seek(Duration position) => _audioPlayer.seek(position);

  @override
  Future<void> skipToNext() async {
    // Get next song from queue
    final nextIndex = (mediaItem.value?.extras?['index'] ?? 0) + 1;
    await _loadMediaItem(_playlistNotifier.value[nextIndex]);
  }

  @override
  Future<void> skipToPrevious() async {
    final prevIndex = (mediaItem.value?.extras?['index'] ?? 0) - 1;
    await _loadMediaItem(_playlistNotifier.value[prevIndex]);
  }

  Future<void> _loadMediaItem(MediaItem item) async {
    mediaItem.add(item);
    await _audioPlayer.setAudioSource(AudioSource.uri(Uri.parse(item.extras?['url'])));
    await play();
  }

  // Setup audio session for background playback
  Future<void> setupAudioSession() async {
    final session = await AudioSession.instance;
    
    await session.configure(
      AudioSessionConfiguration.music(),
    );

    // Handle audio focus loss
    session.interruptionEventStream.listen((event) {
      if (event.begin) {
        if (event.type == AudioInterruptionType.duck) {
          _audioPlayer.setVolume(0.5);
        } else {
          pause();
        }
      } else {
        if (event.type == AudioInterruptionType.duck) {
          _audioPlayer.setVolume(1.0);
        } else if (mediaItem.value?.extras?['autoResume'] == true) {
          play();
        }
      }
    });
  }
}
```

## 4. WIDGET CUSTOMIZATION

```dart
// lib/widgets/custom_widgets.dart

/// Lock screen widget for album art
class LockScreenWidget extends StatelessWidget {
  final String albumArtUrl;
  final String songName;
  final String artist;

  const LockScreenWidget({
    required this.albumArtUrl,
    required this.songName,
    required this.artist,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        image: DecorationImage(
          image: NetworkImage(albumArtUrl),
          fit: BoxFit.cover,
        ),
      ),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 10, sigmaY: 10),
        child: Container(
          color: Colors.black.withOpacity(0.5),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text(
                songName,
                style: Theme.of(context).textTheme.headlineSmall,
              ),
              Text(artist),
            ],
          ),
        ),
      ),
    );
  }
}

/// Home screen widget with quick controls
class HomeScreenWidget extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Container(
      color: Colors.grey[900],
      child: Column(
        children: [
          // Current playing
          Container(
            padding: EdgeInsets.all(16),
            child: Row(
              children: [
                ClipRRect(
                  borderRadius: BorderRadius.circular(8),
                  child: Image.network('album_art_url', width: 60),
                ),
                SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Now Playing'),
                      Text('Song Name'),
                    ],
                  ),
                ),
                IconButton(
                  onPressed: () => AudioService.playpause(),
                  icon: Icon(Icons.play_arrow),
                ),
              ],
            ),
          ),
          // Quick shortcuts
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceEvenly,
            children: [
              QuickActionButton(
                icon: Icons.favorite_outline,
                onTap: () => likeCurrentSong(),
              ),
              QuickActionButton(
                icon: Icons.playlist_add,
                onTap: () => addToPlaylist(),
              ),
              QuickActionButton(
                icon: Icons.share,
                onTap: () => share(),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
```

## 5. PERFORMANCE METRICS

```dart
// lib/utils/performance_monitor.dart
import 'package:flutter/foundation.dart';
import 'package:firebase_performance/firebase_performance.dart';

class PerformanceMonitor {
  static final _trace = FirebasePerformance.instance;

  static void trackScreenLoad(String screenName) {
    final metric = _trace.newTrace('screen_load_$screenName');
    metric.start();
    
    // Calculate after frame
    WidgetsBinding.instance.addPostFrameCallback((_) {
      metric.stop();
    });
  }

  static void trackApiCall(String endpoint) {
    final metric = _trace.newTrace('api_call_$endpoint');
    metric.start();
    return () => metric.stop();
  }

  static void trackAudioPlayback() {
    final metric = _trace.newTrace('audio_playback');
    metric.putAttribute('format', 'mp3');
    metric.putAttribute('bitrate', '320k');
    metric.start();
    return () => metric.stop();
  }
}
```

## 6. MEMORY OPTIMIZATION

```dart
// Efficient image loading
CachedNetworkImage(
  imageUrl: 'https://...',
  cacheManager: CacheManager(
    Config(
      'imageCache',
      stalePeriod: Duration(days: 30),
      maxNrOfCacheObjects: 200,
    ),
  ),
  memCacheHeight: 400,
  memCacheWidth: 400,
  placeholder: (context, url) => CircolarProgressIndicator(),
);

// Lazy loading lists
ListView.builder(
  itemCount: 1000,
  itemBuilder: (context, index) {
    return CachedNetworkImage(
      imageUrl: 'album_$index.jpg',
      cacheKey: 'album_$index',
    );
  },
);

// Dispose resources
@override
void dispose() {
  _playlistNotifier.dispose();
  _audioPlayer.dispose();
  super.dispose();
}
```

## 7. BUILD OPTIMIZATION

```bash
# Build release APK with size optimization
flutter build apk \
  --release \
  --split-per-abi \
  --target-platform android-arm64,android-arm

# Build iOS app
flutter build ios --release

# Check build size
flutter pub global activate app-bundle-analyzer
app-bundle-analyzer analyze app.aab
```

## 8. TESTING PERFORMANCE

```dart
// Performance test
void main() {
  isRunningInTest = true;

  group('Performance Tests', () {
    testWidgets('Playlist load performance', (WidgetTester tester) async {
      const sw = Stopwatch()..start();
      
      await tester.pumpWidget(PlaylistScreen());
      
      sw.stop();
      expect(sw.elapsedMilliseconds, lessThan(500));
    });

    testWidgets('Image loading performance', (WidgetTester tester) async {
      await tester.pumpWidget(AlbumArtDisplay());
      
      final renderObject = find.byType(Image).evaluate().first.renderObject;
      expect(renderObject, isNotNull);
    });
  });
}
```

## Performance Targets

- **App Launch**: < 2 seconds
- **Screen Navigation**: < 300ms
- **Image Loading**: < 500ms
- **API Response**: < 1 second  
- **Memory Usage**: < 200MB (idle)
- **Battery Impact**: < 5% per hour

This optimized mobile configuration ensures smooth, performant experience across all devices!
