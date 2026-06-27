import { describe, it, expect, vi, beforeEach } from 'vitest';
import { notificationService } from './notificationService';

describe('notificationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('queues concurrent confirm calls and resolves in order', async () => {
    const received: Array<boolean | null> = [];
    notificationService._subscribeToConfirm((options) => {
      received.push(options ? true : null);
    });

    const first = notificationService.confirm({
      title: 'First',
      message: 'First message',
    });
    const second = notificationService.confirm({
      title: 'Second',
      message: 'Second message',
    });

    expect(received).toEqual([true]);

    notificationService._resolveConfirm(true);
    await expect(first).resolves.toBe(true);

    expect(received).toEqual([true, null, true]);

    notificationService._resolveConfirm(false);
    await expect(second).resolves.toBe(false);
  });
});