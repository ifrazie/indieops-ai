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
    const arrayBuffer = await file.arrayBuffer();

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

    const result = await smartbucket.put(file.name, new Uint8Array(arrayBuffer), putOptions);

    return c.json({
      success: true,
      message: 'File uploaded successfully. Document is being processed for search and chat.',
      objectId: file.name,
      size: result.size,
      etag: result.etag,
      contentType: file.type || 'application/octet-stream',
      description: description || ''
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
    const { query, page = 1, pageSize = 10, requestId } = body;

    if (!query) {
      return c.json({ error: 'Query is required' }, 400);
    }

    const smartbucket = c.env.DOCUMENTS;

    // For initial search
    if (page === 1) {
      const newRequestId = `search-${Date.now()}-${Math.random().toString(36).substring(7)}`;
      const results = await smartbucket.search({
        input: query,
        requestId: newRequestId
      });

      return c.json({
        success: true,
        message: 'Search completed',
        query,
        results: results.results,
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

      const paginatedResults = await smartbucket.getPaginatedResults({
        requestId,
        page,
        pageSize
      });

      return c.json({
        success: true,
        message: 'Paginated results',
        query,
        results: paginatedResults.results,
        pagination: paginatedResults.pagination
      });
    }
  } catch (error) {
    return c.json({
      error: 'Search failed',
      message: error instanceof Error ? error.message : 'Unknown error'
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

    const results = await smartbucket.chunkSearch({
      input: query,
      requestId
    });

    return c.json({
      success: true,
      message: 'Chunk search completed',
      query,
      results: results.results
    });
  } catch (error) {
    return c.json({
      error: 'Chunk search failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

// Verify document is indexed and ready
app.get('/api/document-status/:objectId', async (c) => {
  try {
    const objectId = c.req.param('objectId');
    const smartbucket = c.env.DOCUMENTS;

    // Check if file exists
    const metadata = await smartbucket.head(objectId);
    if (!metadata) {
      return c.json({ error: 'Document not found' }, 404);
    }

    // Try a simple chunk search to see if indexed
    const requestId = `status-${Date.now()}`;
    const testSearch = await smartbucket.chunkSearch({
      input: 'document',
      requestId
    });

    const hasChunks = testSearch.results.some((r: any) => 
      r.source === objectId || r.key === objectId
    );

    return c.json({
      objectId,
      exists: true,
      size: metadata.size,
      uploaded: metadata.uploaded,
      indexed: hasChunks,
      message: hasChunks 
        ? 'Document is indexed and ready for chat' 
        : 'Document exists but may still be processing. Try again in 30-60 seconds.'
    });
  } catch (error) {
    return c.json({
      error: 'Status check failed',
      message: error instanceof Error ? error.message : 'Unknown error'
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

    // First verify document exists
    const metadata = await smartbucket.head(objectId);
    if (!metadata) {
      return c.json({
        error: 'Document not found',
        message: 'The specified objectId does not exist in the bucket.'
      }, 404);
    }

    // Use SmartBucket's documentChat method
    const response = await smartbucket.documentChat({
      objectId,
      input: query,
      requestId
    });

    return c.json({
      success: true,
      message: 'Document chat completed',
      objectId,
      query,
      answer: response.answer
    });
  } catch (error) {
    return c.json({
      error: 'Document chat failed',
      message: error instanceof Error ? error.message : 'Unknown error',
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
