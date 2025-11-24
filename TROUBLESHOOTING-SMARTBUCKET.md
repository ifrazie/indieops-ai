# SmartBucket Troubleshooting Guide

## Common Issue: Search Returns No Results

### Symptoms
- Document uploads successfully
- `list` endpoint shows the document
- `search` returns empty results
- `documentChat` fails or returns errors

### Root Causes

#### 1. Document Still Indexing (Most Common)

**Problem:** SmartBucket needs 30-60 seconds to index uploaded documents.

**Solution:**
```bash
# Check document status
curl https://api.indieops.ai/api/document-status/your-file.pdf

# Expected response when NOT indexed:
{
  "indexed": false,
  "secondsSinceUpload": 15,
  "message": "Document exists but may still be processing. Try again in 45s."
}

# Expected response when indexed:
{
  "indexed": true,
  "message": "Document is indexed and ready for chat"
}
```

**Wait 60 seconds after upload before searching.**

#### 2. Unsupported File Type

**Problem:** SmartBucket only indexes certain file types.

**Supported types:**
- `application/pdf`
- `text/plain`
- `image/png`
- `image/jpeg`
- `audio/webm`
- `audio/mpeg`
- `audio/wav`
- `audio/mp4`

**Solution:** Check your file's content type:
```bash
curl https://api.indieops.ai/api/document-status/your-file.pdf | jq '.contentType'
```

If it's not a supported type, SmartBucket won't index it.

#### 3. Search Query Doesn't Match Content

**Problem:** Your search query doesn't semantically match the document content.

**Solution:** Try broader queries:
```bash
# Instead of specific terms
curl -X POST https://api.indieops.ai/api/search \
  -H "Content-Type: application/json" \
  -d '{"query": "contract payment terms section 3.2"}'

# Try general queries
curl -X POST https://api.indieops.ai/api/search \
  -H "Content-Type: application/json" \
  -d '{"query": "document"}'
```

#### 4. Empty or Corrupted Document

**Problem:** Document uploaded but contains no extractable text.

**Solution:** Check document size:
```bash
curl https://api.indieops.ai/api/list | jq '.objects[] | {key, size}'
```

If size is very small (< 100 bytes), the document might be empty.

#### 5. API Method Signature Mismatch

**Problem:** Code doesn't match SmartBucket API exactly.

**Correct signatures from steering file:**

```typescript
// search() - requestId is OPTIONAL (defaults to generated ULID)
interface SearchInput {
  input: string;        // Required
  requestId?: string;   // Optional - defaults to generated ULID
  partition?: string;   // Optional - defaults to 'default'
}

// chunkSearch() - requestId is OPTIONAL
interface RagSearchInput {
  input: string;        // Required
  requestId?: string;   // Optional - defaults to generated ULID
  partition?: string;   // Optional - defaults to 'default'
}

// documentChat() - requestId is REQUIRED
interface DocumentChatInput {
  objectId: string;     // Required
  input: string;        // Required
  requestId: string;    // Required
  partition?: string;   // Optional
}
```

## Debugging Steps

### Step 1: Run Debug Endpoint

```bash
curl https://api.indieops.ai/api/debug/smartbucket | jq '.'
```

This tests:
- ✅ SmartBucket connectivity
- ✅ List functionality
- ✅ Search functionality
- ✅ Chunk search functionality

**Expected output:**
```json
{
  "success": true,
  "tests": {
    "list": {
      "success": true,
      "documentCount": 2
    },
    "search": {
      "success": true,
      "resultCount": 5
    },
    "chunkSearch": {
      "success": true,
      "resultCount": 10
    }
  }
}
```

### Step 2: Check Logs

```bash
raindrop logs tail
```

Look for:
- `[SEARCH]` - Search operation logs
- `[CHUNK-SEARCH]` - Chunk search logs
- `[DOCUMENT-CHAT]` - Document chat logs
- `[STATUS]` - Status check logs

**Example successful search log:**
```
[SEARCH] Starting search: { query: 'contract', page: 1 }
[SEARCH] Results: { resultCount: 3, pagination: {...} }
```

**Example failed search log:**
```
[SEARCH] Starting search: { query: 'contract', page: 1 }
[SEARCH] Error: TypeError: Cannot read property 'results' of undefined
```

### Step 3: Test Upload → Wait → Search Flow

```bash
# 1. Upload document
curl -X POST https://api.indieops.ai/api/upload \
  -F "file=@test.pdf" \
  -F "description=Test document"

# 2. Wait 60 seconds
sleep 60

# 3. Check status
curl https://api.indieops.ai/api/document-status/test.pdf | jq '.'

# 4. If indexed=true, try search
curl -X POST https://api.indieops.ai/api/search \
  -H "Content-Type: application/json" \
  -d '{"query": "test"}' | jq '.'

# 5. Try document chat
curl -X POST https://api.indieops.ai/api/document-chat \
  -H "Content-Type: application/json" \
  -d '{"objectId": "test.pdf", "query": "What is this about?"}' | jq '.'
```

### Step 4: Verify Method Calls

Check that your code matches the steering file exactly:

```typescript
// ✅ CORRECT - requestId is optional for search
const results = await smartbucket.search({
  input: query,
  requestId: newRequestId  // Optional
});

// ✅ CORRECT - requestId is optional for chunkSearch
const chunks = await smartbucket.chunkSearch({
  input: query,
  requestId: requestId  // Optional
});

// ✅ CORRECT - requestId is REQUIRED for documentChat
const response = await smartbucket.documentChat({
  objectId: objectId,
  input: query,
  requestId: requestId  // Required
});
```

## Common Error Messages

### "Document not found"

**Cause:** File doesn't exist in bucket or wrong objectId.

**Fix:**
```bash
# List all documents
curl https://api.indieops.ai/api/list | jq '.objects[].key'

# Use exact key from list
curl https://api.indieops.ai/api/document-status/exact-filename.pdf
```

### "Search failed: Cannot read property 'results' of undefined"

**Cause:** SmartBucket search returned unexpected format.

**Fix:** Check logs for actual error. Might be:
- Network timeout
- SmartBucket service unavailable
- Invalid search parameters

### "Document may still be processing"

**Cause:** Document uploaded but not indexed yet.

**Fix:** Wait 60 seconds and try again.

### Empty results array

**Cause:** Search completed but no matches found.

**Fix:**
1. Verify document is indexed: `/api/document-status/:objectId`
2. Try broader search query: `"document"` instead of specific terms
3. Check document actually contains searchable text

## Testing Checklist

Before reporting an issue:

- [ ] Document uploaded successfully (check `/api/list`)
- [ ] Waited at least 60 seconds after upload
- [ ] Document status shows `indexed: true`
- [ ] Document is a supported file type (PDF, TXT, etc.)
- [ ] Document size > 100 bytes
- [ ] Tried broad search query like "document" or "test"
- [ ] Checked logs with `raindrop logs tail`
- [ ] Debug endpoint shows `success: true`

## Quick Test Script

Save as `test-smartbucket.sh` and run:

```bash
#!/bin/bash
API_URL="https://api.indieops.ai"

echo "Testing SmartBucket..."

# Upload
echo "1. Uploading test.txt..."
echo "This is a test document for SmartBucket indexing." > test.txt
UPLOAD=$(curl -s -X POST "$API_URL/api/upload" -F "file=@test.txt")
echo $UPLOAD | jq '.'

# Wait
echo "2. Waiting 60 seconds for indexing..."
sleep 60

# Status
echo "3. Checking status..."
curl -s "$API_URL/api/document-status/test.txt" | jq '.'

# Search
echo "4. Searching..."
curl -s -X POST "$API_URL/api/search" \
  -H "Content-Type: application/json" \
  -d '{"query": "test"}' | jq '.'

# Chat
echo "5. Document chat..."
curl -s -X POST "$API_URL/api/document-chat" \
  -H "Content-Type: application/json" \
  -d '{"objectId": "test.txt", "query": "What is this document about?"}' | jq '.'

rm test.txt
```

## Still Having Issues?

1. **Check Raindrop platform status** - Service might be down
2. **Verify manifest** - `npm run validate`
3. **Regenerate types** - `npm run generate`
4. **Check logs** - `raindrop logs tail --service api-gateway`
5. **Try simple text file** - Upload a `.txt` file with plain text
6. **Contact support** - Share logs and error messages

## Expected Behavior

**Successful flow:**
1. Upload document → Returns `success: true`
2. Wait 60 seconds
3. Check status → Returns `indexed: true`
4. Search → Returns results array with matches
5. Document chat → Returns AI-generated answer

**Timeline:**
- Upload: Instant
- Indexing: 30-60 seconds
- Search: < 1 second
- Document chat: 2-5 seconds
