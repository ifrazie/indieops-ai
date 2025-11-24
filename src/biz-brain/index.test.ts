import { expect, test, describe, beforeEach, vi, afterEach } from 'vitest';
import Service from './index';
import { Env } from './raindrop.gen';

// ============================================================================
// Test Helpers
// ============================================================================

function createMockEnv(aiResponse?: unknown): Env {
  return {
    AI: {
      run: vi.fn().mockResolvedValue(aiResponse || {
        choices: [{
          message: {
            content: 'This is a test AI response'
          }
        }]
      })
    }
  } as unknown as Env;
}

function createRequest(method: string, body?: unknown): Request {
  return new Request('http://localhost/biz-brain', {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined
  });
}

// ============================================================================
// Test Suite
// ============================================================================

describe('BizBrain Service', () => {
  let service: Service;
  let mockEnv: Env;

  beforeEach(() => {
    mockEnv = createMockEnv();
    // Create a mock execution context
    const mockCtx = {} as any;
    service = new Service(mockCtx, mockEnv);
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  // ==========================================================================
  // HTTP Method Validation
  // ==========================================================================

  describe('HTTP Method Validation', () => {
    test('should reject GET requests', async () => {
      const request = createRequest('GET');
      const response = await service.fetch(request);
      
      expect(response.status).toBe(405);
      const body = await response.json() as any;
      expect(body.error).toBe('Only POST requests are allowed');
      expect(body.code).toBe('METHOD_NOT_ALLOWED');
    });

    test('should reject PUT requests', async () => {
      const request = createRequest('PUT', { prompt: 'test' });
      const response = await service.fetch(request);
      
      expect(response.status).toBe(405);
    });

    test('should accept POST requests', async () => {
      const request = createRequest('POST', { prompt: 'test' });
      const response = await service.fetch(request);
      
      expect(response.status).toBe(200);
    });
  });

  // ==========================================================================
  // Input Validation
  // ==========================================================================

  describe('Input Validation', () => {
    test('should reject invalid JSON', async () => {
      const request = new Request('http://localhost/biz-brain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid json{'
      });
      
      const response = await service.fetch(request);
      
      expect(response.status).toBe(400);
      const body = await response.json() as any;
      expect(body.error).toBe('Invalid JSON in request body');
      expect(body.code).toBe('INVALID_JSON');
    });

    test('should reject empty request body', async () => {
      const request = createRequest('POST', {});
      const response = await service.fetch(request);
      
      expect(response.status).toBe(400);
      const body = await response.json() as any;
      expect(body.error).toBe('Request validation failed');
      expect(body.code).toBe('VALIDATION_ERROR');
    });

    test('should reject empty prompt string', async () => {
      const request = createRequest('POST', { prompt: '' });
      const response = await service.fetch(request);
      
      expect(response.status).toBe(400);
      const body = await response.json() as any;
      expect(body.code).toBe('VALIDATION_ERROR');
    });

    test('should reject empty messages array', async () => {
      const request = createRequest('POST', { messages: [] });
      const response = await service.fetch(request);
      
      expect(response.status).toBe(400);
    });

    test('should reject messages with invalid role', async () => {
      const request = createRequest('POST', {
        messages: [{ role: 'invalid', content: 'test' }]
      });
      const response = await service.fetch(request);
      
      expect(response.status).toBe(400);
    });

    test('should reject messages with empty content', async () => {
      const request = createRequest('POST', {
        messages: [{ role: 'user', content: '' }]
      });
      const response = await service.fetch(request);
      
      expect(response.status).toBe(400);
    });
  });

  // ==========================================================================
  // Successful Requests
  // ==========================================================================

  describe('Successful Requests', () => {
    test('should process simple prompt', async () => {
      const request = createRequest('POST', { prompt: 'Hello AI' });
      const response = await service.fetch(request);
      
      expect(response.status).toBe(200);
      const body = await response.json() as any;
      expect(body.response).toBe('This is a test AI response');
      expect(body.model).toBe('gpt-oss-20b');
      expect(body.cached).toBe(false);
      expect(body.processingTimeMs).toBeGreaterThanOrEqual(0);
    });

    test('should process messages array', async () => {
      const request = createRequest('POST', {
        messages: [
          { role: 'system', content: 'You are a helpful assistant' },
          { role: 'user', content: 'Hello' }
        ]
      });
      const response = await service.fetch(request);
      
      expect(response.status).toBe(200);
      const body = await response.json() as any;
      expect(body.response).toBeDefined();
      expect(body.model).toBe('gpt-oss-20b');
    });

    test('should call AI service with correct parameters', async () => {
      const request = createRequest('POST', { prompt: 'Test prompt' });
      await service.fetch(request);
      
      expect(mockEnv.AI.run).toHaveBeenCalledWith(
        'gpt-oss-20b',
        {
          model: 'gpt-oss-20b',
          messages: [{ role: 'user', content: 'Test prompt' }]
        }
      );
    });

    test('should handle useCache parameter', async () => {
      const request = createRequest('POST', { 
        prompt: 'Test', 
        useCache: false 
      });
      const response = await service.fetch(request);
      
      expect(response.status).toBe(200);
    });
  });

  // ==========================================================================
  // AI Service Error Handling
  // ==========================================================================

  describe('AI Service Error Handling', () => {
    test('should handle AI service returning empty response', async () => {
      const emptyEnv = createMockEnv({ choices: [] });
      (service as any).env = emptyEnv;
      const request = createRequest('POST', { prompt: 'test' });
      const response = await service.fetch(request);
      
      expect(response.status).toBe(503);
      const body = await response.json() as any;
      expect(body.error).toBe('AI service temporarily unavailable');
      expect(body.code).toBe('AI_SERVICE_UNAVAILABLE');
    });

    test('should handle AI service returning null content', async () => {
      const nullEnv = createMockEnv({ 
        choices: [{ message: { content: null } }] 
      });
      (service as any).env = nullEnv;
      const request = createRequest('POST', { prompt: 'test' });
      const response = await service.fetch(request);
      
      expect(response.status).toBe(503);
    });

    test('should retry on AI service failure', async () => {
      const failingEnv = {
        AI: {
          run: vi.fn()
            .mockRejectedValueOnce(new Error('Service unavailable'))
            .mockResolvedValueOnce({
              choices: [{ message: { content: 'Success after retry' } }]
            })
        }
      } as unknown as Env;
      (service as any).env = failingEnv;

      const request = createRequest('POST', { prompt: 'test' });
      const response = await service.fetch(request);
      
      expect(response.status).toBe(200);
      expect(failingEnv.AI.run).toHaveBeenCalledTimes(2);
      const body = await response.json() as any;
      expect(body.response).toBe('Success after retry');
    });

    test('should fail after max retries', async () => {
      const alwaysFailingEnv = {
        AI: {
          run: vi.fn().mockRejectedValue(new Error('Service unavailable'))
        }
      } as unknown as Env;
      (service as any).env = alwaysFailingEnv;

      const request = createRequest('POST', { prompt: 'test' });
      const response = await service.fetch(request);
      
      expect(response.status).toBe(503);
      expect(alwaysFailingEnv.AI.run).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });
  });

  // ==========================================================================
  // Response Format
  // ==========================================================================

  describe('Response Format', () => {
    test('should return correct success response structure', async () => {
      const request = createRequest('POST', { prompt: 'test' });
      const response = await service.fetch(request);
      
      const body = await response.json() as any;
      expect(body).toHaveProperty('response');
      expect(body).toHaveProperty('model');
      expect(body).toHaveProperty('cached');
      expect(body).toHaveProperty('processingTimeMs');
      expect(typeof body.response).toBe('string');
      expect(typeof body.model).toBe('string');
      expect(typeof body.cached).toBe('boolean');
      expect(typeof body.processingTimeMs).toBe('number');
    });

    test('should return correct error response structure', async () => {
      const request = createRequest('POST', {});
      const response = await service.fetch(request);
      
      const body = await response.json() as any;
      expect(body).toHaveProperty('error');
      expect(body).toHaveProperty('code');
      expect(typeof body.error).toBe('string');
      expect(typeof body.code).toBe('string');
    });

    test('should include details in error response when available', async () => {
      const request = createRequest('POST', { prompt: '' });
      const response = await service.fetch(request);
      
      const body = await response.json() as any;
      expect(body).toHaveProperty('details');
      expect(typeof body.details).toBe('string');
    });
  });

  // ==========================================================================
  // Edge Cases
  // ==========================================================================

  describe('Edge Cases', () => {
    test('should handle very long prompts', async () => {
      const longPrompt = 'a'.repeat(10000);
      const request = createRequest('POST', { prompt: longPrompt });
      const response = await service.fetch(request);
      
      expect(response.status).toBe(200);
    });

    test('should handle special characters in prompt', async () => {
      const request = createRequest('POST', { 
        prompt: 'Test with special chars: <>&"\'{}[]' 
      });
      const response = await service.fetch(request);
      
      expect(response.status).toBe(200);
    });

    test('should handle unicode characters', async () => {
      const request = createRequest('POST', { 
        prompt: 'Hello 世界 🌍' 
      });
      const response = await service.fetch(request);
      
      expect(response.status).toBe(200);
    });

    test('should handle multiple messages with different roles', async () => {
      const request = createRequest('POST', {
        messages: [
          { role: 'system', content: 'System message' },
          { role: 'user', content: 'User message' },
          { role: 'assistant', content: 'Assistant message' },
          { role: 'user', content: 'Another user message' }
        ]
      });
      const response = await service.fetch(request);
      
      expect(response.status).toBe(200);
    });
  });

  // ==========================================================================
  // Performance & Metrics
  // ==========================================================================

  describe('Performance & Metrics', () => {
    test('should track processing time', async () => {
      const request = createRequest('POST', { prompt: 'test' });
      const response = await service.fetch(request);
      
      const body = await response.json() as any;
      expect(body.processingTimeMs).toBeGreaterThanOrEqual(0);
      expect(body.processingTimeMs).toBeLessThan(5000);
    });

    test('should complete requests in reasonable time', async () => {
      const startTime = Date.now();
      const request = createRequest('POST', { prompt: 'test' });
      await service.fetch(request);
      const duration = Date.now() - startTime;
      
      expect(duration).toBeLessThan(1000); // Should complete in under 1 second
    });
  });
});
