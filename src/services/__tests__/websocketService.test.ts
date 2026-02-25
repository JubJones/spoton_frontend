// src/services/__tests__/websocketService.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WebSocketService, WebSocketConnectionState } from '../websocketService';
import { installMockWebSocket, TestWebSocket } from '../../test/utils/mockWebSocket';

const connectService = async (service: WebSocketService) => {
  const connectPromise = service.connect('/ws/tracking/test');
  const socket = TestWebSocket.getLastInstance();
  if (!socket) {
    throw new Error('Mock WebSocket was not created');
  }
  socket.open();
  await connectPromise;
  return { service, socket };
};

describe('WebSocketService', () => {
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

  it('connects and emits connection events', async () => {
    const service = new WebSocketService();
    const stateHandler = vi.fn();
    service.addEventListener('connection-state-changed', stateHandler);

    await connectService(service);

    expect(service.isConnected()).toBe(true);
    expect(stateHandler).toHaveBeenCalledWith(WebSocketConnectionState.CONNECTING);
    expect(stateHandler).toHaveBeenCalledWith(WebSocketConnectionState.CONNECTED);
  });

  it('disconnects and clears queued messages', async () => {
    const service = new WebSocketService();
    await connectService(service);

    const socket = TestWebSocket.getLastInstance()!;
    service.send({ type: 'ping' });
    expect(socket.sentMessages).toHaveLength(1);

    service.disconnect();
    socket.close();

    expect(service.isConnected()).toBe(false);
    expect(service.getConnectionState()).toBe(WebSocketConnectionState.CLOSED);
  });

  it('queues messages while disconnected and flushes on connect', async () => {
    const service = new WebSocketService({ messageQueueSize: 5 });

    service.send({ type: 'queued' });
    service.send({ type: 'queued-2' });

    const { socket } = await connectService(service);

    expect(socket.sentMessages).toContainEqual(JSON.stringify({ type: 'queued' }));
    expect(socket.sentMessages).toContainEqual(JSON.stringify({ type: 'queued-2' }));
  });

  it('dispatches parsed tracking messages', async () => {
    const service = new WebSocketService();
    const trackingHandler = vi.fn();
    const messageHandler = vi.fn();
    service.addEventListener('tracking-update', trackingHandler);
    service.addEventListener('message-received', messageHandler);

    const { socket } = await connectService(service);

    const payload = {
      type: 'tracking_update',
      payload: {
        global_frame_index: 1,
        scene_id: 'factory',
        timestamp_processed_utc: '2024-01-01T00:00:00Z',
        cameras: {},
        person_count_per_camera: {},
        focus_person_id: null,
      },
    };

    socket.simulateMessage(JSON.stringify(payload));

    expect(messageHandler).toHaveBeenCalledWith(payload);
    expect(trackingHandler).toHaveBeenCalledWith(payload.payload);
  });

  it('emits binary frame events', async () => {
    const service = new WebSocketService();
    const frameHandler = vi.fn();
    service.addEventListener('frame-data', frameHandler);

    const { socket } = await connectService(service);
    const binary = new Uint8Array([1, 2, 3]);

    socket.simulateBinaryMessage(binary);

    expect(frameHandler).toHaveBeenCalledWith(binary);
  });

  it('attempts reconnection on abnormal close', async () => {
    const service = new WebSocketService({ reconnectDelay: 100, maxReconnectAttempts: 1 });
    const reconnectHandler = vi.fn();
    service.addEventListener('reconnect-attempt', reconnectHandler);

    const { socket } = await connectService(service);

    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0);

    socket.close(1006, 'Connection lost');
    vi.runAllTimers();

    expect(reconnectHandler).toHaveBeenCalledWith({ attempt: 1, maxAttempts: 1 });
    randomSpy.mockRestore();
  });

  it('propagates send errors when socket is closed', async () => {
    const service = new WebSocketService();
    await connectService(service);

    const socket = TestWebSocket.getLastInstance()!;
    socket.close();

    const sendResult = service.send({ type: 'test' });
    expect(sendResult).toBe(false);
  });
});
