import { Service } from '@liquidmetal-ai/raindrop-framework';
import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { QueueSendOptions, BucketPutOptions, BucketListOptions } from '@liquidmetal-ai/raindrop-framework';
import { Env } from './raindrop.gen';

// Create Hono app with middleware
const app = new Hono<{ Bindings: Env }>();

// Add request logging middleware
app.use('*', logger());

// Health check endpoint
app.get('/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Debug endpoint to test SmartBucket connectivity
app.get('/api/debug/smartbucket', async (c) => {
  try {
    const smartbucket = c.env.DOCUMENTS;
    
    // Test 1: List documents
    const listResult = await smartbucket.list({ limit: 10 });
    
    // Test 2: Try a simple search
    const searchRequestId = `debug-${Date.now()}`;
    let searchResult;
    try {
      searchResult = await smartbucket.search({
        input: 'test',
        requestId: searchRequestId
      });
    } catch (searchError) {
      searchResult = { error: searchError instanceof Error ? searchError.message : 'Unknown error' };
    }

    // Test 3: Try chunk search
    let chunkResult;
    try {
      chunkResult = await smartbucket.chunkSearch({
        input: 'test',
        requestId: `chunk-debug-${Date.now()}`
      });
    } catch (chunkError) {
      chunkResult = { error: chunkError instanceof Error ? chunkError.message : 'Unknown error' };
    }

    return c.json({
      success: true,
      timestamp: new Date().toISOString(),
      tests: {
        list: {
          success: true,
          documentCount: listResult.objects.length,
          documents: listResult.objects.map(obj => ({
            key: obj.key,
            size: obj.size,
            uploaded: obj.uploaded
          }))
        },
        search: {
          success: !('error' in searchResult),
          resultCount: 'results' in searchResult ? searchResult.results?.length || 0 : 0,
          error: 'error' in searchResult ? searchResult.error : undefined
        },
        chunkSearch: {
          success: !('error' in chunkResult),
          resultCount: 'results' in chunkResult ? chunkResult.results?.length || 0 : 0,
          error: 'error' in chunkResult ? chunkResult.error : undefined
        }
      }
    });
  } catch (error) {
    console.error('[DEBUG] Error:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      details: error instanceof Error ? error.stack : undefined
    }, 500);
  }
});

// Upload document to SmartBucket
app.post('/api/upload', async (c) => {
  try {
    const formData = await c.req.formData();
    const file = formData.get('file') as File;
    const description = formData.get('description') as string;

    if (!file) {
      return c.json({ error: 'No file provided' }, 400);
    }

    // Upload to DOCUMENTS SmartBucket
    const smartbucket = c.env.DOCUMENTS;

    const putOptions: BucketPutOptions = {
      httpMetadata: {
        contentType: file.type || 'application/octet-stream',
      },
      customMetadata: {
        originalName: file.name,
        size: file.size.toString(),
        description: description || '',
        uploadedAt: new Date().toISOString()
      }
    };

    // SmartBucket accepts Blob directly - no need to convert
    const result = await smartbucket.put(file.name, file, putOptions);

    return c.json({
      success: true,
      message: 'File uploaded successfully. Document is being processed for search and chat.',
      objectId: result.key,
      size: result.size,
      etag: result.etag,
      uploaded: result.uploaded,
      contentType: result.httpMetadata?.contentType || 'application/octet-stream',
      description: result.customMetadata?.description || ''
    });
  } catch (error) {
    return c.json({
      error: 'Failed to upload file',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

// Get file from SmartBucket
app.get('/api/file/:filename', async (c) => {
  try {
    const filename = c.req.param('filename');

    // Get file from DOCUMENTS SmartBucket
    const smartbucket = c.env.DOCUMENTS;
    const file = await smartbucket.get(filename);

    if (!file) {
      return c.json({ error: 'File not found' }, 404);
    }

    return new Response(file.body, {
      headers: {
        'Content-Type': file.httpMetadata?.contentType || 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'X-Object-Size': file.size.toString(),
        'X-Object-ETag': file.etag,
        'X-Object-Uploaded': file.uploaded.toISOString(),
      }
    });
  } catch (error) {
    return c.json({
      error: 'Failed to retrieve file',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

// Delete document from SmartBucket
app.delete('/api/file/:filename', async (c) => {
  try {
    const filename = c.req.param('filename');

    // Delete from DOCUMENTS SmartBucket
    const smartbucket = c.env.DOCUMENTS;
    await smartbucket.delete(filename);

    return c.json({
      success: true,
      message: 'Document deleted successfully',
      objectId: filename
    });
  } catch (error) {
    return c.json({
      error: 'Failed to delete file',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

// Search SmartBucket documents
app.post('/api/search', async (c) => {
  try {
    const body = await c.req.json();
    const { query, page = 1, pageSize = 15, requestId } = body;

    if (!query) {
      return c.json({ error: 'Query is required' }, 400);
    }

    console.log('[SEARCH] Starting search:', { query, page, pageSize, requestId });

    const smartbucket = c.env.DOCUMENTS;

    // For initial search (page 1 without requestId)
    if (page === 1 && !requestId) {
      const newRequestId = `search-${Date.now()}-${Math.random().toString(36).substring(7)}`;
      console.log('[SEARCH] Initial search with requestId:', newRequestId);
      
      const results = await smartbucket.search({
        input: query,
        requestId: newRequestId
      });

      console.log('[SEARCH] Results:', {
        resultCount: results.results?.length || 0,
        pagination: results.pagination
      });

      return c.json({
        success: true,
        message: 'Search completed',
        query,
        results: results.results || [],
        pagination: {
          ...results.pagination,
          requestId: newRequestId
        }
      });
    } else {
      // For paginated results
      if (!requestId) {
        return c.json({ error: 'Request ID required for pagination' }, 400);
      }

      console.log('[SEARCH] Paginated search:', { requestId, page, pageSize });

      const paginatedResults = await smartbucket.getPaginatedResults({
        requestId,
        page,
        pageSize
      });

      console.log('[SEARCH] Paginated results:', {
        resultCount: paginatedResults.results?.length || 0,
        pagination: paginatedResults.pagination
      });

      return c.json({
        success: true,
        message: 'Paginated results',
        query,
        results: paginatedResults.results || [],
        pagination: paginatedResults.pagination
      });
    }
  } catch (error) {
    console.error('[SEARCH] Error:', error);
    return c.json({
      error: 'Search failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      details: error instanceof Error ? error.stack : undefined
    }, 500);
  }
});

// Chunk search for finding specific sections
app.post('/api/chunk-search', async (c) => {
  try {
    const { query } = await c.req.json();

    if (!query) {
      return c.json({ error: 'Query is required' }, 400);
    }

    const smartbucket = c.env.DOCUMENTS;
    const requestId = `chunk-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    console.log('[CHUNK-SEARCH] Starting:', { query, requestId });

    const results = await smartbucket.chunkSearch({
      input: query,
      requestId
    });

    console.log('[CHUNK-SEARCH] Results:', {
      resultCount: results.results?.length || 0
    });

    return c.json({
      success: true,
      message: 'Chunk search completed',
      query,
      results: results.results || []
    });
  } catch (error) {
    console.error('[CHUNK-SEARCH] Error:', error);
    return c.json({
      error: 'Chunk search failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      details: error instanceof Error ? error.stack : undefined
    }, 500);
  }
});

// Verify document is indexed and ready
app.get('/api/document-status/:objectId', async (c) => {
  try {
    const objectId = c.req.param('objectId');
    const smartbucket = c.env.DOCUMENTS;

    console.log('[STATUS] Checking document:', objectId);

    // Check if file exists
    const metadata = await smartbucket.head(objectId);
    if (!metadata) {
      console.log('[STATUS] Document not found:', objectId);
      return c.json({ error: 'Document not found' }, 404);
    }

    console.log('[STATUS] Document exists:', {
      size: metadata.size,
      uploaded: metadata.uploaded,
      contentType: metadata.httpMetadata?.contentType
    });

    // Try a simple chunk search to see if indexed
    const requestId = `status-${Date.now()}`;
    const testSearch = await smartbucket.chunkSearch({
      input: 'document',
      requestId
    });

    console.log('[STATUS] Test search results:', {
      totalResults: testSearch.results?.length || 0,
      sources: testSearch.results?.map((r: any) => r.source || r.key) || []
    });

    const hasChunks = testSearch.results.some((r: any) => 
      r.source === objectId || r.key === objectId
    );

    const timeSinceUpload = Date.now() - new Date(metadata.uploaded).getTime();
    const secondsSinceUpload = Math.floor(timeSinceUpload / 1000);

    return c.json({
      objectId,
      exists: true,
      size: metadata.size,
      uploaded: metadata.uploaded,
      secondsSinceUpload,
      indexed: hasChunks,
      contentType: metadata.httpMetadata?.contentType,
      message: hasChunks 
        ? 'Document is indexed and ready for chat' 
        : `Document exists but may still be processing. Uploaded ${secondsSinceUpload}s ago. Try again in ${Math.max(0, 60 - secondsSinceUpload)}s.`
    });
  } catch (error) {
    console.error('[STATUS] Error:', error);
    return c.json({
      error: 'Status check failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      details: error instanceof Error ? error.stack : undefined
    }, 500);
  }
});

// Document chat/Q&A - uses SmartBucket's built-in documentChat
app.post('/api/document-chat', async (c) => {
  try {
    const { objectId, query } = await c.req.json();

    if (!objectId || !query) {
      return c.json({ error: 'objectId and query are required' }, 400);
    }

    const smartbucket = c.env.DOCUMENTS;
    const requestId = `chat-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    console.log('[DOCUMENT-CHAT] Starting:', { objectId, query, requestId });

    // First verify document exists
    const metadata = await smartbucket.head(objectId);
    if (!metadata) {
      console.error('[DOCUMENT-CHAT] Document not found:', objectId);
      
      // List all documents to help debug
      const allDocs = await smartbucket.list({ limit: 100 });
      console.log('[DOCUMENT-CHAT] Available documents:', allDocs.objects.map(o => o.key));
      
      return c.json({
        error: 'Document not found',
        message: 'The specified objectId does not exist in the bucket.',
        availableDocuments: allDocs.objects.map(o => o.key)
      }, 404);
    }

    console.log('[DOCUMENT-CHAT] Document exists:', {
      size: metadata.size,
      uploaded: metadata.uploaded,
      contentType: metadata.httpMetadata?.contentType
    });

    // Check if document is indexed by doing a targeted chunk search
    const indexCheckRequestId = `index-check-${Date.now()}`;
    const indexCheck = await smartbucket.chunkSearch({
      input: objectId,
      requestId: indexCheckRequestId
    });

    const isIndexed = indexCheck.results.some((r: any) => 
      r.source === objectId || r.key === objectId
    );

    console.log('[DOCUMENT-CHAT] Index check:', {
      isIndexed,
      chunkCount: indexCheck.results.length,
      sources: indexCheck.results.map((r: any) => r.source || r.key)
    });

    if (!isIndexed) {
      const timeSinceUpload = Date.now() - new Date(metadata.uploaded).getTime();
      const secondsSinceUpload = Math.floor(timeSinceUpload / 1000);
      
      return c.json({
        error: 'Document not yet indexed',
        message: `Document exists but is still being processed. Uploaded ${secondsSinceUpload}s ago.`,
        objectId,
        uploaded: metadata.uploaded,
        secondsSinceUpload,
        hint: 'Wait 30-60 seconds after upload, then try again.'
      }, 425); // 425 Too Early
    }

    // Use SmartBucket's documentChat method
    const response = await smartbucket.documentChat({
      objectId,
      input: query,
      requestId
    });

    console.log('[DOCUMENT-CHAT] Response received:', {
      answerLength: response.answer?.length || 0,
      answer: response.answer?.substring(0, 100)
    });

    return c.json({
      success: true,
      message: 'Document chat completed',
      objectId,
      query,
      answer: response.answer
    });
  } catch (error) {
    console.error('[DOCUMENT-CHAT] Error:', error);
    return c.json({
      error: 'Document chat failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      details: error instanceof Error ? error.stack : undefined,
      hint: 'Document may still be processing. Check /api/document-status/:objectId to verify indexing status.'
    }, 500);
  }
});

// List objects in bucket
app.get('/api/list', async (c) => {
  try {
    const url = new URL(c.req.url);
    const prefix = url.searchParams.get('prefix') || undefined;
    const limit = url.searchParams.get('limit') ? parseInt(url.searchParams.get('limit')!) : undefined;

    const smartbucket = c.env.DOCUMENTS;

    const listOptions: BucketListOptions = {
      prefix,
      limit
    };

    const result = await smartbucket.list(listOptions);

    return c.json({
      success: true,
      objects: result.objects.map(obj => ({
        key: obj.key,
        size: obj.size,
        uploaded: obj.uploaded,
        etag: obj.etag
      })),
      truncated: result.truncated,
      cursor: result.truncated ? result.cursor : undefined
    });
  } catch (error) {
    return c.json({
      error: 'List failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

// Send notification message to queue
app.post('/api/queue/send', async (c) => {
  try {
    const { message, delaySeconds } = await c.req.json();

    if (!message) {
      return c.json({ error: 'message is required' }, 400);
    }

    const queue = c.env.NOTIFICATIONS;

    const sendOptions: QueueSendOptions = {};
    if (delaySeconds) {
      sendOptions.delaySeconds = delaySeconds;
    }

    await queue.send(message, sendOptions);

    return c.json({
      success: true,
      message: 'Message sent to queue'
    });
  } catch (error) {
    return c.json({
      error: 'Queue send failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

export default class extends Service<Env> {
  async fetch(request: Request): Promise<Response> {
    return app.fetch(request, this.env);
  }
}
