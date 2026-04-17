import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 10,
  duration: '30s',
};

const BASE_URL = 'http://localhost:3000/api/v1';

export default function () {
  // Spike: Many concurrent requests
  const requests = {
    'GET /songs': () => http.get(`${BASE_URL}/songs?limit=100`),
    'GET /recommendations': () =>
      http.get(`${BASE_URL}/recommendations`, {
        headers: {
          Authorization: 'Bearer test_token',
        },
      }),
    'GET /playlists': () =>
      http.get(`${BASE_URL}/playlists`, {
        headers: {
          Authorization: 'Bearer test_token',
        },
      }),
    'POST /playlists': () =>
      http.post(
        `${BASE_URL}/playlists`,
        JSON.stringify({
          title: 'Spike Test',
        }),
        {
          headers: {
            Authorization: 'Bearer test_token',
            'Content-Type': 'application/json',
          },
        },
      ),
  };

  // Execute random request
  const endpoints = Object.keys(requests);
  const random = endpoints[Math.floor(Math.random() * endpoints.length)];

  const res = requests[random]();

  check(res, {
    'status 2xx': (r) => r.status >= 200 && r.status < 300,
    'response time < 1000ms': (r) => r.timings.duration < 1000,
  });

  sleep(0.5);
}
