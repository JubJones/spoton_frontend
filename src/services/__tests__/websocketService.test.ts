// WebSocket Service Tests
// src/services/__tests__/websocketService.test.ts

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WebSocketService, WebSocketConnectionState } from '../websocketService';
import { WebSocketMessage, WebSocketTrackingMessagePayload } from '../../types/api';

// Mock WebSocket
class MockWebSocket {
  url: string;
  onopen: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  readyState: number = WebSocket.CONNECTING;

  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSING = 2;
  static readonly CLOSED = 3;

  constructor(url: string) {
    this.url = url;
    // Simulate async connection
    setTimeout(() => {
      this.readyState = WebSocket.OPEN;
      if (this.onopen) {
        this.onopen(new Event('open'));
      }
    }, 10);
  }

  send(data: string | ArrayBuffer | Uint8Array): void {
    if (this.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket is not open');
    }
    // Mock send success
  }

  close(code?: number, reason?: string): void {
    this.readyState = WebSocket.CLOSING;
    setTimeout(() => {
      this.readyState = WebSocket.CLOSED;
      if (this.onclose) {
        this.onclose(new CloseEvent('close', { code: code || 1000, reason: reason || '' }));
      }
    }, 10);
  }

  // Test helper methods
  simulateMessage(data: string | ArrayBuffer | Uint8Array): void {
    if (this.onmessage) {
      this.onmessage(new MessageEvent('message', { data }));
    }
  }

  simulateError(): void {
    if (this.onerror) {
      this.onerror(new Event('error'));
    }
  }

  simulateClose(code: number = 1000, reason: string = ''): void {
    this.readyState = WebSocket.CLOSED;
    if (this.onclose) {
      this.onclose(new CloseEvent('close', { code, reason }));
    }
  }
}

// Replace global WebSocket with mock
global.WebSocket = MockWebSocket as any;

describe('WebSocketService', () => {
  let wsService: WebSocketService;
  let mockWs: MockWebSocket;

  beforeEach(() => {
    wsService = new WebSocketService({
      reconnectDelay: 100,
      maxReconnectAttempts: 3,
      heartbeatInterval: 1000,
      messageQueueSize: 10,
    });
    vi.clearAllTimers();
    vi.useFakeTimers();
  });

  afterEach(() => {
    wsService.disconnect();
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe('Connection Management', () => {
    it('should connect to WebSocket endpoint successfully', async () => {
      const connectPromise = wsService.connect('/tracking/test-task');

      // Advance timers to complete connection
      vi.advanceTimersByTime(20);
      await connectPromise;

      expect(wsService.isConnected()).toBe(true);
      expect(wsService.getConnectionState()).toBe(WebSocketConnectionState.CONNECTED);
    });

    it('should handle WebSocket URL construction', async () => {
      const connectPromise = wsService.connect('ws://localhost:8000/tracking/test-task');

      vi.advanceTimersByTime(20);
      await connectPromise;

      expect(wsService.isConnected()).toBe(true);
    });

    it('should emit connection state changes', async () => {
      const stateChangeHandler = vi.fn();
      wsService.addEventListener('connection-state-changed', stateChangeHandler);

      const connectPromise = wsService.connect('/tracking/test-task');

      // Should emit connecting state
      expect(stateChangeHandler).toHaveBeenCalledWith(WebSocketConnectionState.CONNECTING);

      vi.advanceTimersByTime(20);
      await connectPromise;

      // Should emit connected state
      expect(stateChangeHandler).toHaveBeenCalledWith(WebSocketConnectionState.CONNECTED);
    });

    it('should disconnect successfully', async () => {
      const connectPromise = wsService.connect('/tracking/test-task');
      vi.advanceTimersByTime(20);
      await connectPromise;

      wsService.disconnect();
      vi.advanceTimersByTime(20);

      expect(wsService.isConnected()).toBe(false);
      expect(wsService.getConnectionState()).toBe(WebSocketConnectionState.DISCONNECTED);
    });

    it('should prevent multiple simultaneous connections', async () => {
      const connectPromise1 = wsService.connect('/tracking/test-task');
      vi.advanceTimersByTime(20);
      await connectPromise1;

      // Second connection attempt should not throw but should be ignored
      const connectPromise2 = wsService.connect('/tracking/another-task');
      vi.advanceTimersByTime(20);
      await connectPromise2;

      expect(wsService.isConnected()).toBe(true);
    });
  });

  describe('Message Handling', () => {
    beforeEach(async () => {
      const connectPromise = wsService.connect('/tracking/test-task');
      vi.advanceTimersByTime(20);
      await connectPromise;
      mockWs = (wsService as any).ws;
    });

    it('should handle JSON messages', () => {
      const messageHandler = vi.fn();
      wsService.addEventListener('message-received', messageHandler);

      const testMessage: WebSocketMessage = {
        type: 'tracking_update',
        payload: {
          global_frame_index: 1,
          scene_id: 'factory',
          timestamp_processed_utc: '2024-01-01T00:00:00Z',
          cameras: {},
        } as WebSocketTrackingMessagePayload,
      };

      mockWs.simulateMessage(JSON.stringify(testMessage));

      expect(messageHandler).toHaveBeenCalledWith(testMessage);
    });

    it('should handle tracking update messages', () => {
      const trackingHandler = vi.fn();
      wsService.addEventListener('tracking-update', trackingHandler);

      const trackingPayload: WebSocketTrackingMessagePayload = {
        global_frame_index: 1,
        scene_id: 'factory',
        timestamp_processed_utc: '2024-01-01T00:00:00Z',
        cameras: {
          c09: {
            image_source: 's3://bucket/frame.jpg',
            tracks: [],
          },
        },
      };

      const message: WebSocketMessage = {
        type: 'tracking_update',
        payload: trackingPayload,
      };

      mockWs.simulateMessage(JSON.stringify(message));

      expect(trackingHandler).toHaveBeenCalledWith(trackingPayload);
    });

    it('should handle binary frame data', () => {
      const frameHandler = vi.fn();
      wsService.addEventListener('frame-data', frameHandler);

      const binaryData = new Uint8Array([1, 2, 3, 4, 5]);
      mockWs.simulateMessage(binaryData);

      expect(frameHandler).toHaveBeenCalledWith(binaryData);
    });

    it('should handle invalid JSON gracefully', () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      const messageHandler = vi.fn();
      wsService.addEventListener('message-received', messageHandler);

      mockWs.simulateMessage('invalid json{');

      expect(consoleError).toHaveBeenCalledWith(
        'Failed to parse WebSocket message:',
        expect.any(Error)
      );
      expect(messageHandler).not.toHaveBeenCalled();

      consoleError.mockRestore();
    });

    it('should validate message types', () => {
      const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const messageHandler = vi.fn();
      wsService.addEventListener('message-received', messageHandler);

      const invalidMessage = { type: 'invalid_type', payload: {} };
      mockWs.simulateMessage(JSON.stringify(invalidMessage));

      expect(consoleWarn).toHaveBeenCalledWith('Invalid WebSocket message type:', 'invalid_type');
      expect(messageHandler).not.toHaveBeenCalled();

      consoleWarn.mockRestore();
    });
  });

  describe('Message Sending', () => {
    beforeEach(async () => {
      const connectPromise = wsService.connect('/tracking/test-task');
      vi.advanceTimersByTime(20);
      await connectPromise;
      mockWs = (wsService as any).ws;
    });

    it('should send JSON messages successfully', () => {
      const sendSpy = vi.spyOn(mockWs, 'send');
      const testMessage = { type: 'ping', timestamp: '2024-01-01T00:00:00Z' };

      const result = wsService.send(testMessage);

      expect(result).toBe(true);
      expect(sendSpy).toHaveBeenCalledWith(JSON.stringify(testMessage));
    });

    it('should send binary messages successfully', () => {
      const sendSpy = vi.spyOn(mockWs, 'send');
      const binaryData = new Uint8Array([1, 2, 3, 4, 5]);

      const result = wsService.sendBinary(binaryData);

      expect(result).toBe(true);
      expect(sendSpy).toHaveBeenCalledWith(binaryData);
    });

    it('should queue messages when disconnected', () => {
      wsService.disconnect();
      vi.advanceTimersByTime(20);

      const testMessage = { type: 'ping' };
      const result = wsService.send(testMessage);

      expect(result).toBe(false);

      // Should have queued the message
      const metrics = wsService.getMetrics();
      expect(metrics.queuedMessages).toBe(1);
    });

    it('should flush queued messages on reconnection', async () => {
      // Send message while disconnected
      wsService.disconnect();
      vi.advanceTimersByTime(20);

      const testMessage = { type: 'ping' };
      wsService.send(testMessage);

      // Reconnect and verify message is sent
      const connectPromise = wsService.connect('/tracking/test-task');
      vi.advanceTimersByTime(20);
      await connectPromise;

      const metrics = wsService.getMetrics();
      expect(metrics.queuedMessages).toBe(0);
    });

    it('should handle send errors gracefully', () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      const sendSpy = vi.spyOn(mockWs, 'send').mockImplementation(() => {
        throw new Error('Send failed');
      });

      const result = wsService.send({ type: 'test' });

      expect(result).toBe(false);
      expect(consoleError).toHaveBeenCalledWith(
        'Failed to send WebSocket message:',
        expect.any(Error)
      );

      consoleError.mockRestore();
      sendSpy.mockRestore();
    });
  });

  describe('Reconnection Logic', () => {
    it('should attempt reconnection on unexpected close', async () => {
      const connectPromise = wsService.connect('/tracking/test-task');
      vi.advanceTimersByTime(20);
      await connectPromise;

      const reconnectHandler = vi.fn();
      wsService.addEventListener('reconnect-attempt', reconnectHandler);

      // Simulate unexpected close
      mockWs.simulateClose(1006, 'Connection lost');
      vi.advanceTimersByTime(20);

      // Should attempt reconnection
      vi.advanceTimersByTime(200);
      expect(reconnectHandler).toHaveBeenCalledWith({
        attempt: 1,
        maxAttempts: 3,
      });
    });

    it('should not reconnect on normal close', async () => {
      const connectPromise = wsService.connect('/tracking/test-task');
      vi.advanceTimersByTime(20);
      await connectPromise;

      const reconnectHandler = vi.fn();
      wsService.addEventListener('reconnect-attempt', reconnectHandler);

      // Normal disconnect
      wsService.disconnect();
      vi.advanceTimersByTime(200);

      expect(reconnectHandler).not.toHaveBeenCalled();
    });

    it('should give up after max reconnect attempts', async () => {
      const connectPromise = wsService.connect('/tracking/test-task');
      vi.advanceTimersByTime(20);
      await connectPromise;

      const errorHandler = vi.fn();
      wsService.addEventListener('connection-state-changed', errorHandler);

      // Mock failed connections
      global.WebSocket = vi.fn().mockImplementation(() => {
        throw new Error('Connection failed');
      });

      // Simulate unexpected close to trigger reconnection
      mockWs.simulateClose(1006, 'Connection lost');
      vi.advanceTimersByTime(20);

      // Advance through all reconnection attempts
      for (let i = 0; i < 4; i++) {
        vi.advanceTimersByTime(1000);
      }

      // Should eventually give up and emit error state
      expect(errorHandler).toHaveBeenCalledWith(WebSocketConnectionState.ERROR);
    });

    it('should use exponential backoff for reconnection delays', async () => {
      const wsServiceWithShortDelay = new WebSocketService({
        reconnectDelay: 100,
        maxReconnectAttempts: 3,
      });

      const connectPromise = wsServiceWithShortDelay.connect('/tracking/test-task');
      vi.advanceTimersByTime(20);
      await connectPromise;

      const mockWsShort = (wsServiceWithShortDelay as any).ws;

      // Mock failed connections for reconnection attempts
      global.WebSocket = vi.fn().mockImplementation(() => {
        throw new Error('Connection failed');
      });

      const reconnectHandler = vi.fn();
      wsServiceWithShortDelay.addEventListener('reconnect-attempt', reconnectHandler);

      // Trigger reconnection
      mockWsShort.simulateClose(1006, 'Connection lost');
      vi.advanceTimersByTime(20);

      // First reconnect attempt (after ~100ms)
      vi.advanceTimersByTime(150);
      expect(reconnectHandler).toHaveBeenCalledTimes(1);

      // Second reconnect attempt (after ~200ms with backoff)
      vi.advanceTimersByTime(250);
      expect(reconnectHandler).toHaveBeenCalledTimes(2);

      wsServiceWithShortDelay.disconnect();
    });
  });

  describe('Heartbeat Mechanism', () => {
    beforeEach(async () => {
      const connectPromise = wsService.connect('/tracking/test-task');
      vi.advanceTimersByTime(20);
      await connectPromise;
      mockWs = (wsService as any).ws;
    });

    it('should send heartbeat messages periodically', () => {
      const sendSpy = vi.spyOn(mockWs, 'send');

      // Advance time to trigger heartbeat
      vi.advanceTimersByTime(1100);

      expect(sendSpy).toHaveBeenCalledWith(expect.stringContaining('"type":"heartbeat"'));
    });

    it('should stop heartbeat on disconnect', () => {
      const sendSpy = vi.spyOn(mockWs, 'send');

      wsService.disconnect();
      vi.advanceTimersByTime(20);

      // Clear previous calls
      sendSpy.mockClear();

      // Advance time - should not send heartbeat
      vi.advanceTimersByTime(1100);

      expect(sendSpy).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle WebSocket construction errors', async () => {
      global.WebSocket = vi.fn().mockImplementation(() => {
        throw new Error('WebSocket construction failed');
      });

      await expect(wsService.connect('/tracking/test-task')).rejects.toThrow(
        'WebSocket construction failed'
      );
    });

    it('should emit error events', async () => {
      const connectPromise = wsService.connect('/tracking/test-task');
      vi.advanceTimersByTime(20);
      await connectPromise;

      const errorHandler = vi.fn();
      wsService.addEventListener('error', errorHandler);

      mockWs.simulateError();

      expect(errorHandler).toHaveBeenCalledWith(expect.any(Error));
    });

    it('should track error count in metrics', async () => {
      const connectPromise = wsService.connect('/tracking/test-task');
      vi.advanceTimersByTime(20);
      await connectPromise;

      mockWs.simulateError();

      const metrics = wsService.getMetrics();
      expect(metrics.errorCount).toBe(1);
    });
  });

  describe('Event System', () => {
    it('should add and remove event listeners', () => {
      const handler = vi.fn();

      wsService.addEventListener('connection-state-changed', handler);
      wsService.removeEventListener('connection-state-changed', handler);

      // Should not call handler after removal
      wsService.disconnect();
      expect(handler).not.toHaveBeenCalled();
    });

    it('should remove all listeners', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      wsService.addEventListener('connection-state-changed', handler1);
      wsService.addEventListener('message-received', handler2);

      wsService.removeAllListeners();
      wsService.disconnect();

      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).not.toHaveBeenCalled();
    });

    it('should handle errors in event listeners', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      const faultyHandler = vi.fn().mockImplementation(() => {
        throw new Error('Handler error');
      });

      wsService.addEventListener('connection-state-changed', faultyHandler);

      const connectPromise = wsService.connect('/tracking/test-task');
      vi.advanceTimersByTime(20);
      await connectPromise;

      expect(consoleError).toHaveBeenCalledWith(
        'Error in WebSocket event listener for connection-state-changed:',
        expect.any(Error)
      );

      consoleError.mockRestore();
    });
  });

  describe('Metrics and Configuration', () => {
    it('should track connection metrics', async () => {
      const connectPromise = wsService.connect('/tracking/test-task');
      vi.advanceTimersByTime(20);
      await connectPromise;

      const metrics = wsService.getMetrics();
      expect(metrics.connectionState).toBe(WebSocketConnectionState.CONNECTED);
      expect(metrics.connectionTime).toBeGreaterThan(0);
      expect(metrics.messageCount).toBe(0);
      expect(metrics.errorCount).toBe(0);
    });

    it('should reset metrics', async () => {
      const connectPromise = wsService.connect('/tracking/test-task');
      vi.advanceTimersByTime(20);
      await connectPromise;

      wsService.resetMetrics();

      const metrics = wsService.getMetrics();
      expect(metrics.messageCount).toBe(0);
      expect(metrics.errorCount).toBe(0);
    });

    it('should update configuration', () => {
      const newConfig = { heartbeatInterval: 5000 };
      wsService.updateConfig(newConfig);

      // Configuration should be updated without throwing
      expect(() => wsService.updateConfig(newConfig)).not.toThrow();
    });
  });
});
