# Quick Debug Checklist

## Issue: Search Returns No Results

Run these commands in order:

### 1. Check Document Exists
```bash
curl https://api.indieops.ai/api/list | jq '.objects[].key'
```
✅ Should show your document name

### 2. Check Document Status
```bash
curl https://api.indieops.ai/api/document-status/YOUR-FILE.pdf | jq '.'
```
✅ Should show `"indexed": true`
❌ If `false`, wait 60 seconds and check again

### 3. Check Logs
```bash
raindrop logs tail
```
✅ Look for `[SEARCH]` entries
❌ Look for error messages

### 4. Test Debug Endpoint
```bash
curl https://api.indieops.ai/api/debug/smartbucket | jq '.tests'
```
✅ All should show `"success": true`

### 5. Try Simple Search
```bash
curl -X POST https://api.indieops.ai/api/search \
  -H "Content-Type: application/json" \
  -d '{"query": "document"}' | jq '.results'
```
✅ Should return array with results
❌ If empty, document not indexed or no match

## Common Fixes

### Document Not Indexed
**Symptom:** `"indexed": false`
**Fix:** Wait 60 seconds after upload

### Wrong File Type
**Symptom:** Status shows unsupported contentType
**Fix:** Use PDF, TXT, PNG, JPG only

### Query Doesn't Match
**Symptom:** Search returns `[]` but document is indexed
**Fix:** Try broader query: `"document"` or `"test"`

### Document Empty
**Symptom:** Size < 100 bytes
**Fix:** Upload document with actual content

## Quick Test

```bash
# Create test file
echo "This is a test document about contracts and payments." > test.txt

# Upload
curl -X POST https://api.indieops.ai/api/upload -F "file=@test.txt"

# Wait
sleep 60

# Check status
curl https://api.indieops.ai/api/document-status/test.txt | jq '.indexed'

# Search
curl -X POST https://api.indieops.ai/api/search \
  -H "Content-Type: application/json" \
  -d '{"query": "contract"}' | jq '.results'
```

## Still Failing?

Share these outputs:
1. `curl .../api/document-status/YOUR-FILE | jq '.'`
2. `raindrop logs tail` (last 20 lines)
3. `curl .../api/debug/smartbucket | jq '.'`
