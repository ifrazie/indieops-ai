SmartBuckets is Raindrop’s RAG-in-a-box building block. Any time you need RAG in your Raindrop app, you should use SmartBuckets. It provides multi-modal indexing capabilities that automatically process uploaded content for AI-powered search and retrieval.

SmartBuckets extends standard Bucket functionality with semantic search methods. All standard bucket operations work identically while adding search(), chunkSearch(), documentChat(), and getPaginatedResults() methods. Files uploaded to SmartBuckets become immediately searchable through natural language queries without requiring manual preprocessing or separate search infrastructure.

The system automatically extracts text from documents and images from PDFs to create searchable indexes. This enables semantic search across stored files, making SmartBuckets ideal for document management systems, knowledge bases, and applications requiring content discovery. Multi-modal indexing means SmartBuckets can process various file types including extracting and indexing images from PDFs for comprehensive search operations.

## Creating SmartBuckets

Define SmartBuckets in your application manifest. SmartBucket names must be unique within your application and follow kebab-case conventions.

```
application "demo-app" {

    smartbucket "demo-sb" {}

}
```

## Accessing SmartBuckets

SmartBuckets are accessed through environment bindings. The SmartBucket name from your manifest becomes an uppercase environment variable with underscores replacing dashes.

```
// Access SmartBucket via environment binding

const results = await this.env.DEMO_SB.search({

  input: "search query",

  requestId: "req-1"

});
```

## Core Concepts

### Main Interfaces

- `SmartBucket` \- Extends Bucket with AI search capabilities
- `SearchInput`, `SearchOutput` \- Semantic search operations
- `RagSearchInput`, `RagSearchOutput` \- Chunk-based RAG search
- `DocumentChatInput`, `DocumentChatOutput` \- Document Q&A
- `GetPaginatedResultsInput`, `GetPaginatedResultsOutput` \- Result pagination
- `BucketObject` \- Metadata returned from storage operations
- `BucketObjectBody` \- Object with content body and read methods
- `BucketPutOptions` \- Options for put operations
- `BucketGetOptions` \- Options for get operations
- `BucketListOptions` \- Options for list operations

### SearchResult

Search operations return results with relevance scores and extracted content. Each result includes text content, source reference, and semantic similarity score.

```
interface SearchResult {

  chunkSignature?: string;    // Unique chunk identifier

  text?: string;              // Extracted text content

  source?: string;            // Source file reference

  payloadSignature?: string;  // Content payload identifier

  score?: number;             // Relevance score (0-1)

  embed?: Float32Array;       // Vector embedding data

  type?: string;              // Content type classification

}
```

### PaginationInfo

Search methods return pagination details for navigating large result sets. Pagination enables efficient browsing through multiple pages of search results.

```
interface PaginationInfo {

  total: number;        // Total results available

  page: number;         // Current page number

  pageSize: number;     // Results per page

  totalPages: number;   // Total pages available

  hasMore: boolean;     // More results available

}
```

### BucketObject

Standard bucket operations return metadata about stored objects. This interface provides details about object version, size, checksums, and custom metadata.

```
interface BucketObject {

  key: string;                            // Object key

  version: string;                        // Version identifier

  size: number;                           // Object size in bytes

  etag: string;                           // Entity tag

  httpEtag: string;                       // HTTP entity tag

  checksums: BucketChecksums;             // Object checksums

  uploaded: Date;                         // Upload timestamp

  httpMetadata?: BucketHTTPMetadata;      // HTTP metadata

  customMetadata?: Record<string, string>; // Custom metadata

  storageClass?: string;                  // Storage class

}
```

## put

Stores an object in the SmartBucket with automatic indexing.

- [Input](https://docs.liquidmetal.ai/reference/smartbucket/#tab-panel-103)
- [Options](https://docs.liquidmetal.ai/reference/smartbucket/#tab-panel-104)
- [Output](https://docs.liquidmetal.ai/reference/smartbucket/#tab-panel-105)

```
put(

  key: string,

  value: ReadableStream | ArrayBuffer | ArrayBufferView | string | null | Blob,

  options?: BucketPutOptions

): Promise<BucketObject>
```

```
interface BucketPutOptions {

  httpMetadata?: BucketHTTPMetadata | Headers;

  customMetadata?: Record<string, string>;

  md5?: ArrayBuffer | string;

  sha1?: ArrayBuffer | string;

  sha256?: ArrayBuffer | string;

  sha384?: ArrayBuffer | string;

  sha512?: ArrayBuffer | string;

  storageClass?: string;

}

interface BucketHTTPMetadata {

  contentType?: string;

  contentLanguage?: string;

  contentDisposition?: string;

  contentEncoding?: string;

  cacheControl?: string;

  cacheExpiry?: Date;

}
```

```
interface BucketObject {

  key: string;

  version: string;

  size: number;

  etag: string;

  httpEtag: string;

  checksums: BucketChecksums;

  uploaded: Date;

  httpMetadata?: BucketHTTPMetadata;

  customMetadata?: Record<string, string>;

  storageClass?: string;

}
```

Supported content types: `image/png`, `image/jpeg`, `audio/webm`, `audio/mpeg`, `audio/wav`, `audio/mp4`, `application/pdf`, `text/plain`.

### Example

```
// Upload file with metadata

const result = await this.env.DEMO_SB.put(

  "documents/report.pdf",

  fileContent,

  {

    httpMetadata: {

      contentType: "application/pdf",

      cacheControl: "public, max-age=3600"

    },

    customMetadata: {

      author: "Jane Smith",

      department: "Research"

    }

  }

);

console.log(`Uploaded: ${result.key} (${result.size} bytes)`);
```

## get

Retrieves an object from the SmartBucket.

- [Input](https://docs.liquidmetal.ai/reference/smartbucket/#tab-panel-106)
- [Options](https://docs.liquidmetal.ai/reference/smartbucket/#tab-panel-107)
- [Output](https://docs.liquidmetal.ai/reference/smartbucket/#tab-panel-108)

```
get(

  key: string,

  options?: BucketGetOptions

): Promise<BucketObjectBody | null>
```

```
interface BucketGetOptions {

  range?: BucketRange | Headers;

}

interface BucketRange {

  offset?: number;    // Starting byte offset

  length?: number;    // Number of bytes to read

  suffix?: number;    // Read last N bytes

}
```

```
interface BucketObjectBody extends BucketObject {

  body: ReadableStream;

  bodyUsed: boolean;

  arrayBuffer(): Promise<ArrayBuffer>;

  text(): Promise<string>;

  json<T = unknown>(): Promise<T>;

  blob(): Promise<Blob>;

}
```

### Example

```
// Retrieve and read object content

const object = await this.env.DEMO_SB.get("documents/report.pdf");

if (object) {

  const text = await object.text();

  console.log(`Retrieved: ${object.key}`);

  console.log(`Content: ${text.substring(0, 100)}...`);

}
```

## head

Retrieves object metadata without downloading content.

- [Input](https://docs.liquidmetal.ai/reference/smartbucket/#tab-panel-109)
- [Output](https://docs.liquidmetal.ai/reference/smartbucket/#tab-panel-110)

```
head(key: string): Promise<BucketObject | null>
```

```
interface BucketObject {

  key: string;

  version: string;

  size: number;

  etag: string;

  httpEtag: string;

  checksums: BucketChecksums;

  uploaded: Date;

  httpMetadata?: BucketHTTPMetadata;

  customMetadata?: Record<string, string>;

  storageClass?: string;

}
```

### Example

```
// Get metadata only

const metadata = await this.env.DEMO_SB.head("documents/report.pdf");

if (metadata) {

  console.log(`Size: ${metadata.size} bytes`);

  console.log(`Uploaded: ${metadata.uploaded}`);

  console.log(`Author: ${metadata.customMetadata?.author}`);

}
```

## delete

Deletes one or more objects from the SmartBucket.

- [Input](https://docs.liquidmetal.ai/reference/smartbucket/#tab-panel-102)

```
delete(keys: string | string[]): Promise<void>
```

### Example

```
// Delete single object

await this.env.DEMO_SB.delete("documents/old-report.pdf");

// Delete multiple objects

await this.env.DEMO_SB.delete([\
\
  "documents/draft-1.pdf",\
\
  "documents/draft-2.pdf"\
\
]);
```

## list

Lists objects in the SmartBucket with optional filtering.

- [Input](https://docs.liquidmetal.ai/reference/smartbucket/#tab-panel-111)
- [Options](https://docs.liquidmetal.ai/reference/smartbucket/#tab-panel-112)
- [Output](https://docs.liquidmetal.ai/reference/smartbucket/#tab-panel-113)

```
list(options?: BucketListOptions): Promise<BucketObjects>
```

```
interface BucketListOptions {

  limit?: number;      // Max results (default: 100, max: 250)

  prefix?: string;     // Filter by key prefix

  cursor?: string;     // Pagination token

  delimiter?: string;  // Delimiter for hierarchy (default: '/')

  startAfter?: string; // Start after this key

}
```

```
interface BucketObjects {

  objects: BucketObject[];        // Matching objects

  delimitedPrefixes: string[];    // Common prefixes

  truncated: boolean;             // More results available

  cursor?: string;                // Pagination token

}
```

### Example

```
// List all PDF documents

const result = await this.env.DEMO_SB.list({

  prefix: "documents/",

  limit: 50

});

result.objects.forEach(obj => {

  console.log(`${obj.key} (${obj.size} bytes)`);

});

// Handle pagination

if (result.truncated) {

  const nextPage = await this.env.DEMO_SB.list({

    prefix: "documents/",

    cursor: result.cursor

  });

}
```

## search

Performs semantic search across all bucket content using natural language queries. The `requestId` parameter defaults to a generated ULID if not provided. The `partition` parameter defaults to `'default'`.

- [Input](https://docs.liquidmetal.ai/reference/smartbucket/#tab-panel-114)
- [Output](https://docs.liquidmetal.ai/reference/smartbucket/#tab-panel-115)

```
interface SearchInput {

  input: string;        // Natural language search query

  requestId?: string;   // Request tracking ID (defaults to generated ULID)

  partition?: string;   // Data partition filter (defaults to 'default')

}
```

```
interface SearchOutput {

  results: SearchResult[];      // Ranked search matches

  pagination: PaginationInfo;   // Pagination details

}
```

### Example

```
// Search for relevant documents

const results = await this.env.DEMO_SB.search({

  input: "climate change research",

  requestId: "search-001"

});

// Process search results

results.results.forEach(result => {

  console.log(`Found: ${result.source} (score: ${result.score})`);

});
```

## chunkSearch

Returns specific text chunks from documents for RAG applications. The `requestId` parameter defaults to a generated ULID if not provided. The `partition` parameter defaults to `'default'`.

- [Input](https://docs.liquidmetal.ai/reference/smartbucket/#tab-panel-116)
- [Output](https://docs.liquidmetal.ai/reference/smartbucket/#tab-panel-117)

```
interface RagSearchInput {

  input: string;        // Search query for chunks

  requestId?: string;   // Request ID (defaults to generated ULID)

  partition?: string;   // Partition filter (defaults to 'default')

}
```

```
interface RagSearchOutput {

  results: SearchResult[];  // Relevant text chunks

}
```

### Example

```
// Get relevant chunks for context

const chunks = await this.env.DEMO_SB.chunkSearch({

  input: "renewable energy costs",

  requestId: "chunk-001"

});

// Use chunks as context

const context = chunks.results

  .map(chunk => chunk.text)

  .join('\n');
```

## documentChat

Generates answers to questions about specific document content using AI.

- [Input](https://docs.liquidmetal.ai/reference/smartbucket/#tab-panel-118)
- [Output](https://docs.liquidmetal.ai/reference/smartbucket/#tab-panel-119)

```
interface DocumentChatInput {

  objectId: string;     // Target document ID

  input: string;        // Question or prompt

  requestId: string;    // Request tracking ID

  partition?: string;   // Optional partition filter

}
```

```
interface DocumentChatOutput {

  answer: string;       // Generated response

}
```

### Example

```
// Ask question about document

const answer = await this.env.DEMO_SB.documentChat({

  objectId: "report.pdf",

  input: "What are the main findings?",

  requestId: "chat-001"

});

// Display generated answer

console.log(answer.answer);
```

## getPaginatedResults

Retrieves additional pages from previous search operations. The `page` parameter defaults to `1`, `pageSize` defaults to `15`, and `partition` defaults to `'default'`.

- [Input](https://docs.liquidmetal.ai/reference/smartbucket/#tab-panel-120)
- [Output](https://docs.liquidmetal.ai/reference/smartbucket/#tab-panel-121)

```
interface GetPaginatedResultsInput {

  requestId: string;    // Previous search request ID

  page?: number;        // Target page number (defaults to 1)

  pageSize?: number;    // Results per page (defaults to 15)

  partition?: string;   // Partition filter (defaults to 'default')

}
```

```
interface GetPaginatedResultsOutput {

  results: SearchResult[];      // Page results

  pagination: PaginationInfo;   // Updated pagination

}
```

### Example

```
// Get next page of results

const nextPage = await this.env.DEMO_SB.getPaginatedResults({

  requestId: "search-001",

  page: 2,

  pageSize: 20

});

// Check pagination status

console.log(`Page ${nextPage.pagination.page} of ${nextPage.pagination.totalPages}`);
```
