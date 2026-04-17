// load-test.js - Apache JMeter Alternative
// Run: node load-test.js

const axios = require('axios');
const fs = require('fs');

const BASE_URL = process.env.API_URL || 'http://localhost:3000';
const CONCURRENT_USERS = parseInt(process.env.CONCURRENT || '100');
const TEST_DURATION_SECONDS = parseInt(process.env.DURATION || '60');
const RAMP_UP_SECONDS = parseInt(process.env.RAMP_UP || '10');

interface TestResult {
  name: string;
  method: string;
  path: string;
  totalRequests: number;
  successRequests: number;
  failedRequests: number;
  avgResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  requestsPerSecond: number;
  errors: string[];
}

class LoadTester {
  private results: Map<string, TestResult> = new Map();
  private activeUsers = 0;
  private startTime = Date.now();
  private testDuration = TEST_DURATION_SECONDS * 1000;
  private responseTimes: number[] = [];

  async runTest() {
    console.log(`🚀 Starting load test: ${CONCURRENT_USERS} users, ${TEST_DURATION_SECONDS}s duration`);

    // Ramp up users gradually
    const rampUpInterval = (RAMP_UP_SECONDS * 1000) / CONCURRENT_USERS;

    for (let i = 0; i < CONCURRENT_USERS; i++) {
      setTimeout(() => {
        this.spawnUser();
      }, i * rampUpInterval);
    }

    // Wait for test to complete
    await new Promise((resolve) => {
      setTimeout(resolve, this.testDuration + RAMP_UP_SECONDS * 1000 + 5000);
    });

    this.printResults();
  }

  private async spawnUser() {
    this.activeUsers++;

    const startTime = Date.now();
    while (Date.now() - startTime < this.testDuration) {
      try {
        await this.makeRequest();
      } catch (err) {
        console.error('Request failed:', err.message);
      }

      // Think time (0-2 seconds)
      await new Promise((resolve) => setTimeout(resolve, Math.random() * 2000));
    }

    this.activeUsers--;
  }

  private async makeRequest() {
    const scenario = this.getRandomScenario();
    const startTime = Date.now();

    try {
      const response = await axios({
        method: scenario.method,
        url: `${BASE_URL}${scenario.path}`,
        headers: {
          Authorization: `Bearer ${this.getRandomToken()}`,
        },
        timeout: 5000,
      });

      const responseTime = Date.now() - startTime;
      this.recordResult(scenario.name, scenario.method, scenario.path, responseTime, true);
      this.responseTimes.push(responseTime);
    } catch (err) {
      const responseTime = Date.now() - startTime;
      this.recordResult(scenario.name, scenario.method, scenario.path, responseTime, false, err.message);
    }
  }

  private getRandomScenario(): { name: string; method: string; path: string } {
    const scenarios = [
      // Discovery endpoints (10%)
      { name: 'Get Trending', method: 'GET', path: '/discovery/trending' },
      { name: 'Get Mood Songs', method: 'GET', path: '/discovery/mood?mood=happy' },

      // Playlist endpoints (20%)
      { name: 'Get Playlists', method: 'GET', path: '/playlists' },
      { name: 'Create Playlist', method: 'POST', path: '/playlists' },
      { name: 'Add to Playlist', method: 'POST', path: '/playlists/123/tracks' },

      // Search (15%)
      { name: 'Search Songs', method: 'GET', path: '/search?q=love' },
      { name: 'Search Artists', method: 'GET', path: '/search/artists?q=drake' },

      // Recommendations (20%)
      { name: 'Get Recommendations', method: 'GET', path: '/recommendations' },
      { name: 'Discover Weekly', method: 'GET', path: '/discovery/discover-weekly' },

      // Audio Analysis (15%)
      { name: 'Get Audio Features', method: 'GET', path: '/songs/123/audio-features' },
      { name: 'Analyze Playlist', method: 'POST', path: '/playlists/123/analyze' },

      // User stats (10%)
      { name: 'Get User Stats', method: 'GET', path: '/stats' },
      { name: 'Get Listening Time', method: 'GET', path: '/stats/listening-time' },

      // Social (10%)
      { name: 'Get Friend Playlists', method: 'GET', path: '/social/friends/playlists' },
      { name: 'Share Playlist', method: 'POST', path: '/playlists/123/share' },
    ];

    return scenarios[Math.floor(Math.random() * scenarios.length)];
  }

  private recordResult(
    name: string,
    method: string,
    path: string,
    responseTime: number,
    success: boolean,
    error?: string,
  ) {
    const key = `${method} ${path}`;

    if (!this.results.has(key)) {
      this.results.set(key, {
        name,
        method,
        path,
        totalRequests: 0,
        successRequests: 0,
        failedRequests: 0,
        avgResponseTime: 0,
        minResponseTime: Infinity,
        maxResponseTime: 0,
        p95ResponseTime: 0,
        p99ResponseTime: 0,
        requestsPerSecond: 0,
        errors: [],
      });
    }

    const result = this.results.get(key);
    result.totalRequests++;
    result.minResponseTime = Math.min(result.minResponseTime, responseTime);
    result.maxResponseTime = Math.max(result.maxResponseTime, responseTime);

    if (success) {
      result.successRequests++;
      result.avgResponseTime = (result.avgResponseTime * (result.successRequests - 1) + responseTime) / result.successRequests;
    } else {
      result.failedRequests++;
      if (error) result.errors.push(error);
    }
  }

  private getRandomToken(): string {
    // Mock JWT token
    return 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U';
  }

  private printResults() {
    console.log('\n\n📊 LOAD TEST RESULTS\n' + '='.repeat(80));

    const sortedResults = Array.from(this.results.values()).sort((a, b) =>
      Number(b.totalRequests) - Number(a.totalRequests),
    );

    for (const result of sortedResults) {
      const successRate = ((result.successRequests / result.totalRequests) * 100).toFixed(2);
      const rps = (result.totalRequests / TEST_DURATION_SECONDS).toFixed(2);

      console.log(`\n${result.method} ${result.path}`);
      console.log(`  Requests: ${result.totalRequests} (Success: ${result.successRequests}, Failed: ${result.failedRequests})`);
      console.log(`  Success Rate: ${successRate}%`);
      console.log(`  Response Times: Min=${result.minResponseTime}ms, Avg=${result.avgResponseTime.toFixed(0)}ms, Max=${result.maxResponseTime}ms`);
      console.log(`  Throughput: ${rps} req/s`);

      if (result.errors.length > 0) {
        console.log(`  Errors: ${result.errors.slice(0, 3).join(', ')}`);
      }
    }

    // Overall statistics
    const totalRequests = Array.from(this.results.values()).reduce((sum, r) => sum + r.totalRequests, 0);
    const totalSuccesses = Array.from(this.results.values()).reduce((sum, r) => sum + r.successRequests, 0);
    const totalFailed = Array.from(this.results.values()).reduce((sum, r) => sum + r.failedRequests, 0);

    console.log('\n' + '='.repeat(80));
    console.log(`Total Requests: ${totalRequests}`);
    console.log(`Total Success: ${totalSuccesses} (${((totalSuccesses / totalRequests) * 100).toFixed(2)}%)`);
    console.log(`Total Failed: ${totalFailed}`);
    console.log(`Overall RPS: ${(totalRequests / TEST_DURATION_SECONDS).toFixed(2)}`);

    // Percentiles
    this.responseTimes.sort((a, b) => a - b);
    const p95 = this.responseTimes[Math.floor(this.responseTimes.length * 0.95)];
    const p99 = this.responseTimes[Math.floor(this.responseTimes.length * 0.99)];

    console.log(`P95 Response Time: ${p95}ms`);
    console.log(`P99 Response Time: ${p99}ms`);

    // Save report
    const report = {
      timestamp: new Date().toISOString(),
      configuration: {
        baseUrl: BASE_URL,
        concurrentUsers: CONCURRENT_USERS,
        testDurationSeconds: TEST_DURATION_SECONDS,
        rampUpSeconds: RAMP_UP_SECONDS,
      },
      results: Array.from(this.results.values()),
      summary: {
        totalRequests,
        totalSuccesses,
        totalFailed,
        successRate: `${((totalSuccesses / totalRequests) * 100).toFixed(2)}%`,
        rps: (totalRequests / TEST_DURATION_SECONDS).toFixed(2),
        p95,
        p99,
      },
    };

    fs.writeFileSync(`load-test-report-${Date.now()}.json`, JSON.stringify(report, null, 2));
    console.log(`\n✅ Report saved to load-test-report-${Date.now()}.json`);
  }
}

// Run test
const tester = new LoadTester();
tester.runTest().catch(console.error);
