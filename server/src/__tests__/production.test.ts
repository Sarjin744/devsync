import request from 'supertest';
import { createServer, Server as HttpServer } from 'http';
import app from '../app';
import { prisma } from '../config/prisma';

jest.mock('../config/prisma', () => {
  const original = jest.requireActual('../config/prisma');
  return {
    ...original,
    prisma: {
      $queryRaw: jest.fn().mockResolvedValue([{ '?column?': 1 }]),
      $disconnect: jest.fn(),
    },
  };
});

describe('Production Hardening, Security & Deployment Suite (Stage 12)', () => {
  let server: HttpServer;

  beforeAll(async () => {
    server = createServer(app);
    await new Promise<void>((resolve) => server.listen(0, () => resolve()));
  });

  afterAll(async () => {
    if (server) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  describe('Health Check Endpoints (Render & Monitoring)', () => {
    it('GET /health should return 200 OK with status "ok" and database connected', async () => {
      const res = await request(app).get('/health');

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(res.body.service).toBe('devsync-api');
      expect(res.body.database).toBe('connected');
      expect(res.body.timestamp).toBeDefined();
      expect(res.body.uptime).toBeGreaterThanOrEqual(0);
    });

    it('GET /api/health should also respond as a valid health probe', async () => {
      const res = await request(app).get('/api/health');

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
    });

    it('GET /health should report degraded when database connectivity fails', async () => {
      (prisma.$queryRaw as jest.Mock).mockRejectedValueOnce(new Error('DB Connection Timeout'));

      const res = await request(app).get('/health');

      expect(res.status).toBe(503);
      expect(res.body.status).toBe('degraded');
      expect(res.body.database).toBe('disconnected');
    });
  });

  describe('Request Correlation & ID Tracking', () => {
    it('should assign a new X-Request-Id header when none is provided', async () => {
      const res = await request(app).get('/health');

      expect(res.headers['x-request-id']).toBeDefined();
      expect(typeof res.headers['x-request-id']).toBe('string');
      expect(res.headers['x-request-id'].length).toBeGreaterThan(10);
    });

    it('should preserve and echo back incoming X-Request-Id from upstream proxies/clients', async () => {
      const customId = 'render-req-trace-987654321';
      const res = await request(app).get('/health').set('X-Request-Id', customId);

      expect(res.headers['x-request-id']).toBe(customId);
    });
  });

  describe('HTTP Security Headers (Helmet)', () => {
    it('should include critical security headers on all responses', async () => {
      const res = await request(app).get('/health');

      // Frameguard
      expect(res.headers['x-frame-options']).toBe('DENY');
      // MIME sniffing protection
      expect(res.headers['x-content-type-options']).toBe('nosniff');
      // Cross-origin resource policy
      expect(res.headers['cross-origin-resource-policy']).toBe('cross-origin');
    });
  });

  describe('Centralized 404 & Error Handling', () => {
    it('should return structured 404 JSON for nonexistent routes', async () => {
      const res = await request(app).get('/api/nonexistent-route-xyz');

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('Route not found');
      expect(res.body.code).toBe('NOT_FOUND');
    });
  });
});
