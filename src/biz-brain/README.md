# BizBrain Service

Core AI advisory service for IndieOps AI that provides intelligent business operations assistance through AI-powered document processing, client relationship management, and financial insights.

## Features

### High Priority Improvements ✅

1. **Input Validation with Zod**
   - Strict schema validation for all incoming requests
   - Type-safe request body parsing
   - Detailed validation error messages

2. **Separation of Concerns**
   - Request parsing isolated from business logic
   - AI interaction abstracted into dedicated methods
   - Response formatting centralized

3. **Comprehensive Error Handling**
   - Different HTTP status codes for different error types (400, 405, 503, 504)
   - Custom error classes (ValidationError, TimeoutError, AIServiceError)
   - Detailed error responses with error codes

4. **Structured Logging**
   - JSON-formatted logs for easy parsing
   - Request tracking with unique IDs
   - Performance metrics included

5. **Configuration Management**
   - Centralized CONFIG object for all settings
   - Easy to modify timeouts, retries, and model settings
   - No magic strings scattered throughout code

6. **HTTP Method Validation**
   - Only POST requests accepted
   - Proper 405 Method Not Allowed responses

### Medium Priority Improvements ✅

7. **Proper Type Definitions**
   - Interfaces for all request/response structures
   - Type-safe AI service responses
   - Zod schemas for runtime validation

8. **Retry Logic**
   - Automatic retry on transient failures
   - Configurable retry attempts and delays
   - Exponential backoff for retries

9. **Timeout Handling**
   - 30-second timeout for AI requests
   - Prevents hanging requests
   - Proper timeout error responses

### Low Priority Improvements ✅

10. **Caching Infrastructure**
    - Cache key generation from message content
    - Placeholder for KV cache integration
    - Cache hit/miss tracking in responses

11. **Metrics Tracking**
    - Processing time measurement
    - Request/response logging
    - Performance monitoring ready

12. **Comprehensive Test Suite**
    - 26 test cases covering all scenarios
    - HTTP method validation tests
    - Input validation tests
    - Error handling tests
    - Edge case tests
    - Performance tests

13. **JSDoc Documentation**
    - Detailed service-level documentation
    - Method-level comments
    - Parameter descriptions

## API Reference

### Request Format

#### Simple Prompt
```json
{
  "prompt": "Your question here",
  "useCache": true
}
```

#### Messages Array
```json
{
  "messages": [
    { "role": "system", "content": "You are a helpful assistant" },
    { "role": "user", "content": "Hello" }
  ],
  "useCache": true
}
```

### Response Format

#### Success Response
```json
{
  "response": "AI generated response",
  "model": "gpt-oss-20b",
  "cached": false,
  "processingTimeMs": 1234
}
```

#### Error Response
```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": "Additional error details"
}
```

## Error Codes

| Code | Status | Description |
|------|--------|-------------|
| `METHOD_NOT_ALLOWED` | 405 | Only POST requests are allowed |
| `INVALID_JSON` | 400 | Request body is not valid JSON |
| `VALIDATION_ERROR` | 400 | Request validation failed |
| `AI_SERVICE_UNAVAILABLE` | 503 | AI service temporarily unavailable |
| `TIMEOUT` | 504 | Request timeout |
| `INTERNAL_ERROR` | 500 | Internal server error |

## Configuration

All configuration is centralized in the `CONFIG` object:

```typescript
const CONFIG = {
  AI_MODEL: 'gpt-oss-20b',           // AI model to use
  REQUEST_TIMEOUT_MS: 30000,         // 30 second timeout
  MAX_RETRIES: 2,                    // Retry failed requests twice
  RETRY_DELAY_MS: 1000,              // 1 second base delay
  CACHE_TTL_SECONDS: 3600,           // 1 hour cache TTL
  MAX_CACHE_KEY_LENGTH: 200          // Max cache key length
};
```

## Architecture

### Request Flow

1. **HTTP Method Validation** → Reject non-POST requests
2. **Request Parsing** → Parse and validate JSON body
3. **Schema Validation** → Validate against Zod schema
4. **Message Normalization** → Convert to standard format
5. **Cache Check** → Check for cached response (if enabled)
6. **AI Request** → Execute with retry logic and timeout
7. **Cache Store** → Store successful response (if enabled)
8. **Response** → Return formatted response

### Error Handling Strategy

- **Validation Errors** → 400 Bad Request
- **Method Errors** → 405 Method Not Allowed
- **Timeout Errors** → 504 Gateway Timeout
- **AI Service Errors** → 503 Service Unavailable
- **Unknown Errors** → 500 Internal Server Error

### Retry Strategy

- Initial attempt + 2 retries (3 total attempts)
- Exponential backoff: 1s, 2s delays
- No retry for validation or timeout errors
- Retry only for transient AI service failures

## Testing

Run tests:
```bash
npm test src/biz-brain
```

Test coverage includes:
- HTTP method validation (3 tests)
- Input validation (6 tests)
- Successful requests (4 tests)
- AI service error handling (4 tests)
- Response format validation (3 tests)
- Edge cases (4 tests)
- Performance metrics (2 tests)

## Logging

All logs are structured JSON for easy parsing:

```json
{
  "timestamp": "2025-11-23T15:04:02.487Z",
  "level": "info",
  "service": "biz-brain",
  "message": "Processing AI request",
  "requestId": "req_1763910242487_bdnop16wn",
  "messageCount": 1
}
```

Log levels:
- `info` - Normal operations
- `warn` - Retry attempts
- `error` - Failures and errors

## Future Enhancements

### Caching
Currently, caching infrastructure is in place but not active. To enable:
1. Add KV cache to manifest
2. Update `getCachedResponse()` and `cacheResponse()` methods
3. Bind cache to environment

### Streaming
For long AI responses, consider implementing streaming:
- Use Server-Sent Events (SSE)
- Stream tokens as they're generated
- Improve perceived performance

### Rate Limiting
Add rate limiting to prevent abuse:
- Per-user rate limits
- Global rate limits
- Configurable limits per tier

### Advanced Metrics
Enhance monitoring with:
- Request volume tracking
- Error rate monitoring
- Latency percentiles (p50, p95, p99)
- Model performance metrics

## Best Practices

1. **Always validate input** - Never trust client data
2. **Use structured logging** - Makes debugging easier
3. **Handle errors gracefully** - Provide useful error messages
4. **Track performance** - Monitor processing times
5. **Test thoroughly** - Cover all edge cases
6. **Document everything** - Make code maintainable

## Dependencies

- `@liquidmetal-ai/raindrop-framework` - Core framework
- `zod` - Schema validation
- `vitest` - Testing framework

## License

Part of IndieOps AI application.
