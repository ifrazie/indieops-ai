/**
 * Mock implementations of Raindrop resources for testing
 */

import { vi } from 'vitest';

/**
 * Creates a mock SmartBucket with in-memory storage
 */
export function createMockSmartBucket() {
  const storage = new Map<string, any>();
  
  return {
    put: vi.fn(async (key: string, value: any, options?: any) => {
      storage.set(key, value);
      return {
        key,
        version: 'mock-version',
        size: JSON.stringify(value).length,
        etag: 'mock-etag',
        httpEtag: 'mock-http-etag',
        checksums: {},
        uploaded: new Date(),
      };
    }),
    
    get: vi.fn(async (key: string) => {
      const value = storage.get(key);
      if (!value) return null;
      
      return {
        key,
        body: new ReadableStream(),
        text: async () => JSON.stringify(value),
        json: async () => value,
        arrayBuffer: async () => new ArrayBuffer(0),
        blob: async () => new Blob([JSON.stringify(value)]),
      };
    }),
    
    search: vi.fn(async (params: any) => ({
      results: [
        {
          text: 'Mock search result',
          source: 'mock-doc.pdf',
          score: 0.95,
        },
      ],
      pagination: {
        total: 1,
        page: 1,
        pageSize: 15,
        totalPages: 1,
        hasMore: false,
      },
    })),
    
    chunkSearch: vi.fn(async (params: any) => ({
      results: [
        {
          text: 'Mock chunk content',
          source: 'mock-doc.pdf',
          score: 0.92,
        },
      ],
    })),
    
    documentChat: vi.fn(async (params: any) => ({
      answer: 'Mock AI answer to: ' + params.input,
    })),
    
    getPaginatedResults: vi.fn(async ({ requestId, page, pageSize }: any) => ({
      results: [
        {
          text: 'Paginated result',
          source: 'mock-doc.pdf',
          score: 0.9,
        },
      ],
      pagination: {
        total: 50,
        page: page || 1,
        pageSize: pageSize || 15,
        totalPages: 4,
        hasMore: page < 4,
      },
    })),
    
    head: vi.fn(async (key: string) => {
      if (!storage.has(key)) return null;
      return {
        key,
        version: 'mock-version',
        size: 1024,
        etag: 'mock-etag',
        httpEtag: 'mock-http-etag',
        checksums: {},
        uploaded: new Date(),
      };
    }),
    
    list: vi.fn(async () => ({
      objects: [],
      delimitedPrefixes: [],
      truncated: false,
    })),
    
    delete: vi.fn(async () => undefined),
  };
}

/**
 * Creates a mock SmartMemory with in-memory storage
 */
export function createMockSmartMemory() {
  const memories = new Map<string, any>();
  
  return {
    store: vi.fn(async (key: string, value: any) => {
      memories.set(key, value);
      return { success: true };
    }),
    
    retrieve: vi.fn(async (key: string) => {
      return memories.get(key) || null;
    }),
    
    search: vi.fn(async (query: string) => {
      return Array.from(memories.entries()).map(([key, value]) => ({
        key,
        value,
        score: 0.8,
      }));
    }),
  };
}

/**
 * Creates a mock SmartSQL database
 */
export function createMockSmartSQL() {
  const tables = new Map<string, any[]>();
  
  return {
    prepare: vi.fn((query: string) => ({
      bind: vi.fn((...params: any[]) => ({
        all: vi.fn(async () => ({ results: [] })),
        first: vi.fn(async () => null),
        run: vi.fn(async () => ({ success: true })),
      })),
    })),
  };
}

/**
 * Creates a mock Queue
 */
export function createMockQueue() {
  const messages: any[] = [];
  
  return {
    send: vi.fn(async (message: any) => {
      messages.push(message);
      return { success: true };
    }),
    
    sendBatch: vi.fn(async (batch: any[]) => {
      messages.push(...batch);
      return { success: true };
    }),
    
    // Helper to inspect queued messages in tests
    _getMessages: () => messages,
    _clear: () => messages.splice(0, messages.length),
  };
}

/**
 * Creates a mock AI binding
 */
export function createMockAI(response?: string) {
  return {
    run: vi.fn(async (model: string, options: any) => ({
      choices: [
        {
          message: {
            content: response || 'Mock AI response',
          },
        },
      ],
    })),
  };
}
