# Why Tests Pass But Deployment Might Fail

## The Core Issue

**Your tests use mocks. Deployment uses real SmartBucket.**

This is a fundamental limitation of testing serverless AI infrastructure locally.

## What Tests Validate

### ✅ Tests CAN Validate

1. **Configuration** - Manifest syntax, bindings, types
2. **Code structure** - Method calls, parameters, error handling
3. **Business logic** - Input validation, data transformations
4. **Type safety** - TypeScript compilation, interface matching

### ❌ Tests CANNOT Validate

1. **SmartBucket indexing** - Requires AI infrastructure
2. **Semantic search** - Requires vector database
3. **Document processing** - Requires ML models
4. **RAG generation** - Requires LLM inference
5. **Network latency** - Real-world timing issues
6. **Platform-specific behavior** - Raindrop runtime quirks

## Why Your Specific Issue Happens

### Scenario: Upload Works, Search Doesn't

**What's happening:**

1. ✅ Upload succeeds → Document stored in bucket
2. ✅ List works → Bucket storage is working
3. ⏳ Indexing starts → Background process (30-60s)
4. ❌ Search fails → Document not indexed yet

**Why tests don't catch this:**

```typescript
// In tests (mocks)
const smartbucket = createMockSmartBucket();
await smartbucket.put('doc.pdf', content);
await smartbucket.search({ input: 'query' }); // ✅ Returns immediately

// In production (real SmartBucket)
await smartbucket.put('doc.pdf', content);
// ... indexing happens in background ...
await smartbucket.search({ input: 'query' }); // ❌ No results yet!
```

## Common Deployment Issues Tests Miss

### 1. Indexing Delay

**Test:** Instant mock response
**Reality:** 30-60 second indexing delay

**Solution:** Wait before searching, check status endpoint

### 2. Unsupported File Types

**Test:** Mock accepts any file
**Reality:** Only PDF, TXT, images, audio

**Solution:** Validate content-type before upload

### 3. Empty Search Results

**Test:** Mock always returns results
**Reality:** Semantic search might not match

**Solution:** Use broader queries, verify document content

### 4. Network Timeouts

**Test:** No network, instant response
**Reality:** Network latency, timeouts possible

**Solution:** Add retry logic, timeout handling

### 5. Platform-Specific Errors

**Test:** Controlled environment
**Reality:** Raindrop runtime constraints

**Solution:** Monitor logs, handle platform errors

## What Your Tests Actually Validate

### Configuration Tests (npm run validate:smartbucket)

```
✓ Manifest contains smartbucket "documents"
✓ env.DOCUMENTS binding exists
✓ Code accesses c.env.DOCUMENTS
✓ Uses search(), documentChat(), chunkSearch()
✓ No manual RAG implementation
```

**This catches:** Configuration errors, typos, missing bindings

**This misses:** Runtime behavior, indexing delays, search quality

### Unit Tests (npm test)

```
✓ Input validation works
✓ Error handling works
✓ Response formatting works
✓ Method signatures match
```

**This catches:** Logic errors, type errors, validation bugs

**This misses:** SmartBucket behavior, AI responses, indexing

## The Testing Gap

```
┌─────────────────────────────────────────────────┐
│                                                 │
│  What Tests Validate                            │
│  ✓ Configuration                                │
│  ✓ Code structure                               │
│  ✓ Type safety                                  │
│  ✓ Business logic                               │
│                                                 │
└─────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────┐
│                                                 │
│  THE GAP (Must test in production)              │
│  ✗ SmartBucket indexing                         │
│  ✗ Semantic search quality                      │
│  ✗ RAG generation                               │
│  ✗ Platform behavior                            │
│                                                 │
└─────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────┐
│                                                 │
│  Production Testing Required                    │
│  • Upload real documents                        │
│  • Wait for indexing                            │
│  • Test search with real queries                │
│  • Verify RAG responses                         │
│  • Monitor logs                                 │
│                                                 │
└─────────────────────────────────────────────────┘
```

## How to Bridge the Gap

### 1. Local Validation (Before Deploy)

```bash
npm run predeploy
```

Validates:
- Configuration is correct
- Code compiles
- Types match
- Logic is sound

### 2. Deployment Testing (After Deploy)

```bash
# Deploy
npm run start

# Wait for startup
sleep 15

# Test with real data
./test-smartbucket.sh https://api.indieops.ai

# Monitor
raindrop logs tail
```

Tests:
- SmartBucket connectivity
- Document indexing
- Search functionality
- RAG generation

### 3. Iterative Testing

```bash
# Make changes
vim src/api-gateway/index.ts

# Validate locally
npm run predeploy

# Deploy
npm run restart

# Test in production
./test-smartbucket.sh https://api.indieops.ai
```

## Best Practices

### ✅ Do This

1. **Run predeploy checks** - Catch config errors early
2. **Deploy to test environment** - Test with real SmartBucket
3. **Wait for indexing** - Don't test search immediately
4. **Monitor logs** - Watch for errors in real-time
5. **Test with real documents** - Use actual PDFs, not mocks
6. **Use debug endpoints** - Verify SmartBucket connectivity
7. **Check document status** - Confirm indexing completed

### ❌ Don't Do This

1. **Assume tests = production** - Tests use mocks
2. **Test search immediately** - Wait 60 seconds
3. **Ignore logs** - Logs show real errors
4. **Use only unit tests** - Need production testing
5. **Skip validation** - Always run predeploy
6. **Deploy without testing** - Test after every deploy

## Your Current Situation

**What's working:**
- ✅ Configuration is correct (tests pass)
- ✅ Code structure is correct (builds successfully)
- ✅ Upload works (document in bucket)
- ✅ List works (can see document)

**What's not working:**
- ❌ Search returns no results

**Most likely cause:**
1. Document not indexed yet (wait 60s)
2. Search query doesn't match content
3. Unsupported file type
4. Document is empty/corrupted

**How to diagnose:**

```bash
# 1. Check document status
curl https://api.indieops.ai/api/document-status/your-file.pdf | jq '.'

# Look for:
# - indexed: true/false
# - secondsSinceUpload: X
# - contentType: "application/pdf"

# 2. Check logs
raindrop logs tail

# Look for:
# - [SEARCH] Starting search
# - [SEARCH] Results: { resultCount: 0 }
# - Any error messages

# 3. Try debug endpoint
curl https://api.indieops.ai/api/debug/smartbucket | jq '.'

# Should show:
# - list.success: true
# - search.success: true
# - chunkSearch.success: true
```

## The Bottom Line

**Tests validate configuration. Production validates behavior.**

You need both:
1. **Local tests** - Fast feedback, catch config errors
2. **Production tests** - Real behavior, catch runtime issues

Your tests passing means you're **ready to deploy**, not that deployment will **definitely work**.

After deployment, you must:
1. Upload test documents
2. Wait for indexing
3. Test search/chat
4. Monitor logs
5. Iterate based on results

This is normal for serverless AI platforms. The gap between local testing and production behavior is expected.

## Next Steps

1. **Deploy your code** - `npm run start`
2. **Run debug endpoint** - Check SmartBucket connectivity
3. **Upload test document** - Simple text file
4. **Wait 60 seconds** - Let indexing complete
5. **Check status** - Verify `indexed: true`
6. **Test search** - Try broad query
7. **Check logs** - Look for errors
8. **Share results** - If still failing, share logs/errors

See [DEPLOY-AND-TEST.md](./DEPLOY-AND-TEST.md) for detailed workflow.
