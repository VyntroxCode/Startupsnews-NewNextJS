import { NextResponse } from 'next/server';
import { getDbConnection } from '@/shared/database/connection';
import { getRedisClient } from '@/shared/cache/redis.client';

/**
 * GET /api/health
 * Health check endpoint
 */
export async function GET() {
  const health: {
    status: 'healthy' | 'degraded' | 'unhealthy';
    timestamp: string;
    services: {
      database: 'up' | 'down';
      cache: 'up' | 'down' | 'disabled';
    };
  } = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      database: 'down',
      cache: 'down',
    },
  };

  // Check database
  try {
    const conn = await getDbConnection();
    const connection = await conn.getConnection();
    await connection.query('SELECT 1');
    connection.release();
    health.services.database = 'up';
  } catch (error) {
    health.status = 'degraded';
    console.error('Database health check failed:', error);
  }

  // Check Redis cache (optional – no crash when Redis missing)
  try {
    const redis = await getRedisClient();
    if (redis) {
      await redis.ping();
      health.services.cache = 'up';
    } else {
      health.services.cache = 'disabled';
    }
  } catch (error) {
    health.status = health.status === 'degraded' ? 'unhealthy' : 'degraded';
    console.error('Redis health check failed:', error);
  }

  const statusCode = health.status === 'healthy' ? 200 : health.status === 'degraded' ? 200 : 503;

  return NextResponse.json(health, { status: statusCode });
}

