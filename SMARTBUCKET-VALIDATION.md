# SmartBucket Local Validation Guide

## Overview

Since Raindrop runs in the cloud, you can't test SmartBucket's RAG capabilities locally. However, you **can** validate that your code is correctly configured to use SmartBucket before deployment.

This guide shows you how to catch configuration errors early, before deploying.

## Key Principle: SmartBucket = Automatic RAG

**You should NEVER write manual RAG code.** SmartBucket handles:
- ✅ Document chunking (automatic)
- ✅ Vector embeddings (automatic)
- ✅ Semantic search (automatic)
- ✅ Context retrieval (automatic)
- ✅ RAG prompting (automatic via `documentChat`)

If you're writing code to chunk documents, generate embeddings, or build RAG prompts manually, **you're doing it wrong**.

## Pre-Deployment Validation Workflow

### 1. Generate Types from Manifest

```bash
npm run generate
```

This creates `raindrop.gen.ts` files with your environment bindings. If `DOCUMENTS` isn't in the generated `Env` type, your manifest is wrong.

**What it checks:**
- Manifest syntax is valid
- SmartBucket "documents" is defined
- Type-safe `env.DOCUMENTS` binding is created

### 2. Run SmartBucket Validation Script

```bash
npm run validate:smartbucket
```

This script checks:
- ✓ Manifest contains `smartbucket "documents"`
- ✓ Generated types include `DOCUMENTS` binding
- ✓ API Gateway accesses `c.env.DOCUMENTS` correctly
- ✓ Code uses `search()`, `documentChat()`, `chunkSearch()`
- ✓ No manual RAG implementation detected
- ✓ RequestId generation patterns are correct

**Example output:**
```
🔍 Validating SmartBucket Configuration...

Results:

✓ Manifest file exists
✓ SmartBucket "documents" is defined in manifest
✓ Generated types exist: src/api-gateway/raindrop.gen.ts
✓ DOCUMENTS binding found in src/api-gateway/raindrop.gen.ts
✓ API Gateway accesses env.DOCUMENTS correctly
✓ API Gateway uses SmartBucket search() method
✓ API Gateway uses SmartBucket documentChat() method
✓ No manual RAG implementation detected (good!)
✓ RequestId generation pattern found

============================================================
✅ All validations passed! SmartBucket is properly configured.
```

### 3. Run SmartBucket Tests

```bash
npm run test:smartbucket
```

This runs comprehensive tests that verify:
- Environment bindings are correct
- SmartBucket methods are used properly
- Anti-patterns are avoided
- Request ID patterns are correct
- Error handling is in place

### 4. Run Full Pre-Deployment Check

```bash
npm run predeploy
```

This runs everything:
1. Generate types
2. Validate SmartBucket config
3. Lint code
4. Build TypeScript
5. Validate manifest
6. Run all tests

**Only deploy if this passes!**

## What Each Validation Catches

### Type Generation (`npm run generate`)

**Catches:**
- Missing SmartBucket in manifest
- Typos in resource names
- Invalid manifest syntax

**Example error:**
```typescript
// If DOCUMENTS isn't in Env, TypeScript will error:
const smartbucket = c.env.DOCUMENTS;
//                         ^^^^^^^^^ Property 'DOCUMENTS' does not exist
```

### SmartBucket Validation Script

**Catches:**
- Missing `smartbucket "documents"` in manifest
- Not accessing `env.DOCUMENTS` in code
- Missing `search()` or `documentChat()` usage
- Manual RAG implementation (anti-pattern)
- Missing requestId generation

**Example issues detected:**
```
✗ API Gateway does not access env.DOCUMENTS
  → Use: c.env.DOCUMENTS to access SmartBucket

✗ Possible manual RAG code detected
  → SmartBucket handles RAG automatically - remove manual implementation
```

### SmartBucket Tests

**Catches:**
- Incorrect method signatures
- Missing required parameters
- Wrong parameter types
- Improper error handling

**Example test:**
```typescript
test('should use documentChat() for Q&A (not manual prompting)', async () => {
  const result = await smartbucket.documentChat({
    objectId: 'contract.pdf',
    input: 'What are the payment terms?',
    requestId: 'test-req-3',
  });

  expect(result.answer).toBeDefined();
  expect(typeof result.answer).toBe('string');
});
```

## Common Issues and Fixes

### Issue: `DOCUMENTS` not found in generated types

**Cause:** SmartBucket not defined in manifest

**Fix:**
```hcl
# Add to raindrop.manifest
smartbucket "documents" {}
```

Then regenerate:
```bash
npm run generate
```

### Issue: "Property 'DOCUMENTS' does not exist on type 'Env'"

**Cause:** Types not generated or out of sync

**Fix:**
```bash
npm run generate
```

### Issue: Manual RAG code detected

**Cause:** Writing custom chunking/embedding/RAG code

**Fix:** Remove manual implementation and use SmartBucket methods:

❌ **Wrong (manual RAG):**
```typescript
// DON'T DO THIS
const chunks = splitIntoChunks(document, 512);
const embeddings = await getEmbeddings(chunks);
const results = await vectorDB.search(embeddings);
const context = results.map(r => r.text).join('\n');
const prompt = `Context: ${context}\n\nQuestion: ${query}`;
const answer = await ai.run(prompt);
```

✅ **Correct (SmartBucket):**
```typescript
// Just upload and use documentChat
await smartbucket.put('document.pdf', fileContent);

const result = await smartbucket.documentChat({
  objectId: 'document.pdf',
  input: query,
  requestId: 'req-1',
});

console.log(result.answer); // RAG handled automatically!
```

### Issue: Missing requestId

**Cause:** Not generating unique request IDs

**Fix:**
```typescript
const requestId = `search-${Date.now()}-${Math.random().toString(36).substring(7)}`;

await smartbucket.search({
  input: query,
  requestId, // Required for tracking and pagination
});
```

## Correct SmartBucket Usage Patterns

### 1. Upload Documents

```typescript
// In Hono route
app.post('/api/upload', async (c) => {
  const formData = await c.req.formData();
  const file = formData.get('file') as File;
  
  const smartbucket = c.env.DOCUMENTS;
  const arrayBuffer = await file.arrayBuffer();
  
  const result = await smartbucket.put(file.name, new Uint8Array(arrayBuffer), {
    httpMetadata: {
      contentType: file.type,
    },
    customMetadata: {
      uploadedAt: new Date().toISOString(),
    },
  });
  
  return c.json({ success: true, objectId: file.name });
});
```

### 2. Semantic Search

```typescript
app.post('/api/search', async (c) => {
  const { query } = await c.req.json();
  const smartbucket = c.env.DOCUMENTS;
  
  const requestId = `search-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  
  const results = await smartbucket.search({
    input: query,
    requestId,
  });
  
  return c.json({
    results: results.results,
    pagination: results.pagination,
    requestId, // Return for pagination
  });
});
```

### 3. Document Q&A (RAG)

```typescript
app.post('/api/document-chat', async (c) => {
  const { objectId, query } = await c.req.json();
  const smartbucket = c.env.DOCUMENTS;
  
  const requestId = `chat-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  
  // SmartBucket handles RAG automatically
  const response = await smartbucket.documentChat({
    objectId,
    input: query,
    requestId,
  });
  
  return c.json({
    answer: response.answer, // AI-generated answer with context
  });
});
```

### 4. Chunk Search (for custom RAG)

```typescript
app.post('/api/chunk-search', async (c) => {
  const { query } = await c.req.json();
  const smartbucket = c.env.DOCUMENTS;
  
  const requestId = `chunk-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  
  const results = await smartbucket.chunkSearch({
    input: query,
    requestId,
  });
  
  // Use chunks as context for custom prompting
  const context = results.results.map(r => r.text).join('\n');
  
  return c.json({ chunks: results.results, context });
});
```

### 5. Pagination

```typescript
app.post('/api/search/page', async (c) => {
  const { requestId, page, pageSize } = await c.req.json();
  const smartbucket = c.env.DOCUMENTS;
  
  const results = await smartbucket.getPaginatedResults({
    requestId, // From initial search
    page,
    pageSize,
  });
  
  return c.json({
    results: results.results,
    pagination: results.pagination,
  });
});
```

## Testing After Deployment

Once deployed, verify SmartBucket is working:

### 1. Upload a test document

```bash
curl -X POST https://api.indieops.ai/api/upload \
  -F "file=@test.pdf" \
  -F "description=Test document"
```

### 2. Wait 30-60 seconds for indexing

SmartBucket automatically indexes uploaded files. This takes time.

### 3. Check document status

```bash
curl https://api.indieops.ai/api/document-status/test.pdf
```

Expected response:
```json
{
  "objectId": "test.pdf",
  "exists": true,
  "indexed": true,
  "message": "Document is indexed and ready for chat"
}
```

### 4. Test search

```bash
curl -X POST https://api.indieops.ai/api/search \
  -H "Content-Type: application/json" \
  -d '{"query": "test content"}'
```

### 5. Test document chat

```bash
curl -X POST https://api.indieops.ai/api/document-chat \
  -H "Content-Type: application/json" \
  -d '{"objectId": "test.pdf", "query": "What is this document about?"}'
```

### 6. Monitor logs

```bash
raindrop logs tail
```

Look for:
- Upload confirmations
- Search requests
- Document chat responses
- Any errors

## Checklist Before Deployment

- [ ] `npm run generate` succeeds
- [ ] `npm run validate:smartbucket` passes
- [ ] `npm run test:smartbucket` passes
- [ ] `npm run predeploy` passes
- [ ] No manual RAG code in your implementation
- [ ] All SmartBucket access uses `env.DOCUMENTS`
- [ ] All search/chat calls include `requestId`
- [ ] Error handling is in place

## Summary

**Local validation can't test SmartBucket's AI features**, but it can verify:
- ✅ Configuration is correct
- ✅ Bindings are properly set up
- ✅ Code uses the right methods
- ✅ No anti-patterns are present
- ✅ Types are generated correctly

**After deployment**, test with real documents to verify:
- ✅ Upload works
- ✅ Indexing completes
- ✅ Search returns results
- ✅ Document chat generates answers

This approach catches 90% of issues before deployment, saving you time and frustration.
