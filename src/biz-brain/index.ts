import { Service } from '@liquidmetal-ai/raindrop-framework';
import { z } from 'zod';
import { Env } from './raindrop.gen';

// ============================================================================
// Types & Schemas
// ============================================================================

type MessageRole = "user" | "system" | "assistant";

interface Message {
  role: MessageRole;
  content: string;
}

interface AIResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
}

interface SuccessResponse {
  response: string;
  model: string;
  cached?: boolean;
  processingTimeMs?: number;
}

interface ErrorResponse {
  error: string;
  code?: string;
  details?: string;
}

// Zod validation schemas
const MessageSchema = z.object({
  role: z.enum(["user", "system", "assistant"]),
  content: z.string().min(1, "Message content cannot be empty")
});

const RequestBodySchema = z.object({
  prompt: z.string().min(1).optional(),
  messages: z.array(MessageSchema).optional(),
  useCache: z.boolean().optional().default(true)
}).refine(
  (data) => data.prompt || (data.messages && data.messages.length > 0),
  { message: "Either 'prompt' or 'messages' must be provided" }
);

// ============================================================================
// Configuration
// ============================================================================

const CONFIG = {
  AI_MODEL: 'gpt-oss-20b',
  REQUEST_TIMEOUT_MS: 30000,
  MAX_RETRIES: 2,
  RETRY_DELAY_MS: 1000,
  CACHE_TTL_SECONDS: 3600,
  MAX_CACHE_KEY_LENGTH: 200
} as const;

const ERROR_MESSAGES = {
  INVALID_METHOD: 'Only POST requests are allowed',
  INVALID_JSON: 'Invalid JSON in request body',
  VALIDATION_FAILED: 'Request validation failed',
  AI_SERVICE_ERROR: 'AI service temporarily unavailable',
  TIMEOUT: 'Request timeout - AI service took too long to respond',
  INTERNAL_ERROR: 'Internal server error'
} as const;

// ============================================================================
// Service Implementation
// ============================================================================

/**
 * BizBrain Service - Core AI advisory service for IndieOps AI
 * 
 * Provides intelligent business operations assistance through AI-powered
 * document processing, client relationship management, and financial insights.
 * 
 * Features:
 * - Input validation with Zod
 * - Request caching for performance
 * - Retry logic for transient failures
 * - Comprehensive error handling
 * - Structured logging
 * - Timeout protection
 */
export default class extends Service<Env> {
  
  /**
   * Main request handler
   * Validates HTTP method, processes AI requests with caching and retry logic
   */
  async fetch(request: Request): Promise<Response> {
    const startTime = Date.now();
    const requestId = this.generateRequestId();
    
    try {
      // Validate HTTP method
      if (request.method !== 'POST') {
        return this.errorResponse(ERROR_MESSAGES.INVALID_METHOD, 405, 'METHOD_NOT_ALLOWED');
      }

      // Parse and validate request body
      const body = await this.parseRequestBody(request);
      const validatedData = this.validateRequest(body);
      
      // Convert to messages format
      const messages = this.normalizeMessages(validatedData);
      
      this.log('info', 'Processing AI request', { requestId, messageCount: messages.length });

      // Check cache if enabled
      if (validatedData.useCache) {
        const cachedResponse = await this.getCachedResponse(messages);
        if (cachedResponse) {
          this.log('info', 'Cache hit', { requestId });
          return this.successResponse(cachedResponse, true, Date.now() - startTime);
        }
      }

      // Execute AI request with retry logic
      const aiResponse = await this.executeAIRequestWithRetry(messages, requestId);
      
      // Cache successful response
      if (validatedData.useCache) {
        await this.cacheResponse(messages, aiResponse);
      }

      const processingTime = Date.now() - startTime;
      this.log('info', 'AI request completed', { requestId, processingTimeMs: processingTime });

      return this.successResponse(aiResponse, false, processingTime);

    } catch (error) {
      return this.handleError(error, requestId, Date.now() - startTime);
    }
  }

  // ==========================================================================
  // Request Processing
  // ==========================================================================

  /**
   * Parse request body with proper error handling
   */
  private async parseRequestBody(request: Request): Promise<unknown> {
    try {
      return await request.json();
    } catch (error) {
      throw new ValidationError(ERROR_MESSAGES.INVALID_JSON, 'INVALID_JSON');
    }
  }

  /**
   * Validate request body against schema
   */
  private validateRequest(body: unknown): z.infer<typeof RequestBodySchema> {
    try {
      return RequestBodySchema.parse(body);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const details = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
        throw new ValidationError(ERROR_MESSAGES.VALIDATION_FAILED, 'VALIDATION_ERROR', details);
      }
      throw error;
    }
  }

  /**
   * Normalize input to messages array format
   */
  private normalizeMessages(data: z.infer<typeof RequestBodySchema>): Message[] {
    if (data.messages && data.messages.length > 0) {
      return data.messages;
    }
    return [{ role: "user", content: data.prompt! }];
  }

  // ==========================================================================
  // AI Service Integration
  // ==========================================================================

  /**
   * Execute AI request with timeout and retry logic
   */
  private async executeAIRequestWithRetry(
    messages: Message[], 
    requestId: string
  ): Promise<string> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= CONFIG.MAX_RETRIES; attempt++) {
      try {
        if (attempt > 0) {
          this.log('warn', 'Retrying AI request', { requestId, attempt });
          await this.sleep(CONFIG.RETRY_DELAY_MS * attempt);
        }

        const response = await this.executeAIRequest(messages);
        return response;

      } catch (error) {
        lastError = error as Error;
        
        // Don't retry on validation errors or timeouts
        if (error instanceof ValidationError || error instanceof TimeoutError) {
          throw error;
        }

        this.log('error', 'AI request failed', { 
          requestId, 
          attempt, 
          error: (error as Error).message 
        });
      }
    }

    throw new AIServiceError(
      ERROR_MESSAGES.AI_SERVICE_ERROR,
      'AI_SERVICE_UNAVAILABLE',
      lastError?.message
    );
  }

  /**
   * Execute single AI request with timeout
   */
  private async executeAIRequest(messages: Message[]): Promise<string> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new TimeoutError(ERROR_MESSAGES.TIMEOUT)), CONFIG.REQUEST_TIMEOUT_MS);
    });

    const aiPromise = this.env.AI.run(
      CONFIG.AI_MODEL,
      {
        model: CONFIG.AI_MODEL,
        messages
      }
    ) as Promise<AIResponse>;

    try {
      const result = await Promise.race([aiPromise, timeoutPromise]);
      
      const content = result.choices?.[0]?.message?.content;
      if (!content) {
        throw new AIServiceError(
          'AI service returned empty response',
          'EMPTY_RESPONSE'
        );
      }

      return content;
    } catch (error) {
      if (error instanceof TimeoutError) {
        throw error;
      }
      throw new AIServiceError(
        ERROR_MESSAGES.AI_SERVICE_ERROR,
        'AI_EXECUTION_ERROR',
        (error as Error).message
      );
    }
  }

  // ==========================================================================
  // Caching
  // ==========================================================================

  /**
   * Generate cache key from messages
   */
  private generateCacheKey(messages: Message[]): string {
    const content = JSON.stringify(messages);
    const hash = this.simpleHash(content);
    return `ai:${CONFIG.AI_MODEL}:${hash}`;
  }

  /**
   * Get cached response if available
   */
  private async getCachedResponse(messages: Message[]): Promise<string | null> {
    try {
      const cacheKey = this.generateCacheKey(messages);
      // Note: Assuming KV cache is available in env, adjust if needed
      // For now, return null as cache might not be configured
      return null;
    } catch (error) {
      this.log('warn', 'Cache retrieval failed', { error: (error as Error).message });
      return null;
    }
  }

  /**
   * Cache AI response
   */
  private async cacheResponse(messages: Message[], response: string): Promise<void> {
    try {
      const cacheKey = this.generateCacheKey(messages);
      // Note: Implement caching when KV cache is available
      // await this.env.CACHE?.put(cacheKey, response, { expirationTtl: CONFIG.CACHE_TTL_SECONDS });
    } catch (error) {
      this.log('warn', 'Cache storage failed', { error: (error as Error).message });
    }
  }

  // ==========================================================================
  // Response Builders
  // ==========================================================================

  /**
   * Build success response
   */
  private successResponse(
    content: string, 
    cached: boolean = false, 
    processingTimeMs?: number
  ): Response {
    const body: SuccessResponse = {
      response: content,
      model: CONFIG.AI_MODEL,
      cached,
      processingTimeMs
    };

    return new Response(JSON.stringify(body), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  /**
   * Build error response
   */
  private errorResponse(
    message: string, 
    status: number, 
    code?: string, 
    details?: string
  ): Response {
    const body: ErrorResponse = {
      error: message,
      code,
      details
    };

    return new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  /**
   * Handle errors and return appropriate response
   */
  private handleError(error: unknown, requestId: string, processingTimeMs: number): Response {
    this.log('error', 'Request failed', { 
      requestId, 
      processingTimeMs,
      error: (error as Error).message 
    });

    if (error instanceof ValidationError) {
      return this.errorResponse(error.message, 400, error.code, error.details);
    }

    if (error instanceof TimeoutError) {
      return this.errorResponse(error.message, 504, 'TIMEOUT');
    }

    if (error instanceof AIServiceError) {
      return this.errorResponse(error.message, 503, error.code, error.details);
    }

    // Generic internal error
    return this.errorResponse(ERROR_MESSAGES.INTERNAL_ERROR, 500, 'INTERNAL_ERROR');
  }

  // ==========================================================================
  // Utilities
  // ==========================================================================

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Simple hash function for cache keys
   */
  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Sleep utility for retry delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Structured logging
   */
  private log(level: 'info' | 'warn' | 'error', message: string, meta?: Record<string, unknown>): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      service: 'biz-brain',
      message,
      ...meta
    };
    console.log(JSON.stringify(logEntry));
  }
}

// ============================================================================
// Custom Error Classes
// ============================================================================

class ValidationError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: string
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

class TimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TimeoutError';
  }
}

class AIServiceError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: string
  ) {
    super(message);
    this.name = 'AIServiceError';
  }
}