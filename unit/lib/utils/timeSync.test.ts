/**
 * Tests for time synchronization utilities
 */

import { checkTimeSynchronization } from '@/lib/utils/datetime';

describe('timeSync utilities', () => {
  describe('checkTimeSynchronization()', () => {
    // Mock fetch for timeSync check
    beforeEach(() => {
      globalThis.fetch = jest.fn();
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should return an object with synced property', async () => {
      (globalThis.fetch as jest.Mock).mockResolvedValueOnce({
        json: async () => ({ server_time: new Date().toISOString() }),
      });

      const result = await checkTimeSynchronization();
      expect(typeof result).toBe('object');
      expect(result).toHaveProperty('synced');
      expect(typeof result.synced).toBe('boolean');
    });

    it('should check time synchronization', async () => {
      (globalThis.fetch as jest.Mock).mockResolvedValueOnce({
        json: async () => ({ server_time: new Date().toISOString() }),
      });

      const result = await checkTimeSynchronization();
      expect(result).toBeDefined();
      expect(result).toHaveProperty('synced');
      expect(typeof result.synced).toBe('boolean');
    });
  });
});
