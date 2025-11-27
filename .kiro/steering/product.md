---
inclusion: always
---

# IndieOps AI

IndieOps AI is a business operations assistant built on the Raindrop platform. It provides AI-powered document management, client relationship tracking, and financial insights for independent operators.

## Core Features

- **Document Management** - Upload, search, and chat with business documents (contracts, receipts, invoices) using semantic search
- **AI Advisory** - Natural language business intelligence through the BizBrain service
- **Client Memory** - Persistent relationship context and history tracking
- **Financial Records** - Automated extraction and storage of financial data from documents
- **Notifications** - Asynchronous queue-based notification system
- **Daily Briefs** - Scheduled daily summaries and insights

## Architecture

The application uses Raindrop's serverless primitives:
- **SmartBucket** for RAG-enabled document storage
- **SmartMemory** for vector-based client context
- **SmartSQL** for structured financial data
- **Queue** for async notifications
- **Services** for HTTP endpoints
- **Tasks** for scheduled operations
