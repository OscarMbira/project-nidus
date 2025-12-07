/**
 * Load Testing Script
 * 
 * Simulates concurrent users to test system performance
 * Usage: node scripts/load-testing.js --users 1000 --duration 300
 */

import fetch from 'node-fetch';

const DEFAULT_USERS = 100;
const DEFAULT_DURATION = 60; // seconds
const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';

class LoadTester {
  constructor(options = {}) {
    this.concurrentUsers = options.users || DEFAULT_USERS;
    this.duration = options.duration || DEFAULT_DURATION;
    this.baseUrl = options.baseUrl || BASE_URL;
    this.results = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      responseTimes: [],
      errors: [],
    };
  }

  async simulateUser(userId) {
    const startTime = Date.now();
    const userResults = {
      userId,
      requests: 0,
      errors: 0,
      responseTimes: [],
    };

    const endTime = startTime + this.duration * 1000;

    while (Date.now() < endTime) {
      try {
        // Simulate various user actions
        const actions = [
          () => this.fetchPage('/simulator'),
          () => this.fetchPage('/simulator/scenarios'),
          () => this.fetchPage('/simulator/leaderboard'),
          () => this.fetchPage('/simulator/achievements'),
        ];

        const action = actions[Math.floor(Math.random() * actions.length)];
        const response = await action();

        const responseTime = Date.now() - startTime;
        userResults.responseTimes.push(responseTime);
        userResults.requests++;

        this.results.totalRequests++;
        if (response.ok) {
          this.results.successfulRequests++;
        } else {
          this.results.failedRequests++;
          userResults.errors++;
        }

        // Random delay between requests (1-5 seconds)
        await this.sleep(Math.random() * 4000 + 1000);
      } catch (error) {
        this.results.errors.push({
          userId,
          error: error.message,
          timestamp: new Date().toISOString(),
        });
        userResults.errors++;
        this.results.failedRequests++;
      }
    }

    return userResults;
  }

  async fetchPage(path) {
    const startTime = Date.now();
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: 'GET',
      headers: {
        'User-Agent': 'LoadTester/1.0',
      },
    });
    const responseTime = Date.now() - startTime;
    this.results.responseTimes.push(responseTime);
    return response;
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  calculateStats(times) {
    if (times.length === 0) return null;

    const sorted = [...times].sort((a, b) => a - b);
    const sum = sorted.reduce((a, b) => a + b, 0);

    return {
      min: sorted[0],
      max: sorted[sorted.length - 1],
      avg: sum / sorted.length,
      median: sorted[Math.floor(sorted.length / 2)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)],
    };
  }

  async run() {
    console.log(`Starting load test with ${this.concurrentUsers} concurrent users for ${this.duration} seconds...`);
    console.log(`Target: ${this.baseUrl}\n`);

    const startTime = Date.now();
    const userPromises = [];

    // Start all concurrent users
    for (let i = 0; i < this.concurrentUsers; i++) {
      userPromises.push(this.simulateUser(i + 1));
    }

    // Wait for all users to complete
    const userResults = await Promise.all(userPromises);
    const totalTime = (Date.now() - startTime) / 1000;

    // Calculate statistics
    const stats = this.calculateStats(this.results.responseTimes);
    const successRate = (this.results.successfulRequests / this.results.totalRequests) * 100;
    const requestsPerSecond = this.results.totalRequests / totalTime;

    // Print results
    console.log('\n=== Load Test Results ===\n');
    console.log(`Duration: ${totalTime.toFixed(2)} seconds`);
    console.log(`Total Requests: ${this.results.totalRequests}`);
    console.log(`Successful: ${this.results.successfulRequests}`);
    console.log(`Failed: ${this.results.failedRequests}`);
    console.log(`Success Rate: ${successRate.toFixed(2)}%`);
    console.log(`Requests/Second: ${requestsPerSecond.toFixed(2)}`);

    if (stats) {
      console.log('\n=== Response Time Statistics ===');
      console.log(`Min: ${stats.min}ms`);
      console.log(`Max: ${stats.max}ms`);
      console.log(`Average: ${stats.avg.toFixed(2)}ms`);
      console.log(`Median: ${stats.median}ms`);
      console.log(`95th Percentile: ${stats.p95}ms`);
      console.log(`99th Percentile: ${stats.p99}ms`);
    }

    if (this.results.errors.length > 0) {
      console.log(`\n=== Errors (${this.results.errors.length}) ===`);
      this.results.errors.slice(0, 10).forEach(error => {
        console.log(`User ${error.userId}: ${error.error}`);
      });
      if (this.results.errors.length > 10) {
        console.log(`... and ${this.results.errors.length - 10} more errors`);
      }
    }

    // Performance thresholds
    console.log('\n=== Performance Assessment ===');
    if (stats) {
      if (stats.avg < 500) {
        console.log('✅ Average response time: EXCELLENT');
      } else if (stats.avg < 1000) {
        console.log('✅ Average response time: GOOD');
      } else if (stats.avg < 2000) {
        console.log('⚠️  Average response time: ACCEPTABLE');
      } else {
        console.log('❌ Average response time: NEEDS IMPROVEMENT');
      }

      if (stats.p95 < 1000) {
        console.log('✅ 95th percentile: EXCELLENT');
      } else if (stats.p95 < 2000) {
        console.log('✅ 95th percentile: GOOD');
      } else {
        console.log('⚠️  95th percentile: NEEDS IMPROVEMENT');
      }
    }

    if (successRate >= 99) {
      console.log('✅ Success rate: EXCELLENT');
    } else if (successRate >= 95) {
      console.log('✅ Success rate: GOOD');
    } else {
      console.log('❌ Success rate: NEEDS IMPROVEMENT');
    }

    return {
      ...this.results,
      stats,
      successRate,
      requestsPerSecond,
      totalTime,
    };
  }
}

// CLI interface
const args = process.argv.slice(2);
const options = {};

args.forEach((arg, index) => {
  if (arg === '--users' && args[index + 1]) {
    options.users = parseInt(args[index + 1]);
  }
  if (arg === '--duration' && args[index + 1]) {
    options.duration = parseInt(args[index + 1]);
  }
  if (arg === '--url' && args[index + 1]) {
    options.baseUrl = args[index + 1];
  }
});

const tester = new LoadTester(options);
tester.run().catch(console.error);

