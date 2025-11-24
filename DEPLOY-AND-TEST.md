# Deploy and Test Workflow

## Quick Start

```bash
# 1. Validate and deploy
npm run predeploy && npm run start

# 2. Wait for deployment (10-30 seconds)

# 3. Test SmartBucket
./test-smartbucket.sh https://your-api-url.raindrop.ai

# 4. Monitor logs
raindrop logs tail
```

## Detailed Workflow

### Step 1: Pre-Deployment Validation

```bash
npm run predeploy
```

This runs:
- ✅ Type generation
- ✅ SmartBucket configuration validation
- ✅ Build
- ✅ Manifest validation
- ✅ All tests

**Expected output:**
```
✅ All validations passed! SmartBucket is properly configured.
✓ 49 tests passed
```

### Step 2: Deploy

```bash
npm run start
```

**Expected output:**
```
Build completed successfully
Deploying to Raindrop...
✓ api-gateway deployed
✓ biz-brain deployed
✓ notification-handler deployed
✓ daily-brief deployed
```

### Step 3: Verify Deployment

```bash
raindrop build status
```

**Expected output:**
```
Application: indieops-ai
Status: Running
Services:
  ✓ api-gateway (public)
  ✓ biz-brain (public)
  ✓ notification-handler
  ✓ daily-brief
```

### Step 4: Test Health

```bash
curl https://api.indieops.ai/health
```

**Expected response:**
```json
{
  "status": "ok",
  "timestamp": "2024-11-23T15:30:00.000Z"
}
```

### Step 5: Test SmartBucket Debug

```bash
curl https://api.indieops.ai/api/debug/smartbucket | jq '.'
```

**Expected response:**
```json
{
  "success": true,
  "tests": {
    "list": { "success": true, "documentCount": 0 },
    "search": { "success": true, "resultCount": 0 },
    "chunkSearch": { "success": true, "resultCount": 0 }
  }
}
```

### Step 6: Upload Test Document

Create a test file:
```bash
echo "This is a test document for SmartBucket. It contains information about contracts, payments, and business operations." > test.txt
```

Upload it:
```bash
curl -X POST https://api.indieops.ai/api/upload \
  -F "file=@test.txt" \
  -F "description=Test document for SmartBucket validation"
```

**Expected response:**
```json
{
  "success": true,
  "message": "File uploaded successfully. Document is being processed for search and chat.",
  "objectId": "test.txt",
  "size": 123
}
```

### Step 7: Wait for Indexing

**Important:** SmartBucket needs 30-60 seconds to index documents.

```bash
# Check status every 10 seconds
for i in {1..6}; do
  echo "Check $i/6..."
  curl -s https://api.indieops.ai/api/document-status/test.txt | jq '.indexed, .secondsSinceUpload, .message'
  sleep 10
done
```

**Expected progression:**
```
Check 1/6: false, 10, "Document exists but may still be processing..."
Check 2/6: false, 20, "Document exists but may still be processing..."
...
Check 6/6: true, 60, "Document is indexed and ready for chat"
```

### Step 8: Test Search

```bash
curl -X POST https://api.indieops.ai/api/search \
  -H "Content-Type: application/json" \
  -d '{"query": "contract"}' | jq '.'
```

**Expected response:**
```json
{
  "success": true,
  "message": "Search completed",
  "query": "contract",
  "results": [
    {
      "text": "This is a test document for SmartBucket. It contains information about contracts...",
      "source": "test.txt",
      "score": 0.85
    }
  ],
  "pagination": {
    "total": 1,
    "page": 1,
    "pageSize": 15,
    "totalPages": 1,
    "hasMore": false,
    "requestId": "search-1234567890-abc123"
  }
}
```

### Step 9: Test Document Chat

```bash
curl -X POST https://api.indieops.ai/api/document-chat \
  -H "Content-Type: application/json" \
  -d '{
    "objectId": "test.txt",
    "query": "What topics does this document cover?"
  }' | jq '.'
```

**Expected response:**
```json
{
  "success": true,
  "message": "Document chat completed",
  "objectId": "test.txt",
  "query": "What topics does this document cover?",
  "answer": "This document covers information about contracts, payments, and business operations related to SmartBucket."
}
```

### Step 10: Monitor Logs

```bash
raindrop logs tail
```

**Look for:**
```
[SEARCH] Starting search: { query: 'contract', page: 1 }
[SEARCH] Results: { resultCount: 1, pagination: {...} }
[DOCUMENT-CHAT] Starting: { objectId: 'test.txt', query: '...' }
[DOCUMENT-CHAT] Response received: { answerLength: 123 }
```

## Troubleshooting

### Issue: Search returns empty results

**Check:**
1. Document indexed? `curl .../api/document-status/test.txt`
2. Waited 60 seconds?
3. Logs show errors? `raindrop logs tail`

**Solution:** See [TROUBLESHOOTING-SMARTBUCKET.md](./TROUBLESHOOTING-SMARTBUCKET.md)

### Issue: Document chat fails

**Error:** "Document not found"
- Check objectId matches exactly: `curl .../api/list`

**Error:** "Document may still be processing"
- Wait 60 seconds after upload
- Check status: `curl .../api/document-status/test.txt`

### Issue: Deployment fails

**Check:**
```bash
npm run validate        # Manifest valid?
npm run build          # TypeScript compiles?
raindrop build status  # Deployment status?
```

## Success Criteria

After deployment, you should have:

- ✅ Health endpoint returns 200
- ✅ Debug endpoint shows `success: true`
- ✅ Documents upload successfully
- ✅ Status shows `indexed: true` after 60s
- ✅ Search returns results
- ✅ Document chat generates answers
- ✅ Logs show no errors

## Automated Test Script

Use the provided script:

```bash
./test-smartbucket.sh https://api.indieops.ai
```

This automatically:
1. Tests health
2. Runs debug checks
3. Lists documents
4. Tests search
5. Tests chunk search

## Continuous Testing

After making changes:

```bash
# 1. Validate locally
npm run predeploy

# 2. Deploy
npm run restart

# 3. Wait for deployment
sleep 15

# 4. Test
./test-smartbucket.sh https://api.indieops.ai

# 5. Monitor
raindrop logs tail
```

## Common Mistakes

❌ **Don't:** Test search immediately after upload
✅ **Do:** Wait 60 seconds for indexing

❌ **Don't:** Use very specific search queries on small documents
✅ **Do:** Use broad queries like "document" or "test"

❌ **Don't:** Assume tests passing means deployment works
✅ **Do:** Test with real documents after deployment

❌ **Don't:** Forget to check logs
✅ **Do:** Monitor logs during testing

## Next Steps

Once basic testing works:

1. **Upload real documents** - PDFs, contracts, invoices
2. **Test with real queries** - Business-specific searches
3. **Integrate with frontend** - Build UI for document management
4. **Add authentication** - Secure your endpoints
5. **Monitor usage** - Track search patterns and performance

## Resources

- [SmartBucket Validation Guide](./SMARTBUCKET-VALIDATION.md)
- [Troubleshooting Guide](./TROUBLESHOOTING-SMARTBUCKET.md)
- [Testing Guide](./TESTING.md)
- [Raindrop Logs](https://docs.liquidmetal.ai/cli#logs)
