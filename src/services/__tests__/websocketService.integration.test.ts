// src/services/__tests__/websocketService.integration.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WebSocketService } from '../websocketService';
import { installMockWebSocket, TestWebSocket } from '../../test/utils/mockWebSocket';

const connect = async (service: WebSocketService) => {
  const promise = service.connect('/ws/tracking/test');
  const socket = TestWebSocket.getLastInstance();
  if (!socket) {
    throw new Error('Mock socket missing');
  }
  socket.open();
  await promise;
  return socket;
};

describe('WebSocketService integration', () => {
  let restoreWebSocket: () => void;

  beforeEach(() => {
    vi.useFakeTimers();
    restoreWebSocket = installMockWebSocket();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    restoreWebSocket();
    TestWebSocket.reset();
  });

  it('rejects the connection promise when the socket errors before opening', async () => {
    const service = new WebSocketService();
    const connectPromise = service.connect('/ws/tracking/error');
    const socket = TestWebSocket.getLastInstance();
    if (!socket) {
      throw new Error('Mock socket missing');
    }

    socket.simulateError('error');

    await expect(connectPromise).rejects.toThrow('WebSocket error: error');
    expect(service.isConnected()).toBe(false);
  });

  it('reconnects and flushes queued messages after a disconnect', async () => {
    const service = new WebSocketService({ reconnectDelay: 50, maxReconnectAttempts: 2 });
    const firstSocket = await connect(service);

    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0);
    firstSocket.close(1006, 'network lost');

    // Queue message after disconnect
    service.send({ type: 'queued-message' });

    vi.runAllTimers();

    const reconnectingSocket = TestWebSocket.getLastInstance();
    expect(reconnectingSocket).not.toBe(firstSocket);
    const sendSpy = vi.spyOn(reconnectingSocket!, 'send');
    reconnectingSocket!.open();

    expect(sendSpy).toHaveBeenCalledWith(JSON.stringify({ type: 'queued-message' }));
    sendSpy.mockRestore();
    randomSpy.mockRestore();
  });
});
