# Testing IndieOps AI Locally

## TL;DR - Quick Start

```bash
# One command to validate everything before deploy
npm run predeploy
```

If this passes, you're ready to deploy! 🚀

## What Can Be Tested Locally

### ✅ What Works Locally

- **Configuration validation** - Manifest syntax, bindings, types
- **Business logic** - Input validation, error handling, data transformations
- **Code structure** - TypeScript compilation, linting, formatting
- **SmartBucket setup** - Correct method usage, no anti-patterns
- **Unit tests** - All logic with mocked resources

### ❌ What Requires Deployment

- **SmartBucket RAG** - Semantic search, document chat, indexing
- **SmartMemory** - Vector storage and retrieval
- **SmartSQL** - D1 database queries
- **Queue delivery** - Actual message processing
- **Scheduled tasks** - Cron triggers
- **AI inference** - LLM responses

## Testing Commands

### Essential Commands

```bash
# Generate types from manifest (run first!)
npm run generate

# Validate SmartBucket configuration
npm run validate:smartbucket

# Run SmartBucket-specific tests
npm run test:smartbucket

# Run all tests
npm test

# Full pre-deployment check (recommended)
npm run predeploy
```

### Development Commands

```bash
# Watch mode for tests
npm run test:watch

# Lint code
npm run lint

# Format code
npm run format

# Build TypeScript
npm run build

# Validate manifest
npm run validate
```

## Testing Workflow

### Before Every Deployment

1. **Generate types** - Ensures bindings are up to date
   ```bash
   npm run generate
   ```

2. **Validate SmartBucket** - Checks configuration
   ```bash
   npm run validate:smartbucket
   ```

3. **Run tests** - Validates logic
   ```bash
   npm test
   ```

4. **Deploy** - Push to production
   ```bash
   npm run start
   ```

5. **Monitor** - Watch for errors
   ```bash
   raindrop logs tail
   ```

### Or Use One Command

```bash
npm run predeploy  # Does steps 1-3 automatically
npm run start      # Deploy
raindrop logs tail # Monitor
```

## What Gets Validated

### Configuration (npm run validate:smartbucket)

- ✓ `smartbucket "documents"` exists in manifest
- ✓ `env.DOCUMENTS` binding is generated
- ✓ Code accesses `c.env.DOCUMENTS` correctly
- ✓ Uses `search()`, `documentChat()`, `chunkSearch()`
- ✓ No manual RAG implementation detected
- ✓ RequestId generation patterns are correct

### Tests (npm test)

- ✓ HTTP method validation
- ✓ Input validation with Zod schemas
- ✓ Error handling and retry logic
- ✓ Response formatting
- ✓ Edge cases and special characters
- ✓ SmartBucket method signatures
- ✓ Mock resource interactions

### Build (npm run build)

- ✓ TypeScript compiles without errors
- ✓ All imports resolve correctly
- ✓ Type safety is maintained

## SmartBucket Testing

### Key Principle

**SmartBucket handles RAG automatically.** You should never write:
- ❌ Document chunking code
- ❌ Embedding generation
- ❌ Vector search implementation
- ❌ Manual RAG prompts

### Correct Usage

```typescript
// ✅ Upload (indexing happens automatically)
await c.env.DOCUMENTS.put(filename, fileContent);

// ✅ Search (semantic search built-in)
await c.env.DOCUMENTS.search({ input: query, requestId });

// ✅ Document Chat (RAG built-in)
await c.env.DOCUMENTS.documentChat({ objectId, input: query, requestId });

// ✅ Chunk Search (for custom RAG)
await c.env.DOCUMENTS.chunkSearch({ input: query, requestId });
```

### Local Validation

Run SmartBucket validation to check your setup:

```bash
npm run validate:smartbucket
```

**Expected output:**
```
✅ All validations passed! SmartBucket is properly configured.
```

## Testing After Deployment

Once deployed, test with real data:

### 1. Upload a Document

```bash
curl -X POST https://api.indieops.ai/api/upload \
  -F "file=@test.pdf" \
  -F "description=Test document"
```

### 2. Wait for Indexing (30-60 seconds)

SmartBucket automatically indexes uploaded files.

### 3. Check Status

```bash
curl https://api.indieops.ai/api/document-status/test.pdf
```

### 4. Test Search

```bash
curl -X POST https://api.indieops.ai/api/search \
  -H "Content-Type: application/json" \
  -d '{"query": "test content"}'
```

### 5. Test Document Chat

```bash
curl -X POST https://api.indieops.ai/api/document-chat \
  -H "Content-Type: application/json" \
  -d '{"objectId": "test.pdf", "query": "What is this about?"}'
```

### 6. Monitor Logs

```bash
raindrop logs tail
```

## Common Issues

### "DOCUMENTS not found in Env"

**Cause:** Types not generated or manifest missing SmartBucket

**Fix:**
```bash
npm run generate
```

### "Manual RAG code detected"

**Cause:** Writing custom chunking/embedding code

**Fix:** Remove manual implementation, use SmartBucket methods

### "RequestId pattern not found"

**Cause:** Not generating unique request IDs

**Fix:**
```typescript
const requestId = `search-${Date.now()}-${Math.random().toString(36).substring(7)}`;
```

### Tests pass but deployment fails

**Cause:** Raindrop platform issue or resource configuration

**Fix:**
1. Check logs: `raindrop logs tail`
2. Verify manifest: `npm run validate`
3. Check deployment status: `raindrop build status`

## File Structure

```
indieops-ai/
├── src/
│   ├── _test/
│   │   ├── mocks.ts                          # Mock Raindrop resources
│   │   ├── integration.example.test.ts       # Integration test examples
│   │   └── smartbucket-validation.test.ts    # SmartBucket validation tests
│   ├── api-gateway/
│   │   ├── index.ts                          # API implementation
│   │   ├── index.test.ts                     # API tests
│   │   └── raindrop.gen.ts                   # Generated types
│   └── biz-brain/
│       ├── index.ts                          # Service implementation
│       ├── index.test.ts                     # Service tests
│       └── raindrop.gen.ts                   # Generated types
├── scripts/
│   └── validate-smartbucket.ts               # Pre-deployment validation
├── TESTING.md                                # Full testing guide
├── SMARTBUCKET-VALIDATION.md                 # SmartBucket-specific guide
└── README-TESTING.md                         # This file (quick reference)
```

## Resources

- **Full Testing Guide:** [TESTING.md](./TESTING.md)
- **SmartBucket Guide:** [SMARTBUCKET-VALIDATION.md](./SMARTBUCKET-VALIDATION.md)
- **Quick Checklist:** [.github/SMARTBUCKET-CHECKLIST.md](./.github/SMARTBUCKET-CHECKLIST.md)
- **Raindrop Docs:** https://docs.liquidmetal.ai
- **SmartBucket API:** https://docs.liquidmetal.ai/reference/smartbucket

## Summary

**Local testing validates configuration and logic.** You can't test SmartBucket's AI features locally, but you can ensure your code is correctly set up to use them.

**The workflow:**
1. Write code with SmartBucket methods
2. Run `npm run predeploy` to validate
3. Deploy with `npm run start`
4. Test with real documents
5. Monitor with `raindrop logs tail`

This catches 90% of issues before deployment, saving time and frustration.
