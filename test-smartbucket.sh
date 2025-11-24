#!/bin/bash

# SmartBucket Testing Script
# Run this after deploying to test SmartBucket functionality

API_URL="${1:-https://api.indieops.ai}"

echo "🔍 Testing SmartBucket at: $API_URL"
echo ""

# Test 1: Health check
echo "1️⃣  Health Check"
curl -s "$API_URL/health" | jq '.'
echo ""

# Test 2: Debug endpoint
echo "2️⃣  SmartBucket Debug Info"
curl -s "$API_URL/api/debug/smartbucket" | jq '.'
echo ""

# Test 3: List documents
echo "3️⃣  List Documents"
curl -s "$API_URL/api/list" | jq '.'
echo ""

# Test 4: Search (if documents exist)
echo "4️⃣  Test Search"
curl -s -X POST "$API_URL/api/search" \
  -H "Content-Type: application/json" \
  -d '{"query": "test"}' | jq '.'
echo ""

# Test 5: Chunk search
echo "5️⃣  Test Chunk Search"
curl -s -X POST "$API_URL/api/chunk-search" \
  -H "Content-Type: application/json" \
  -d '{"query": "test"}' | jq '.'
echo ""

echo "✅ Tests complete!"
echo ""
echo "To upload a test document:"
echo "  curl -X POST $API_URL/api/upload -F 'file=@test.pdf' -F 'description=Test document'"
echo ""
echo "To check document status:"
echo "  curl $API_URL/api/document-status/test.pdf | jq '.'"
echo ""
echo "To test document chat:"
echo "  curl -X POST $API_URL/api/document-chat -H 'Content-Type: application/json' -d '{\"objectId\": \"test.pdf\", \"query\": \"What is this about?\"}' | jq '.'"
