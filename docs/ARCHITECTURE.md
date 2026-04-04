# System Architecture
## DocMind AI Technical Deep-Dive

---

## High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        USER INTERFACES                      │
│  (Next.js Dashboard, Web App, Mobile Web)                   │
└────────────────────────┬────────────────────────────────────┘
                         │ (HTTPS + WebSocket)
┌────────────────────────▼────────────────────────────────────┐
│                    API GATEWAY LAYER                        │
│         (FastAPI + Rate Limiting + Authentication)          │
└────────────────────────┬────────────────────────────────────┘
                         │
         ┌───────────────┼───────────────┐
         │               │               │
┌────────▼────┐  ┌───────▼────┐  ┌─────▼───────┐
│Ingestion    │  │Chat/Query  │  │Retrieval    │
│Engine       │  │Engine      │  │Engine       │
│             │  │            │  │             │
│• LlamaParse │  │• RAG       │  │• Dense Sem. │
│• Gemini     │  │• NLI Check │  │• Sparse BM25│
│• ViT        │  │• LLM Gen.  │  │• Hybrid Rank
└────┬────────┘  └───────┬────┘  └─────┬───────┘
     │                   │              │
     └───────────────────┼──────────────┘
                         │
        ┌────────────────┼────────────────┐
        │                │                │
   ┌────▼───┐   ┌────────▼────────┐  ┌───▼────┐
   │Supabase│   │Redis Cache      │  │External│
   │pgvector│   │                 │  │APIs    │
   │(VDB)   │   │• Hot queries    │  │        │
   │        │   │• Embedding cache│  │•OpenAI │
   │• Chunks│   │• Session data   │  │•Groq   │
   │• Embeds│   └─────────────────┘  │•Gemini │
   └────────┘                        └────────┘
```

---

## System Components Detail

### 1. **Ingestion Engine**

#### Input Handling
```
Document Upload
    ↓
File Validation (type, size, virus scan)
    ↓
Store Raw File (AWS S3 / Local Storage)
    ↓
Content Extraction (depends on type)
```

#### Document Type Processing

**PDFs/DOCX:**
```
LlamaParse API
    ↓
Preserve table structure & OCR accuracy
    ↓
Text extraction with coordinates
    ↓
Chunk extraction (512 tokens, 128 overlap)
```

**Videos:**
```
FFmpeg Frame Extraction (every 5 seconds)
    ↓
Vision Transformer (ViT-Base) → Image embeddings
    ↓
LLM Captioning (Gemini Flash) → Semantic text
    ↓
Combine visual + text embeddings
```

**CSV/Structured:**
```
Pandas DataFrame Loading
    ↓
Row-level + Aggregated summaries
    ↓
Chunk as: "Row X: {col1=val1, col2=val2}"
```

#### Chunk Metadata Tagging
```python
chunk = {
    "id": "uuid",
    "source_file": "DBMS_Notes.pdf",
    "page": 4,
    "chunk_type": "Definition",  # Classifier: DeBERTa
    "text": "ACID is...",
    "dense_embedding": [...1536],  # OpenAI embed
    "sparse_vector": {...},  # BM25 terms
    "timestamp": "2026-04-04T00:00:00Z"
}
```

#### Classification Model (DeBERTa-v3)
```
Input chunk text
    ↓
DeBERTa-v3 classifier (4 labels: Definition, Statistic, Formula, General)
    ↓
chunk_type = argmax(output_logits)
    ↓
Use for query-type specific retrieval
```

---

### 2. **Retrieval Engine**

#### Dense Search (Semantic)
```
Query Input
    ↓
OpenAI text-embedding-3-large
    ↓
1536-dimensional embedding
    ↓
PgVector IVFFLAT index (cosine similarity)
    ↓
Top-10 results by similarity score
```

**Performance:**
- Latency: ~300ms (including API call)
- Index size: 1.5GB per 100k vectors
- Query throughput: 1000 QPS

#### Sparse Search (BM25)
```
Query Input
    ↓
Tokenization (lowercasing, punctuation removal)
    ↓
BM25 ranking algorithm
    ↓
Top-10 results by BM25 score
```

**Formula:**
```
BM25(D, Q) = Σ IDF(qi) * (f(qi, D) * (k1 + 1)) /
             (f(qi, D) + k1 * (1 - b + b * |D| / avgdl))
```

**where:**
- IDF = inverse document frequency
- f(qi, D) = term frequency in document D
- k1, b = tuning parameters (typically k1=1.5, b=0.75)

#### Hybrid Ranking
```
Dense Results    Sparse Results
    ↓               ↓
Normalize       Normalize
  [0,1]           [0,1]
    ↓               ↓
    └─────┬─────┘
         ↓
  Hybrid Score = 0.6 * dense + 0.4 * sparse
         ↓
  Top-5 by hybrid score
         ↓
  Return with all three scores
```

---

### 3. **RAG Pipeline**

#### Flow Diagram
```
User Query
    ↓
[1] RETRIEVE: Hybrid search → top-5 chunks
    ↓
[2] AUGMENT: Build context prompt with chunks
    ↓
[3] GENERATE: LLM generates response (GPT-4)
    ↓
[4] VALIDATE: NLI Critic checks entailment
    ↓
[5] RESPOND: Return answer + sources + confidence
```

#### Prompting Strategy
```
System Prompt:
"You are DocMind, a document intelligence assistant.
 CRITICAL: Only use the provided context.
 If info not in context, explicitly say so.
 Always cite sources."

User Context:
[Retrieved chunks concatenated]

User Query:
"What is ACID?"
```

#### Response Generation
```python
response = openai.ChatCompletion.create(
    model="gpt-4",
    temperature=0.2,  # Low for factuality
    max_tokens=1024,
    messages=[
        {role: "system", content: system_prompt},
        {role: "user", content: augmented_prompt}
    ]
)
```

---

### 4. **NLI Critic Agent (Hallucination Shield)**

#### Natural Language Inference Logic
```
Premise (Retrieved Chunks)
    │
    ├─ "ACID has four properties..."
    └─ "Atomicity ensures all-or-nothing..."
    ↓
Hypothesis (Generated Response)
    │
    └─ "ACID is an acronym for Atomicity, Consistency, Isolation, Durability"
    ↓
DeBERTa-v3-large NLI Model
    ↓
Output Distribution:
    Entailment: 0.92
    Neutral: 0.05
    Contradiction: 0.03
    ↓
Decision:
    If Entailment > 0.7:
        ✅ VALID: Display with confidence_score = 0.92
    Else:
        ❌ UNVERIFIED: Flag or regenerate
```

#### Entailment Explained
- **Entailment (0.92):** Response logically follows from premises
- **Neutral (0.05):** Response unrelated to premises
- **Contradiction (0.03):** Response contradicts premises

---

### 5. **Feature Engines**

#### Exam Lens
```
Input: Document chunks

[1] Concept Extraction
    LLM: "Extract main concepts from chunks"
    Output: [(concept, definition), ...]

[2] Question Generation
    For each (concept, definition):
        Prompt: "Generate clear MCQ stem"
        Output: Question text

[3] Option Generation
    Correct Option: "Generate answer based on definition"
    Distractors: "Generate 3 plausible wrong answers from other chunks"

[4] Shuffle & Return
    options = shuffle([correct, distractor1, distractor2, distractor3])
    correct_index = find(correct in shuffled_options)
```

**Pedagogical Value:**
- Distractors are from the same document (contextually plausible)
- Tests understanding, not just recall
- Difficulty levels (easy/medium/hard)

#### Disagreement Detector
```
Input: Multiple documents

[1] Entity Extraction
    NER: Extract PERSON, ORG, DATE, MONEY, etc.
    Regex: Extract dates (2026-02-12), currency ($2M), percentages (45%)

[2] Value Normalization
    normalize_date("Feb 12, 2026") → "2026-02-12"
    normalize_currency("$2M") → 2000000
    normalize_name("Robert") == "Rob"? (fuzzy match)

[3] Cross-Document Comparison
    For each entity E:
        values = [value from doc1, value from doc2, ...]
        unique_values = set(values)
        if len(unique_values) > 1:
            FLAG CONFLICT

[4] Report Generation
    conflicts = [
        {
            entity: "Start Date",
            occurrences: [
                {doc: "Contract.pdf", value: "Feb 12"},
                {doc: "Amendment.pdf", value: "Mar 12"}
            ],
            confidence: 95%
        }
    ]
```

---

## Data Flow Diagrams

### Document Upload Flow
```
┌─────────────┐
│   Frontend  │─ (POST /api/documents/upload)
└──────┬──────┘
       │ [FormData: files]
       ↓
┌──────────────────┐
│  Upload Endpoint │
└──────┬───────────┘
       │
       ├─→ Validate files
       ├─→ Store in S3
       ├─→ Return upload_id
       └─→ Queue ingestion job
               │
               ↓
       ┌──────────────────┐
       │  Ingestion Job   │
       └──────┬───────────┘
              │
              ├─→ Extract chunks
              ├─→ Generate embeddings (OpenAI)
              ├─→ Classify chunks (DeBERTa)
              ├─→ Store in pgvector
              ├─→ Index in Redis
              └─→ Send completion webhook
                      │
                      ↓
              ┌──────────────────┐
              │   Frontend       │
              │  (WebSocket)     │
              │  "Indexing done" │
              └──────────────────┘
```

### Query Flow
```
┌──────────────┐
│  User Query  │─ "What is ACID?"
└──────┬───────┘
       │
       ↓
┌──────────────────────┐
│ Hybrid Search        │
├──────────────────────┤
│ • Dense (semantic)   │
│ • Sparse (keyword)   │
│ • Hybrid ranking     │
└──────┬───────────────┘
       │ [Top-5 chunks]
       ↓
┌──────────────────────┐
│  Prompt Augmentation │
│  + Context Injection │
└──────┬───────────────┘
       │
       ↓
┌──────────────────────┐
│  LLM Generation      │
│  (OpenAI GPT-4)      │
└──────┬───────────────┘
       │ [Raw response]
       ↓
┌──────────────────────┐
│  NLI Validation      │
│  (DeBERTa-v3 NLI)    │
└──────┬───────────────┘
       │ [Entailment score]
       ↓
┌──────────────────────┐
│  Response Assembly   │
│  • answer            │
│  • source_map        │
│  • confidence_score  │
│  • nli_scores        │
└──────┬───────────────┘
       │
       ↓
┌──────────────────────┐
│   User Response      │
│  (JSON + WebSocket)  │
└──────────────────────┘
```

---

## Database Schema

### Core Tables

**documents**
```sql
CREATE TABLE documents (
  id UUID PRIMARY KEY,
  workspace_id UUID,
  filename VARCHAR,
  file_type ENUM,
  raw_content_url VARCHAR,
  chunks_count INT,
  indexed_at TIMESTAMP,
  status VARCHAR  -- processing, ready, failed
);
```

**chunks**
```sql
CREATE TABLE chunks (
  id UUID PRIMARY KEY,
  document_id UUID,
  chunk_index INT,
  chunk_type VARCHAR,  -- Definition, Stat, Formula
  text TEXT,
  dense_embedding vector(1536),  -- pgvector type!
  sparse_vector JSONB,  -- BM25 inverted index
  page_number INT,
  source_metadata JSONB,
  created_at TIMESTAMP,

  INDEX dense_idx USING ivfflat (dense_embedding),
  FOREIGN KEY (document_id) REFERENCES documents(id)
);
```

**conversations**
```sql
CREATE TABLE conversations (
  id UUID PRIMARY KEY,
  workspace_id UUID,
  user_id UUID,
  title VARCHAR,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

**messages**
```sql
CREATE TABLE messages (
  id UUID PRIMARY KEY,
  conversation_id UUID,
  role ENUM,  -- user, assistant
  content TEXT,
  source_map JSONB,
  nli_scores JSONB,  -- {entailment, neutral, contradiction}
  confidence_score DECIMAL,
  created_at TIMESTAMP,

  FOREIGN KEY (conversation_id) REFERENCES conversations(id)
);
```

---

## Performance Specifications

### Latency Budget (3-second Query)
```
Query Processing Time Budget: 3000ms
├── Hybrid search: 500ms
│   ├── Dense search: 300ms
│   ├── Sparse search: 50ms
│   └── Ranking: 150ms
├── LLM generation: 1500ms (depends on token count)
├── NLI validation: 800ms
├── Response assembly: 200ms
└── Buffer: 0ms
```

### Vector Database Optimization
```
Index Type: IVFFLAT
├── lists: 100
├── probes: 10
└── candidates: 100

Query Performance:
├── <100k vectors: <100ms
├── <1M vectors: <300ms
└── <10M vectors: <500ms

Index Maintenance:
├── Weekly reindex: 2 hours
├── Incremental vacuum: nightly
└── Statistics update: daily
```

### Caching Strategy
```
Redis Cache Layers:
├── L1: Hot query embeddings (24h TTL)
├── L2: Chunk embeddings (30d TTL)
├── L3: LLM responses (7d TTL)
└── L4: Session data (1h TTL)

Hit Rate Target: >70%
Memory Limit: 4GB (Redis)
Eviction Policy: LRU
```

---

## Scaling Strategy

### Horizontal Scaling
```
Load Distribution:
┌─────────────┐
│Load Balancer│
└──────┬──────┘
       ├─→ API Server 1
       ├─→ API Server 2
       ├─→ API Server 3
       └─→ API Server N

Database:
├─→ Primary (Writes)
└─→ Replicas (Reads, N replicas)

Vector DB:
├─→ Sharded by document collection
└─→ Replication factor: 3
```

### Vertical Scaling
```
Current Resources:
├── API: 4 CPU, 8GB RAM
├── Vector DB: 8 CPU, 32GB RAM
├── Redis: 2 CPU, 4GB RAM
└── LLM APIs: Serverless (auto-scaling)

Scaling Triggers:
├── CPU > 80% for 5min → +1 instance
├── Memory > 85% → +2GB
├── Latency > 3s P95 → +load balancer
└── QPS > 1000 → add vector DB replica
```

---

## Security & Compliance

### Data Privacy
```
Document Handling:
├── Encryption at rest (AES-256)
├── Encryption in transit (TLS 1.3)
├── Document isolation by workspace
├── No document content in logs
└── GDPR: Right to delete implemented

API Security:
├── API key rotation (monthly)
├── Rate limiting: 100 req/min per user
├── CORS: Whitelist origin domains
└── CSRF protection: Token validation
```

### Audit & Monitoring
```
Logging:
├── All API requests (JSON format)
├── LLM prompt/response sampling (5%)
├── Vector search metrics
├── NLI validation results
└── Error stack traces

Monitoring Dashboards:
├── Query latency (P50, P95, P99)
├── Vector search hit rate
├── LLM API costs (daily)
├── System uptime (24/7)
└── Error rates by endpoint
```

---

**Architecture Version:** 1.0
**Last Updated:** 2026-04-04
**Status:** Production-Ready for ECLIPSE 6.0
