# Product Overview

IndieOps AI is a LiquidMetal AI application built on the Raindrop framework. It provides an intelligent business operations assistant that processes documents, manages client relationships, and delivers daily financial insights.

## Core Features

- **Document Processing**: Handles contracts, receipts, and invoices via SmartBucket storage
- **Client Memory**: Maintains relationship context using SmartMemory
- **Financial Intelligence**: Extracts and queries financial records with SmartSQL
- **Notification System**: Asynchronous queue-based notification delivery
- **API Gateway**: Public endpoint for data ingestion and file uploads
- **Business Brain**: Core extraction and advisory service with AI capabilities
- **Daily Brief**: Automated daily reports delivered at 8:00 AM

## Architecture

The application uses a microservices architecture with:
- HTTP services for API endpoints
- Queue-based observers for async processing
- Scheduled tasks for recurring operations
- AI-powered storage and memory systems
