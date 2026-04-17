import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '2m', target: 100 },  // Ramp up
    { duration: '5m', target: 100 },  // Stay at 100 users
    { duration: '2m', target: 200 },  // Spike test
    { duration: '5m', target: 200 },  // Stay at 200 users
    { duration: '2m', target: 0 },    // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests should be < 500ms
    http_req_failed: ['rate<0.1'],    // Error rate should be < 10%
  },
};

export default function () {
  // Test song listing
  const songRes = http.get('http://localhost:3000/api/v1/songs?limit=20');
  check(songRes, {
    'songs status 200': (r) => r.status === 200,
    'songs response time < 500ms': (r) => r.timings.duration < 500,
  });

  sleep(1);

  // Test recommendations
  const recRes = http.get('http://localhost:3000/api/v1/recommendations', {
    headers: {
      Authorization: 'Bearer test_token',
    },
  });
  check(recRes, {
    'recommendations status 200': (r) => r.status === 200,
    'recommendations response time < 500ms': (r) => r.timings.duration < 500,
  });

  sleep(1);

  // Test search
  const searchRes = http.get('http://localhost:3000/api/v1/search?q=jazz');
  check(searchRes, {
    'search status 200': (r) => r.status === 200 || r.status === 404,
    'search response time < 500ms': (r) => r.timings.duration < 500,
  });

  sleep(1);

  // Test playlist creation
  const createRes = http.post(
    'http://localhost:3000/api/v1/playlists',
    JSON.stringify({
      title: 'Load Test Playlist',
      description: 'Testing performance',
    }),
    {
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer test_token',
      },
    },
  );
  check(createRes, {
    'create playlist status 201': (r) => r.status === 201,
    'create playlist response time < 200ms': (r) => r.timings.duration < 200,
  });

  sleep(2);
}
