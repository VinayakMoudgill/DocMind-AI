# Product Requirements Document (PRD)
## DocMind AI: The Multimodal Intelligence System

**Project:** EC604 Knowledge Retrieval
**Team:** CypherBots (Aashi Tyagi, Karan Bansal, Vinayak Moudgil)
**College:** TIET
**Competition:** ECLIPSE 6.0
**Target Launch:** 24-Hour Sprint Delivery

---

## Executive Summary

DocMind AI transforms fragmented, siloed information into a unified, trustworthy knowledge system. Unlike traditional document assistants that merely chat, DocMind AI **audits every answer**, ensuring grounding in user-uploaded data with verifiable source citations.

**The Competitive Moat:** Our Hallucination Shield and Source Grounding guarantee legally/academically defensible answers.

---

## Problem Statement: The "Fragmented Information" Crisis

### Current Pain Points

| User Type | Problem | Consequence |
|-----------|---------|-------------|
| **Students** | Notes scattered across PDFs, drives, WhatsApp, Google Drive | Waste hours before exams searching for answers |
| **Legal Professionals** | Massive contracts, legal documents in multiple folders | Manual review is slow, error-prone, legally risky |
| **Researchers** | Hundreds of papers to analyze | Difficult to extract consistent insights across sources |
| **Companies** | Internal knowledge in Slack, Notion, scattered docs | Employees repeatedly ask the same questions |

### Root Causes
1. **Fragmented Information:** Data scattered across PDFs, CSVs, videos, databases
2. **Time-Consuming Search:** Manual keyword-based search lacks semantic understanding
3. **Lack of Contextual Retrieval:** Traditional search = keyword matches, not meaningful insights
4. **Hallucination Risk:** LLMs generate confident-sounding but false answers

---

## User Personas & Moonshot Value

### Persona 1: The Student (Pre-Exam Panic)
- **Pain:** "Where was ACID properties written?" / "Which notes had the normalization chapter?"
- **Moonshot Feature:** **Exam Lens** - Automatically generates practice questions from uploaded notes
- **Value:** Turn 2 hours of cramming into 30 minutes of active recall from fragmented sources

### Persona 2: The Legal Professional (Compliance Crisis)
- **Pain:** "Is clause 14 present in both contracts?" / "Did we agree to this payment term before?"
- **Moonshot Feature:** **Hallucination Shield** - Every answer is backed by verifiable source citations
- **Value:** Reduce legal risk; every claim is defensible in court ("From Contract A, Page 5")

### Persona 3: The Researcher (Insight Extraction)
- **Pain:** "Do these 5 papers agree on the solution?" / "What's contradictory across sources?"
- **Moonshot Feature:** **Disagreement Detector** - Flags cross-document inconsistencies instantly
- **Value:** 1-hour literature review instead of 1-week manual analysis

### Persona 4: The Company Employee (Knowledge Access)
- **Pain:** "How does our API authentication work?" / "What's the content policy?"
- **Moonshot Feature:** **Multi-Document Querying** - Query across 100+ internal docs simultaneously
- **Value:** Self-service knowledge access; reduce support tickets by 40%

---

## Core Value Propositions

✅ **Semantic Intelligence:** Understand intent beyond keywords
✅ **Source Grounding:** Every answer has verifiable citations
✅ **Multimodal Ingestion:** PDFs, videos, CSVs, structured data
✅ **Cross-Document Context:** Query relationships across files
✅ **Hallucination Detection:** NLI Critic Agent validates responses
✅ **Domain Flexibility:** Works for legal, academic, research, corporate domains

---

## Core Features (MVP Scope)

### 1. **Document Upload & Processing**
- Ingest: PDFs, DOCX, MP4, CSV
- LlamaParse for table-accurate extraction
- Gemini Flash for video keyframe semantic indexing
- Auto-chunk and embed documents

### 2. **Hybrid Search Engine**
- **Dense Search (Semantic):** OpenAI embeddings for intent matching
- **Sparse Search (BM25):** Exact keyword/date/name matching
- Hybrid ranking algorithm combines both

### 3. **Chat with Documents**
- Ask questions in natural language
- Get answers grounded in YOUR uploaded data
- Conversation context maintained across turns

### 4. **Source Citation System**
- Every answer includes source_map: `[From Page X, Document.pdf]`
- Sidebar shows retrieved chunks side-by-side with answer

### 5. **Exam Lens** (Differentiation)
- Auto-generate MCQ questions from documents
- Realistic distractors from similar chunks
- Pedagogical scaffolding for exam prep

### 6. **Disagreement Detector** (Differentiation)
- Identify entity conflicts across documents
- Flag when "Revenue" differs: Doc A says $2M, Doc B says $1.5M
- Side-by-side conflict view

### 7. **Hallucination Shield** (Trust Layer)
- NLI Critic Agent validates every response
- If NLI entailment score < 0.7, flag as "Unverified" or regenerate
- "Confidence Score" displayed to user (Entailment % = Trust %)

---

## Success Metrics (ECLIPSE 6.0 Judging Criteria)

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Source Grounding Accuracy** | 100% of answers have citations | Manual spot-checks |
| **Hallucination Detection Rate** | >95% | Compare AI answer vs. retrieved chunks |
| **Query Latency** | <3 seconds | Average response time |
| **Multi-Document Queries** | Support 50+ docs | Stress test |
| **Demo Confidence** | Zero system crashes | Live demo flawless execution |

---

## Technical Stack (Locked)

- **Frontend:** Next.js 14, TailwindCSS, Shadcn/ui, React Query
- **Backend:** FastAPI, Python 3.11
- **Vector DB:** Supabase (pgvector), Redis for caching
- **LLM/Embeddings:** OpenAI GPT-4, Embeddings API, Groq (fast inference)
- **ML Models:** DeBERTa-v3, Vision Transformers, NLI (entailment scoring)
- **Document Processing:** LlamaParse, Gemini Flash (video), pdf2image
- **Deployment:** Docker, AWS/GCP

---

## 24-Hour Sprint Timeline

| Hours | Phase | Deliverable |
|-------|-------|-------------|
| 1-6 | **The Bedrock** | Backend setup, Supabase, sample PDFs/videos ingested |
| 7-14 | **The Brain** | NLI Critic Agent, Hybrid Search, Groq integration |
| 15-20 | **The Face** | Next.js UI, Source Citation sidebar, Exam Lens frontend |
| 21-24 | **The Edge** | Redis caching, 3-min pitch, live demo insurance |

---

## Competition Differentiation

### Why We Win
1. **Hallucination Shield:** Only AI system with NLI-backed Critic Agent
2. **Source Grounding:** Legal/academic defensibility
3. **Disagreement Detector:** Cross-document analysis no competitor offers
4. **Exam Lens:** Teacher-approved pedagogy built-in

### The 30-Second Elevator Pitch
> "DocMind AI doesn't just chat with your documents—it audits every answer. While other AI systems hallucinate, we guarantee source-backed responses. Perfect for students cramming, lawyers reviewing contracts, or researchers analyzing papers."

---

## Risks & Mitigation

| Risk | Mitigation |
|------|-----------|
| **Live Demo Video Processing Latency** | Pre-cache top 3 videos in Redis; use Skeleton UI loaders |
| **NLI Model Performance** | Fine-tune on legal/academic domain data |
| **Vector DB Scaling (50+ docs)** | Optimize pgvector indexing; partition by document |
| **Network Failure at Venue** | Offline fallback with pre-computed embeddings |

---

## Post-Competition Roadmap (Phase 2)

- **Mobile App:** React Native for on-the-go access
- **Domain-Specific Fine-Tuning:** Legal package, Medical package, Academic package
- **Enterprise Features:** User management, audit logs, SSO
- **Advanced Analytics:** Document usage dashboard, query patterns
- **Voice Input:** Speech-to-text query interface

---

## Conclusion

DocMind AI is the **Trust-First AI Document System**. By combining semantic search, multimodal ingestion, and hallucination detection, we solve the fragmented information crisis with academic rigor and legal defensibility.

**Our competitive advantage is source grounding—every answer is auditable, making us indispensable for high-stakes domains.**
