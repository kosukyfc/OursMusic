<?php
/**
 * Phase 6 Analytics Dashboard API
 * Exposes Phase 6 metrics: Heatmaps, Features, Users
 */

require_once __DIR__ . '/initialize.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

// Mock data for Phase 6 metrics
$phase6Metrics = [
    'summary' => [
        'total_features' => 15,
        'features_enabled' => 15,
        'active_users_phase6' => 1234,
        'total_sessions' => 5678,
        'avg_session_duration' => '23m 45s'
    ],
    'features' => [
        'tempo_control' => ['enabled_count' => 456, 'usage_rate' => 0.85],
        'crossfade' => ['enabled_count' => 389, 'usage_rate' => 0.72],
        'karaoke_mode' => ['enabled_count' => 234, 'usage_rate' => 0.43],
        'audio_ducking' => ['enabled_count' => 567, 'usage_rate' => 0.91],
        'smart_queue' => ['enabled_count' => 612, 'usage_rate' => 0.89],
        'music_theory' => ['enabled_count' => 345, 'usage_rate' => 0.64],
        'gapless_playback' => ['enabled_count' => 478, 'usage_rate' => 0.76],
        'listening_heatmap' => ['enabled_count' => 523, 'usage_rate' => 0.79],
        'font_size_adjuster' => ['enabled_count' => 289, 'usage_rate' => 0.55],
        'voice_commands' => ['enabled_count' => 178, 'usage_rate' => 0.34],
        'keyboard_shortcuts' => ['enabled_count' => 401, 'usage_rate' => 0.67],
        'dyslexia_font' => ['enabled_count' => 67, 'usage_rate' => 0.12],
        'setlist_builder' => ['enabled_count' => 534, 'usage_rate' => 0.88],
        'audio_visualizer' => ['enabled_count' => 612, 'usage_rate' => 0.92],
        'similar_artists' => ['enabled_count' => 490, 'usage_rate' => 0.78]
    ],
    'heatmap_data' => generateHeatmapData(),
    'top_users' => [
        ['user_id' => 'user_001', 'features_enabled' => 15, 'sessions' => 234],
        ['user_id' => 'user_002', 'features_enabled' => 14, 'sessions' => 198],
        ['user_id' => 'user_003', 'features_enabled' => 13, 'sessions' => 187],
    ],
    'platform_breakdown' => [
        'web' => ['users' => 650, 'percentage' => 0.53],
        'mobile' => ['users' => 584, 'percentage' => 0.47],
    ],
    'regional_usage' => [
        'brazil' => 1089,
        'portugal' => 89,
        'other' => 56
    ]
];

echo json_encode($phase6Metrics, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);

function generateHeatmapData() {
    $heatmap = [];
    $days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    
    foreach ($days as $dayIdx => $day) {
        $heatmap[$day] = [];
        for ($hour = 0; $hour < 24; $hour++) {
            // Simulate listening patterns: peaks at 18-22 (evening)
            $intensity = $hour >= 18 && $hour <= 22 ? rand(60, 100) : rand(10, 40);
            $heatmap[$day][$hour] = $intensity;
        }
    }
    
    return $heatmap;
}
