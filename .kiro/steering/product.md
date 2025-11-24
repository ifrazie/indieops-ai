# Product Overview

IndieOps AI is a business operations assistant built on the Raindrop platform. It provides AI-powered document processing, client relationship management, and financial insights for independent operators and small businesses.

## Core Features

- **Document Intelligence**: Upload and process contracts, receipts, and invoices with AI-powered search and Q&A
- **Business Advisory**: AI-powered extraction and advisory through the biz-brain service
- **Client Memory**: Stores and retrieves client details and relationship context using SmartMemory
- **Financial Records**: Extracts and stores financial data from documents using SmartSQL
- **Daily Briefing**: Automated daily summaries delivered at 8:00 AM
- **Notification System**: Asynchronous queue-based notification handling

## Architecture

The application uses Raindrop's serverless platform with:
- Public API gateway for file uploads and data ingestion
- Core AI service (biz-brain) for intelligent processing
- SmartBucket for document storage with semantic search
- SmartMemory for contextual client information
- SmartSQL for structured financial data
- Queue-based notification system
- Scheduled daily tasks
