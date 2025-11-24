# Testing Guide for IndieOps AI

## Overview

Since Raindrop is a serverless platform, true local execution isn't possible. However, you can thoroughly test your application before deployment using these approaches.

## Testing Strategy

### 1. Unit Tests (Primary Method)

Run unit tests locally with mocked Raindrop resources:

```bash
# Run all tests once
npm test

# Watch mode for development
npm run test:watch
```

**What to test:**
- Business logic
- Input validation
- Error handling
- Edge cases
- Response formatting

**Example:** See `src/biz-brain/index.test.ts` for a comprehensive test suite.

### 2. Integration Tests

Test multiple services working together using mock implementations:

```bash
# Run specific test file
npm test src/_test/integration.example.test.ts
```

**What to test:**
- Service interactions
- Data flow between components
- Queue message handling
- Resource coordination

**Mock utilities:** Use `src/_test/mocks.ts` for realistic resource mocks.

### 3. Validation Before Deploy

Always validate your manifest before deploying:

```bash
# Validate manifest syntax and structure
raindrop build validate

# Generate types to catch binding errors
raindrop build generate
```

### 4. Deploy to Development Environment

The safest way to test the full system:

```bash
# Deploy and start
npm run start

# View logs in real-time
raindrop logs tail

# Check deployment status
raindrop build status
```

**Testing in production:**
- Use test data that's clearly marked
- Test with small payloads first
- Monitor logs for errors
- Use `requestId` for tracing

### 5. Incremental Testing

Test changes incrementally:

1. Write unit tests for new functionality
2. Run tests locally: `npm test`
3. Validate manifest: `raindrop build validate`
4. Deploy: `npm run start`
5. Test with real requests
6. Monitor logs: `raindrop logs tail`
7. Iterate based on results

## Testing Checklist

Before deploying:

- [ ] All unit tests pass (`npm test`)
- [ ] SmartBucket validation passes (`npm run validate:smartbucket`)
- [ ] SmartBucket tests pass (`npm run test:smartbucket`)
- [ ] Manifest validates (`raindrop build validate`)
- [ ] Types generate without errors (`raindrop build generate`)
- [ ] TypeScript compiles (`npm run build`)
- [ ] Linting passes (`npm run lint`)
- [ ] Full pre-deployment check passes (`npm run predeploy`)

After deploying:

- [ ] Service responds to health checks
- [ ] Logs show no errors (`raindrop logs tail`)
- [ ] Test requests return expected results
- [ ] Queue messages process correctly
- [ ] Scheduled tasks trigger on time

## Common Testing Patterns

### Testing HTTP Services

```typescript
import { expect, test } from 'vitest';
import Service from './index';

test('should handle valid request', async () => {
  const service = new Service({} as any, mockEnv);
  const request = new Request('http://localhost/endpoint', {
    method: 'POST',
    body: JSON.stringify({ data: 'test' }),
  });
  
  const response = await service.fetch(request);
  expect(response.status).toBe(200);
});
```

### Testing Queue Observers

```typescript
import { expect, test } from 'vitest';
import Observer from './index';

test('should process message', async () => {
  const observer = new Observer({} as any, mockEnv);
  const message = {
    id: 'msg-1',
    timestamp: new Date(),
    body: { type: 'test' },
  };
  
  await observer.process(message);
  // Assert side effects
});
```

### Testing Scheduled Tasks

```typescript
import { expect, test } from 'vitest';
import Task from './index';

test('should execute task', async () => {
  const task = new Task({} as any, mockEnv);
  const event = {
    scheduledTime: new Date(),
    cron: '0 8 * * *',
  };
  
  await task.handle(event);
  // Assert task completed
});
```

## Debugging Tips

### View Logs

```bash
# Tail logs in real-time
raindrop logs tail

# Filter by service
raindrop logs tail --service biz-brain

# View recent logs
raindrop logs recent
```

### Add Debug Logging

```typescript
console.log('Debug:', { requestId, data });
console.error('Error:', error);
```

Logs appear in `raindrop logs tail` output.

### Test with curl

```bash
# Test API endpoint
curl -X POST https://your-app.raindrop.ai/api/upload \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}'
```

### Use requestId for Tracing

```typescript
const requestId = crypto.randomUUID();
console.log('Request started:', requestId);

// Pass through service calls
await smartbucket.search({ input: query, requestId });

console.log('Request completed:', requestId);
```

## Limitations

**Cannot test locally:**
- SmartBucket semantic search (requires AI infrastructure)
- SmartMemory operations (requires vector database)
- SmartSQL queries (requires D1 database)
- Queue message delivery
- Scheduled task triggers
- AI model inference

**Workaround:** Use mocks for local testing, deploy to test real behavior.

## Best Practices

1. **Write tests first** - TDD helps catch issues early
2. **Mock external dependencies** - Keep tests fast and reliable
3. **Test error paths** - Don't just test happy paths
4. **Use descriptive test names** - Make failures easy to understand
5. **Keep tests isolated** - Each test should be independent
6. **Test edge cases** - Empty inputs, large payloads, special characters
7. **Validate SmartBucket config** - Run `npm run validate:smartbucket` before deploy
8. **Monitor after deploy** - Watch logs for unexpected behavior
9. **Use staging environment** - If possible, test before production

## SmartBucket-Specific Testing

For detailed SmartBucket validation and testing, see [SMARTBUCKET-VALIDATION.md](./SMARTBUCKET-VALIDATION.md).

**Quick validation:**
```bash
npm run validate:smartbucket  # Check configuration
npm run test:smartbucket      # Run SmartBucket tests
npm run predeploy             # Full pre-deployment check
```

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Raindrop CLI Reference](https://docs.liquidmetal.ai/cli)
- [SmartBucket Documentation](https://docs.liquidmetal.ai/reference/smartbucket)
- [SmartBucket Validation Guide](./SMARTBUCKET-VALIDATION.md)
