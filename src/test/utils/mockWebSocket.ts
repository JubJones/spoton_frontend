// Test utility for mocking WebSocket implementations
export class TestWebSocket {
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSING = 2;
  static readonly CLOSED = 3;

  static instances: TestWebSocket[] = [];

  url: string;
  readyState = TestWebSocket.CONNECTING;
  onopen: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  sentMessages: Array<string | ArrayBuffer | Uint8Array> = [];

  constructor(url: string) {
    this.url = url;
    TestWebSocket.instances.push(this);
  }

  static getLastInstance(): TestWebSocket | undefined {
    return TestWebSocket.instances[TestWebSocket.instances.length - 1];
  }

  static reset(): void {
    TestWebSocket.instances = [];
  }

  open() {
    this.readyState = TestWebSocket.OPEN;
    this.onopen?.(new Event('open'));
  }

  close(code = 1000, reason = 'Client closing connection') {
    this.readyState = TestWebSocket.CLOSED;
    this.onclose?.(new CloseEvent('close', { code, reason }));
  }

  send(data: string | ArrayBuffer | Uint8Array) {
    if (this.readyState !== TestWebSocket.OPEN) {
      throw new Error('WebSocket is not open');
    }
    this.sentMessages.push(data);
  }

  simulateMessage(data: string | Uint8Array) {
    if (typeof data === 'string') {
      this.onmessage?.(new MessageEvent('message', { data }));
    } else {
      this.onmessage?.(new MessageEvent('message', { data } as any));
    }
  }

  simulateBinaryMessage(data: ArrayBuffer | Uint8Array) {
    this.onmessage?.(new MessageEvent('message', { data } as any));
  }

  simulateError(message = 'error') {
    this.onerror?.(new Event(message));
  }
}

export const installMockWebSocket = () => {
  const originalWebSocket = globalThis.WebSocket;
  (globalThis as any).WebSocket = TestWebSocket as any;
  return () => {
    (globalThis as any).WebSocket = originalWebSocket;
    TestWebSocket.reset();
  };
};
