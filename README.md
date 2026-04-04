# DocMind AI | Main README

**Live Documentation System Powered by Trustworthy AI**

Team: CypherBots | College: TIET | Competition: ECLIPSE 6.0

---

## 🎯 What is DocMind AI?

DocMind AI is a **multimodal document intelligence system** that solves the fragmented information crisis. Unlike traditional document chatbots that hallucinate, DocMind audits every answer through:

- **Hallucination Shield:** NLI-backed response validation
- **Source Grounding:** Every answer cites its sources
- **Hybrid Search:** Semantic + keyword matching
- **Disagreement Detector:** Cross-document conflict flagging
- **Exam Lens:** Auto-generated practice questions

---

## 📁 Project Structure

```
DocMind-AI/
├── docs/                    # Documentation
│   ├── PRD.md              # Product Requirements
│   ├── CRD.md              # Comprehensive Requirements
│   ├── COMPETITION_STRATEGY.md
│   └── ARCHITECTURE.md
│
├── backend/                # FastAPI Backend
│   ├── main.py             # FastAPI app
│   ├── config.py           # Configuration
│   ├── database.py         # Supabase setup
│   ├── models.py           # Pydantic schemas
│   ├── requirements.txt    # Python dependencies
│   └── api/               # Route handlers
│       ├── documents.py
│       ├── chat.py
│       ├── exam_lens.py
│       └── disagreement_detector.py
│
├── ml-pipeline/            # ML Models
│   ├── nli_critic_agent.py # Hallucination Shield
│   ├── hybrid_search.py    # Semantic + Keyword search
│   ├── rag_pipeline.py     # Retrieval pipeline
│   ├── exam_lens.py        # Question generation
│   └── disagreement_detector.py
│
├── frontend/               # Next.js 14 Frontend
│   ├── src/
│   │   ├── app/           # Next.js app directory
│   │   └── components/    # React components
│   ├── package.json
│   ├── tailwind.config.ts
│   └── tsconfig.json
│
├── config/                # Shared configuration
├── scripts/               # Utility scripts
│   ├── setup_demo.sh     # Pre-demo setup
│   └── pre_index_war_chest.py
│
├── .env.example          # Environment template
├── docker-compose.yml    # Local development
├── Dockerfile           # Backend container
└── README.md           # This file
```

---

## 🚀 Quick Start

### Prerequisites
- Docker & Docker Compose
- Python 3.11+
- Node.js 18+
- OpenAI API key
- Supabase account (or use local pgvector)

### Development Setup

```bash
# Clone repo
git clone <repo-url>
cd DocMind-AI

# Create environment file
cp .env.example .env
# Edit .env with your API keys

# Start all services
docker-compose up -d

# Frontend
cd frontend
npm install
npm run dev  # http://localhost:3000

# Backend will be running at http://localhost:8000
```

### Pre-Demo Setup (1 hour before competition)

```bash
# Run the automated setup script
bash scripts/setup_demo.sh

# This will:
# 1. Verify all prerequisites
# 2. Build Docker images
# 3. Start services
# 4. Index demo datasets (War Chest)
# 5. Verify everything is running
```

---

## 🎮 Features

### 1. **Chat with Documents**
Upload PDFs, videos, CSVs and ask questions in natural language. Get answers grounded only in your documents.

**Example Query:** "What are ACID properties?" → Instant answer with source citations

### 2. **Hallucination Shield** (Competitive Advantage)
Every response is validated via NLI (Natural Language Inference) to ensure it's actually supported by your documents.

**Confidence Scoring:**
- 🟢 >85%: Highly confident
- 🟡 70-85%: Confident
- 🔴 <70%: Low confidence / Unverified

### 3. **Hybrid Search**
Combines semantic embeddings with keyword matching. Finds both conceptual matches and exact names/dates.

### 4. **Exam Lens**
Auto-generates MCQ practice questions from uploaded documents. Distractors are contextually plausible but factually incorrect.

### 5. **Disagreement Detector**
Analyzes multiple documents and flags conflicting entity values (dates, amounts, names).

**Example:** "Contract A says start date = 2026-02-12, Contract B says 2026-03-12" → Instant conflict alert

### 6. **Source Citations**
Every answer includes visual citations showing which chunks supported the response.

---

## 🏗️ Architecture

### Frontend
- **Framework:** Next.js 14
- **Styling:** Tailwind CSS + Shadcn UI
- **State:** Zustand + React Query
- **Real-time:** WebSocket streaming

### Backend
- **Framework:** FastAPI
- **Vector DB:** Supabase pgvector
- **Cache:** Redis
- **LLM:** OpenAI GPT-4 + Groq

### ML Pipeline
- **NLI Model:** DeBERTa-v3 (Hallucination Shield)
- **Search:** BM25 (sparse) + Sentence Transformers (dense)
- **Vision:** Vision Transformers for video frames
- **Document Processing:** LlamaParse + Gemini Flash

---

## 📊 Technical Stack

| Component | Technology |
|-----------|-----------|
| **Frontend** | Next.js 14, React 18, TailwindCSS, Shadcn UI |
| **Backend** | FastAPI, Python 3.11, Pydantic |
| **Vector DB** | Supabase (pgvector), Redis |
| **LLM** | OpenAI GPT-4, Groq, Gemini Flash |
| **ML Models** | Transformers, DeBERTa-v3, Vision Transformers |
| **Document** | LlamaParse, pdf2image, ffmpeg |
| **Search** | Dense (embeddings) + Sparse (BM25) |
| **Deployment** | Docker, Docker Compose |

---

## 🎯 Demo Script (3 Minutes)

See [COMPETITION_STRATEGY.md](docs/COMPETITION_STRATEGY.md) for the full timed demo script.

**Quick Overview:**
1. Upload documents (30s)
2. Simple query + source citations (30s)
3. Multi-document comparison (30s)
4. Exam Lens feature (30s)
5. Disagreement Detector (30s)
6. Closing remarks (30s)

---

## 🧪 Testing

### Unit Tests
```bash
cd backend
pytest tests/
```

### Integration Tests
```bash
# Test the full RAG pipeline
python tests/test_rag_pipeline.py
```

### Load Testing
```bash
# Test system with 50+ vectors
python tests/load_test.py
```

---

## 📝 API Documentation

Once backend is running, visit: **http://localhost:8000/docs**

### Key Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/documents/upload` | POST | Upload documents |
| `/api/chat/query` | POST | Submit chat query |
| `/api/chat/ws/{conv_id}` | WS | WebSocket streaming |
| `/api/search/hybrid` | POST | Hybrid search |
| `/api/exam-lens/generate` | POST | Generate questions |
| `/api/disagreement-detector/analyze` | POST | Find conflicts |

---

## 🚨 Troubleshooting

### Backend won't start
```bash
# Check logs
docker-compose logs backend

# Rebuild
docker-compose build --no-cache backend
docker-compose up backend
```

### Frontend won't load
```bash
cd frontend
npm install --legacy-peer-deps
npm run dev
```

### API Key errors
- Verify `.env` file has all required keys
- Check OpenAI/Groq/Gemini quotas

### Vector DB connection failed
- Verify Supabase credentials
- Or use local pgvector with Docker Compose

---

## 📈 Performance Metrics

| Metric | Target | Status |
|--------|--------|--------|
| Query Latency | <3s | ✅ |
| Vector Search | <500ms | ✅ |
| NLI Validation | <1s | ✅ |
| Chunk Indexing | <5min/1000 docs | ✅ |
| Concurrent Users | 50+ | ✅ |

---

## 🔐 Security

- TLS 1.3 for data in transit
- Documents isolated by workspace
- API rate limiting (100 req/min)
- No sensitive data in logs
- Secret key rotation required in production

---

## 📚 Additional Resources

- [PRD](docs/PRD.md) - Full product requirements
- [CRD](docs/CRD.md) - Comprehensive technical specs
- [Competition Strategy](docs/COMPETITION_STRATEGY.md) - Demo playbook
- [Architecture](docs/ARCHITECTURE.md) - Detailed system design

---

## 👥 Team

**CypherBots @ TIET**
- Aashi Tyagi (Team Lead)
- Karan Bansal
- Vinayak Moudgil

---

## 📄 License

MIT License - See LICENSE file for details

---

## 🎯 Join Us

Follow our ECLIPSE 6.0 journey:
- GitHub: [CypherBots/DocMind-AI](https://github.com/cypherbots/docmind-ai)
- LinkedIn: CypherBots TIET
- Twitter: @CypherBots_TIET

---

**DocMind AI: Every Answer is Auditable. That's the Moat.**
