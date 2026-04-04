# Comprehensive Requirements Document (CRD)
## DocMind AI: Technical & Functional Specifications

---

## 1. Functional Requirements

### FR-1: Document Upload & Ingestion Pipeline

#### FR-1.1 Multi-Format Support
```
INPUT: PDF, DOCX, MP4, CSV, TXT
PROCESSING:
  - PDF/DOCX → LlamaParse (table-accurate extraction)
  - MP4 → Gemini Flash (keyframe extraction every 5 seconds)
  - CSV → Pandas (structured → semantic chunks)
OUTPUT: Vectorized chunks in Supabase
```

#### FR-1.2 Chunk Strategy
- **PDF/DOCX:** Sliding window, 512-token chunks with 128-token overlap
- **Video:** 5-second keyframe → image → ViT embedding → semantic description
- **CSV:** Row-based + aggregated summaries

#### FR-1.3 Metadata Tagging
```python
chunk = {
  "id": "uuid",
  "source_file": "DBMS_Notes.pdf",
  "page": 4,
  "chunk_type": "Definition",  # or "Stat", "Statute", "Formula"
  "text": "...",
  "dense_embedding": [...1536],  # OpenAI embedding
  "sparse_vector": {...},  # BM25 terms
  "timestamp": "2026-04-04T00:00:00Z"
}
```

---

### FR-2: Hybrid Search Engine

#### FR-2.1 Dense Search (Semantic)
- **Encoder:** OpenAI `text-embedding-3-large` (1536 dims)
- **Storage:** Supabase pgvector
- **Query:** User question → embedding → cosine similarity (top-k=10)
- **Use Case:** "Explain normalization" finds semantic equivalents

#### FR-2.2 Sparse Search (Keyword BM25)
- **Library:** `rank_bm25` Python library
- **Storage:** Inverted index in Supabase JSON field
- **Query:** Exact keyword/date/entity matching
- **Use Case:** "Find all revenue figures from 2026" gets exact hits

#### FR-2.3 Hybrid Ranking
```python
# Pseudo-code
def hybrid_search(query: str, alpha=0.6):
    dense_results = semantic_search(query, k=10)
    sparse_results = bm25_search(query, k=10)

    # Normalize scores to [0, 1]
    dense_scores = normalize_cosine_sims(dense_results)
    sparse_scores = normalize_bm25(sparse_results)

    hybrid_score = alpha * dense_scores + (1 - alpha) * sparse_scores
    return sorted_by_hybrid_score(hybrid_score, k=5)
```

---

### FR-3: Chat with Documents (RAG Pipeline)

#### FR-3.1 Retrieval
1. User question → Hybrid search (FR-2)
2. Retrieve top-5 relevant chunks with source_map

#### FR-3.2 Augmented Generation
```
PROMPT_TEMPLATE = """
You are DocMind, a trustworthy document assistant.
Use ONLY the provided context. Do NOT generate information outside of it.

CONTEXT:
{retrieved_chunks}

QUESTION: {user_question}

ANSWER:
- Ground every claim in the context
- Cite sources: "From [Page X, Document.pdf]"
- If unsure, say "This information is not in the provided documents."
"""
```

#### FR-3.3 Response Format
```json
{
  "answer": "ACID has four properties...",
  "source_map": [
    {
      "chunk_id": "uuid-1",
      "file": "DBMS_Notes.pdf",
      "page": 4,
      "snippet": "ACID is an acronym for..."
    }
  ],
  "confidence_score": 0.92,
  "conversation_id": "conv-uuid"
}
```

---

### FR-4: NLI Critic Agent (Hallucination Shield)

#### FR-4.1 Critic Workflow
```
INPUT: (Premise: retrieved_chunks, Hypothesis: generated_response)
↓
NLI Model: "Does the answer entail from the chunks?"
↓
SCORES:
  - Entailment: 0.92 → ✅ Answer is valid
  - Neutral: 0.05
  - Contradiction: 0.03
↓
DECISION:
  If entailment < 0.70:
    FLAG: "Unverified - Please provide more specific chunks"
    REGENERATE: Use different LLM settings
  Else:
    ACCEPT: Display with confidence_score = entailment_score
```

#### FR-4.2 NLI Model
- **Model:** DeBERTa-v3-large fine-tuned on MNLI (Natural Language Inference)
- **Alternative:** RobertaForSequenceClassification (3 classes: entailment, neutral, contradiction)
- **Inference:** Groq (500ms latency target)

---

### FR-5: Source Citation & Trust Display

#### FR-5.1 Sidebar UI Component
```
┌─────────────────────────────────────┐
│         ANSWER (Left Panel)          │
│                                     │
│ ACID has four properties:           │
│ 1. Atomicity...                     │
│ 2. Consistency...                   │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│      SOURCE GROUNDING (Right)        │
│                                     │
│ Chunk 1 [Page 4, DBMS_Notes.pdf]   │
│ "ACID is an acronym for..."         │
│                                     │
│ Chunk 2 [Page 5, DBMS_Notes.pdf]   │
│ "Atomicity means all-or-nothing..." │
└─────────────────────────────────────┘
```

#### FR-5.2 Confidence Indicator
- Display NLI entailment score as "Trust %"
- Color code: 🔴 <70% | 🟡 70-85% | 🟢 >85%

---

### FR-6: Exam Lens Feature

#### FR-6.1 Question Generation Algorithm
```python
def generate_exam_questions(document_chunks: List[Chunk], num_questions=5):
    # Step 1: Extract concept-definition pairs
    concept_pairs = extract_concept_pairs(document_chunks)
    # Output: [("ACID", "Atomicity, Consistency, ..."), ...]

    # Step 2: For each pair, generate stem (question)
    for concept, definition in concept_pairs:
        stem = llm_generate(f"Create a clear MCQ stem about {concept}. Definition: {definition}")

        # Step 3: Generate 1 correct + 3 distractor options
        correct_option = llm_generate(f"MCQ option (correct): {definition}")

        distractors = []
        for other_chunk in document_chunks:
            if other_chunk != concept:
                distractor = llm_generate(
                    f"Create a plausible but INCORRECT option for {concept} using: {other_chunk.text}"
                )
                distractors.append(distractor)

        # Step 4: Shuffle and return
        options = shuffle([correct_option] + distractors[:3])
        yield {
            "stem": stem,
            "options": options,
            "correct_index": options.index(correct_option),
            "source_chunk": concept_pairs[concept]
        }
```

---

### FR-7: Disagreement Detector

#### FR-7.1 Entity Resolution
```python
# Step 1: Identify entities across all documents
entity_extractor = SpaCy NER + regex patterns
entities = {}  # {entity_name: [(doc_id, chunk_id, value), ...]}

# Step 2: Normalize values (dates, numbers, names)
normalize_date("2026-02-12") → datetime(2026, 2, 12)
normalize_number("$2M") → 2000000

# Step 3: Compare and flag conflicts
for entity_name, occurrences in entities.items():
    if len(set(normalize(occ[2]) for occ in occurrences)) > 1:
        FLAG_CONFLICT(entity_name, occurrences)
```

#### FR-7.2 Conflict Reporting UI
```
⚠️ DISAGREEMENT DETECTED

Entity: "Project Start Date"
├─ Document A (Contract.pdf, Page 2): "2026-02-12"
├─ Document B (Amendment.pdf, Page 1): "2026-03-12"
└─ Action: Review Agreement Changes

[View Side-by-Side] [Mark as Resolved (Admin Only)]
```

---

## 2. Non-Functional Requirements

### NFR-1: Performance
- **Query Latency:** <3 seconds (P95)
- **Chunk Indexing:** 1000 documents in <5 minutes
- **Concurrent Users:** Support 50 simultaneous conversations
- **Vector Search:** <500ms for 500k+ vectors

### NFR-2: Scalability
- Horizontal scaling: FastAPI + Load balancer
- Document limit: 1000+ per workspace
- Chunk limit: 100k+ per workspace
- Vector DB sharding by document collection

### NFR-3: Reliability
- 99.5% uptime SLA
- Auto-retry on transient failures (3 attempts)
- Graceful fallback to cached responses
- Audit logs of all operations

### NFR-4: Security
- End-to-end encryption for document uploads (TLS 1.3)
- Documents isolated by user/workspace
- No document data in LLM API calls (local inference where possible)
- API rate limiting: 100 req/min per user

### NFR-5: User Experience
- Zero-latency perception: Skeleton loaders while processing
- Offline mode: Pre-computed embeddings serve local queries
- Mobile responsive: Works on tablets/phones
- Dark/light mode support

---

## 3. Technical Architecture

### 3.1 System Components

```
┌─────────────────────────────────────────────────────────────┐
│                     USER INTERFACE                          │
│              (Next.js, TailwindCSS, Shadcn/ui)              │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────┴──────────────────────────────────────┐
│                    API GATEWAY                              │
│            (FastAPI, WebSocket for streaming)               │
└──────────────────────┬──────────────────────────────────────┘
                       │
        ┌──────────────┼──────────────┐
        │              │              │
┌───────▼────────┐ ┌──▼──────────┐ ┌─▼────────────────┐
│Ingestion       │ │Chat         │ │Retrieval        │
│Pipeline        │ │Engine       │ │Engine           │
│- LlamaParse    │ │- RAG        │ │- BM25 Sparse    │
│- Gemini Flash  │ │- NLI Critic │ │- Dense Semantic │
│- ViT           │ │- LLM        │ │- Hybrid Ranking │
└───────┬────────┘ └──┬──────────┘ └─┬────────────────┘
        │             │             │
        └─────────────┼─────────────┘
                      │
        ┌─────────────┼─────────────┐
        │             │             │
   ┌────▼────┐ ┌─────▼────┐ ┌─────▼────┐
   │Supabase │ │Redis     │ │External  │
   │pgvector │ │Cache     │ │APIs      │
   │  (VDB)  │ │         │ │- OpenAI  │
   └─────────┘ └──────────┘ │- Groq    │
                            │- Gemini  │
                            └──────────┘
```

### 3.2 Data Flow

**Upload → Index → Search → Retrieve → Generate → Validate → Respond**

---

## 4. Implementation Checklist (24-Hour Sprint)

### Phase 1: Bedrock (Hours 1-6)
- [ ] FastAPI project scaffold
- [ ] Supabase pgvector setup
- [ ] Document upload endpoint
- [ ] LlamaParse integration
- [ ] Basic PDF chunking
- [ ] Embedding API integration

### Phase 2: Brain (Hours 7-14)
- [ ] BM25 sparse search
- [ ] Dense semantic search
- [ ] Hybrid ranking logic
- [ ] NLI Critic Agent setup
- [ ] RAG pipeline core
- [ ] Groq integration for fast inference

### Phase 3: Face (Hours 15-20)
- [ ] Next.js base setup
- [ ] Chat UI component
- [ ] Source citation sidebar
- [ ] WebSocket streaming
- [ ] Exam Lens UI
- [ ] Disagreement Detector UI

### Phase 4: Edge (Hours 21-24)
- [ ] Redis caching layer
- [ ] Live demo datasets
- [ ] Error handling & fallbacks
- [ ] 3-minute pitch script
- [ ] Pre-recorded demo video
- [ ] Load testing & scaling

---

## 5. API Contracts

### POST /api/documents/upload
```json
{
  "files": ["file1.pdf", "file2.mp4"],
  "workspace_id": "workspace-uuid"
}
→
{
  "status": "success",
  "document_ids": ["doc-1", "doc-2"],
  "chunks_ingested": 245,
  "indexing_time_ms": 3420
}
```

### POST /api/chat
```json
{
  "message": "What is ACID?",
  "conversation_id": "conv-uuid",
  "document_ids": ["doc-1", "doc-2"]
}
→
{
  "answer": "ACID is...",
  "source_map": [...],
  "confidence_score": 0.92,
  "nli_scores": {"entailment": 0.92, "neutral": 0.05, "contradiction": 0.03}
}
```

### POST /api/exam-lens/generate
```json
{
  "document_id": "doc-1",
  "num_questions": 5
}
→
{
  "questions": [
    {
      "stem": "What is ACID?",
      "options": ["A", "B", "C", "D"],
      "correct_index": 0
    }
  ]
}
```

### POST /api/disagreement-detector/analyze
```json
{
  "document_ids": ["doc-1", "doc-2", "doc-3"]
}
→
{
  "conflicts": [
    {
      "entity": "Project Start Date",
      "occurrences": [
        {"doc": "doc-1", "value": "2026-02-12"},
        {"doc": "doc-2", "value": "2026-03-12"}
      ]
    }
  ]
}
```

---

## 6. Database Schema

### Documents Table
```sql
CREATE TABLE documents (
  id UUID PRIMARY KEY,
  workspace_id UUID NOT NULL,
  filename VARCHAR NOT NULL,
  file_type ENUM('pdf', 'docx', 'mp4', 'csv', 'txt'),
  raw_content_url VARCHAR,  -- S3 URI
  chunks_count INT,
  created_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id)
);
```

### Chunks Table
```sql
CREATE TABLE chunks (
  id UUID PRIMARY KEY,
  document_id UUID NOT NULL,
  chunk_index INT,
  chunk_type VARCHAR,  -- 'Definition', 'Stat', 'Formula'
  text TEXT,
  dense_embedding vector(1536),  -- pgvector
  sparse_vector JSONB,  -- BM25 inverted index
  page_number INT,
  source_metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (document_id) REFERENCES documents(id),
  INDEX dense_idx ON dense_embedding USING ivfflat,
  INDEX workspace_idx (workspace_id)
);
```

### Conversations Table
```sql
CREATE TABLE conversations (
  id UUID PRIMARY KEY,
  workspace_id UUID,
  user_id UUID,
  title VARCHAR,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id)
);

CREATE TABLE messages (
  id UUID PRIMARY KEY,
  conversation_id UUID,
  role ENUM('user', 'assistant'),
  content TEXT,
  source_map JSONB,
  nli_scores JSONB,
  confidence_score DECIMAL(3, 2),
  created_at TIMESTAMP,
  FOREIGN KEY (conversation_id) REFERENCES conversations(id)
);
```

---

## 7. Environment Variables

```env
# LLM APIs
OPENAI_API_KEY=sk-...
GROQ_API_KEY=gsk-...
GEMINI_API_KEY=...

# Database
SUPABASE_URL=https://xyz.supabase.co
SUPABASE_KEY=...

# Storage
AWS_S3_BUCKET=docmind-ai
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...

# External Services
LLAMAPARSE_API_KEY=...
BEARER_TOKEN_LLAMAPARSE=...

# Cache
REDIS_URL=redis://localhost:6379

# App Config
ENVIRONMENT=production
LOG_LEVEL=info
MAX_FILE_SIZE_MB=100
MAX_DOCUMENTS_PER_WORKSPACE=1000
```

---

## Conclusion

This CRD provides the complete technical blueprint for building DocMind AI. Each functional requirement maps to specific code components and APIs, enabling seamless implementation within the 24-hour sprint.

**Key Differentiators:**
- ✅ NLI Critic Agent (hallucination detection)
- ✅ Hybrid Search (semantic + keyword)
- ✅ Source Grounding (every answer cited)
- ✅ Domain-Specific Features (Exam Lens, Disagreement Detector)
