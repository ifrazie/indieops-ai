# SmartBucket Pre-Deployment Checklist

## Quick Validation (30 seconds)

```bash
npm run predeploy
```

This runs everything. If it passes, you're good to deploy!

## Step-by-Step Validation

### 1. Generate Types (5 seconds)
```bash
npm run generate
```
✅ Creates type-safe `env.DOCUMENTS` binding

### 2. Validate Configuration (5 seconds)
```bash
npm run validate:smartbucket
```
✅ Checks manifest, bindings, and usage patterns

### 3. Run Tests (10 seconds)
```bash
npm run test:smartbucket
```
✅ Validates SmartBucket method usage

### 4. Full Check (30 seconds)
```bash
npm run precheck
```
✅ Lint + Build + Validate + Test

## What Gets Validated

- ✅ `smartbucket "documents"` exists in manifest
- ✅ `env.DOCUMENTS` binding is generated
- ✅ Code accesses `c.env.DOCUMENTS` correctly
- ✅ Uses `search()`, `documentChat()`, `chunkSearch()`
- ✅ No manual RAG implementation
- ✅ RequestId generation is correct
- ✅ TypeScript compiles without errors
- ✅ All tests pass

## Common Errors

### Error: "DOCUMENTS not found in Env"
**Fix:** Add to `raindrop.manifest`:
```hcl
smartbucket "documents" {}
```
Then: `npm run generate`

### Error: "Manual RAG code detected"
**Fix:** Remove custom chunking/embedding code. Use SmartBucket methods instead.

### Error: "RequestId pattern not found"
**Fix:** Generate unique IDs:
```typescript
const requestId = `search-${Date.now()}-${Math.random().toString(36).substring(7)}`;
```

## Correct Usage Examples

### Upload
```typescript
await c.env.DOCUMENTS.put(filename, fileContent);
```

### Search
```typescript
await c.env.DOCUMENTS.search({ input: query, requestId });
```

### Document Chat (RAG)
```typescript
await c.env.DOCUMENTS.documentChat({ objectId, input: query, requestId });
```

## After Deployment

1. Upload test document
2. Wait 30-60 seconds for indexing
3. Test search: `/api/search`
4. Test chat: `/api/document-chat`
5. Monitor logs: `raindrop logs tail`

## Remember

**SmartBucket = Automatic RAG**

You should NEVER:
- ❌ Manually chunk documents
- ❌ Generate embeddings yourself
- ❌ Build RAG prompts manually
- ❌ Implement vector search

SmartBucket does all of this automatically!
