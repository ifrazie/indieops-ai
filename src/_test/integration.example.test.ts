/**
 * Example integration test showing how to test multiple services together
 */

import { expect, test, describe, beforeEach } from 'vitest';
import { createMockSmartBucket, createMockQueue, createMockAI } from './mocks';

describe('Integration Test Example', () => {
  let mockDocuments: ReturnType<typeof createMockSmartBucket>;
  let mockNotifications: ReturnType<typeof createMockQueue>;
  let mockAI: ReturnType<typeof createMockAI>;

  beforeEach(() => {
    mockDocuments = createMockSmartBucket();
    mockNotifications = createMockQueue();
    mockAI = createMockAI();
  });

  test('should upload document and trigger notification', async () => {
    // Simulate document upload
    const uploadResult = await mockDocuments.put('invoice.pdf', {
      type: 'invoice',
      amount: 1500,
    });

    expect(uploadResult.key).toBe('invoice.pdf');

    // Simulate notification being queued
    await mockNotifications.send({
      type: 'document_uploaded',
      documentKey: uploadResult.key,
    });

    // Verify notification was queued
    const messages = mockNotifications._getMessages();
    expect(messages).toHaveLength(1);
    expect(messages[0].type).toBe('document_uploaded');
  });

  test('should search documents and get AI response', async () => {
    // Upload some test documents
    await mockDocuments.put('doc1.pdf', { content: 'Contract terms' });
    await mockDocuments.put('doc2.pdf', { content: 'Invoice details' });

    // Search for documents
    const searchResults = await mockDocuments.search({
      input: 'contract',
      requestId: 'test-req-1',
    });

    expect(searchResults.results).toHaveLength(1);

    // Get AI analysis
    const aiResponse = await mockAI.run('gpt-oss-20b', {
      messages: [{ role: 'user', content: 'Analyze this contract' }],
    });

    expect(aiResponse.choices?.[0]?.message?.content).toBeDefined();
  });
});
