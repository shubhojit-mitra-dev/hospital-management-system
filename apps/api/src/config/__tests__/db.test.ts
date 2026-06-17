import { describe, it, expect } from 'vitest';

describe('Database Client Wrapper', () => {
  it('should export a prisma client instance', async () => {
    const { prisma } = await import('../db.js');
    expect(prisma).toBeDefined();
    expect(typeof prisma.$connect).toBe('function');
  });
});
