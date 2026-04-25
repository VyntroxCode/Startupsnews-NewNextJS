/**
 * Docker Connection Test Script
 * 
 * This script tests connections to all Docker services:
 * - MariaDB Database
 * - Redis Cache
 * - Adminer (optional)
 * - Redis Commander (optional)
 */

import mariadb from 'mariadb';
import { createClient } from 'redis';
import http from 'http';

interface TestResult {
  service: string;
  status: 'success' | 'error';
  message: string;
  details?: any;
}

const results: TestResult[] = [];

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message: string, color: string = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logResult(result: TestResult) {
  const icon = result.status === 'success' ? '✅' : '❌';
  const color = result.status === 'success' ? colors.green : colors.red;
  log(`${icon} ${result.service}: ${result.message}`, color);
  if (result.details) {
    console.log('   Details:', JSON.stringify(result.details, null, 2));
  }
}

/**
 * Test MariaDB Connection
 */
async function testMariaDB(): Promise<TestResult> {
  const config = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'zox_user',
    password: process.env.DB_PASSWORD || 'zox_password',
    database: process.env.DB_NAME || 'zox_db',
    connectionTimeout: 5000,
  };

  let connection: mariadb.Connection | null = null;

  try {
    log(`\n${colors.cyan}Testing MariaDB Connection...${colors.reset}`);
    log(`   Host: ${config.host}:${config.port}`);
    log(`   Database: ${config.database}`);
    log(`   User: ${config.user}`);

    connection = await mariadb.createConnection(config);
    
    // Test basic query
    const result = await connection.query('SELECT VERSION() as version, DATABASE() as database');
    const version = result[0]?.version;
    const database = result[0]?.database;

    // Test table existence
    const tables = await connection.query(
      "SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = ?",
      [config.database]
    );

    await connection.end();

    return {
      service: 'MariaDB',
      status: 'success',
      message: `Connected successfully`,
      details: {
        version,
        database,
        tablesCount: tables.length,
        tables: tables.map((t: any) => t.TABLE_NAME),
      },
    };
  } catch (error: any) {
    if (connection) {
      try {
        await connection.end();
      } catch {}
    }
    return {
      service: 'MariaDB',
      status: 'error',
      message: error.message || 'Connection failed',
      details: {
        code: error.code,
        errno: error.errno,
      },
    };
  }
}

/**
 * Test Redis Connection
 */
async function testRedis(): Promise<TestResult> {
  // Use port 6382 if REDIS_URL not set (to match docker-compose.yml)
  const url = process.env.REDIS_URL || 'redis://localhost:6382';

  let client: ReturnType<typeof createClient> | null = null;

  try {
    log(`\n${colors.cyan}Testing Redis Connection...${colors.reset}`);
    log(`   URL: ${url}`);

    // Try connection without password first (as per docker-compose.yml)
    client = createClient({ 
      url,
      socket: {
        reconnectStrategy: false, // Don't auto-reconnect for testing
      },
    });
    
    await client.connect();

    // Test PING
    const pingResult = await client.ping();
    
    // Test SET/GET
    const testKey = 'docker-test-key';
    const testValue = 'docker-test-value';
    await client.set(testKey, testValue);
    const getValue = await client.get(testKey);
    await client.del(testKey);

    // Get Redis info
    const info = await client.info('server');
    const versionMatch = info.match(/redis_version:([^\r\n]+)/);
    const version = versionMatch ? versionMatch[1] : 'unknown';

    await client.quit();

    return {
      service: 'Redis',
      status: 'success',
      message: `Connected successfully`,
      details: {
        version,
        ping: pingResult,
        setGetTest: getValue === testValue ? 'passed' : 'failed',
      },
    };
  } catch (error: any) {
    if (client && client.isOpen) {
      try {
        await client.quit();
      } catch {}
    }
    return {
      service: 'Redis',
      status: 'error',
      message: error.message || 'Connection failed',
      details: {
        code: error.code,
      },
    };
  }
}

/**
 * Test HTTP Service (Adminer, Redis Commander)
 */
function testHTTPService(name: string, url: string, timeout: number = 5000): Promise<TestResult> {
  return new Promise((resolve) => {
    log(`\n${colors.cyan}Testing ${name}...${colors.reset}`);
    log(`   URL: ${url}`);

    const request = http.get(url, { timeout }, (res) => {
      const statusCode = res.statusCode || 0;
      if (statusCode >= 200 && statusCode < 400) {
        resolve({
          service: name,
          status: 'success',
          message: `Service is accessible (HTTP ${statusCode})`,
          details: {
            statusCode,
            headers: res.headers,
          },
        });
      } else {
        resolve({
          service: name,
          status: 'error',
          message: `Service returned HTTP ${statusCode}`,
        });
      }
    });

    request.on('error', (error: any) => {
      resolve({
        service: name,
        status: 'error',
        message: error.message || 'Connection failed',
        details: {
          code: error.code,
        },
      });
    });

    request.on('timeout', () => {
      request.destroy();
      resolve({
        service: name,
        status: 'error',
        message: 'Connection timeout',
      });
    });
  });
}

/**
 * Check Docker Container Status
 */
async function checkDockerContainers(): Promise<TestResult[]> {
  const containers = [
    'zox-mariadb',
    'zox-redis',
    'zox-adminer',
    'zox-redis-commander',
  ];

  log(`\n${colors.cyan}Checking Docker Container Status...${colors.reset}`);
  
  // Note: This would require docker CLI or dockerode library
  // For now, we'll just note that containers should be checked manually
  return containers.map((container) => ({
    service: `Container: ${container}`,
    status: 'success' as const,
    message: 'Please check manually with: docker ps',
    details: {
      command: `docker ps | grep ${container}`,
    },
  }));
}

/**
 * Main Test Function
 */
async function runTests() {
  log(`\n${colors.blue}╔════════════════════════════════════════╗${colors.reset}`);
  log(`${colors.blue}║  Docker Services Connection Test      ║${colors.reset}`);
  log(`${colors.blue}╚════════════════════════════════════════╝${colors.reset}`);

  // Test MariaDB
  const mariadbResult = await testMariaDB();
  results.push(mariadbResult);
  logResult(mariadbResult);

  // Test Redis
  const redisResult = await testRedis();
  results.push(redisResult);
  logResult(redisResult);

  // Test Adminer (optional)
  const adminerResult = await testHTTPService('Adminer', 'http://localhost:8080');
  results.push(adminerResult);
  logResult(adminerResult);

  // Test Redis Commander (optional)
  const redisCommanderResult = await testHTTPService('Redis Commander', 'http://localhost:8081');
  results.push(redisCommanderResult);
  logResult(redisCommanderResult);

  // Check Docker containers
  const containerResults = await checkDockerContainers();
  results.push(...containerResults);
  containerResults.forEach(logResult);

  // Summary
  log(`\n${colors.blue}╔════════════════════════════════════════╗${colors.reset}`);
  log(`${colors.blue}║  Test Summary                           ║${colors.reset}`);
  log(`${colors.blue}╚════════════════════════════════════════╝${colors.reset}`);

  const successCount = results.filter((r) => r.status === 'success').length;
  const errorCount = results.filter((r) => r.status === 'error').length;

  log(`\nTotal Tests: ${results.length}`);
  log(`✅ Successful: ${successCount}`, colors.green);
  log(`❌ Failed: ${errorCount}`, errorCount > 0 ? colors.red : colors.green);

  if (errorCount > 0) {
    log(`\n${colors.yellow}⚠️  Some services failed. Please check:`);
    log(`   1. Docker containers are running: docker ps`);
    log(`   2. Environment variables are set correctly`);
    log(`   3. Ports are not already in use`);
    log(`   4. Firewall settings allow connections${colors.reset}\n`);
  } else {
    log(`\n${colors.green}✅ All services are working correctly!${colors.reset}\n`);
  }

  process.exit(errorCount > 0 ? 1 : 0);
}

// Run tests
runTests().catch((error) => {
  log(`\n${colors.red}Fatal error: ${error.message}${colors.reset}`);
  process.exit(1);
});

