"""
API Models and Schemas for Request/Response validation
"""

from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum

# ============ Enums ============

class DocumentTypeEnum(str, Enum):
    PDF = "pdf"
    DOCX = "docx"
    MP4 = "mp4"
    CSV = "csv"
    TXT = "txt"

class ChunkTypeEnum(str, Enum):
    DEFINITION = "Definition"
    STATISTIC = "Stat"
    STATUTE = "Statute"
    FORMULA = "Formula"
    GENERAL = "General"

# ============ Document Models ============

class DocumentUploadRequest(BaseModel):
    """Request body for document upload"""
    workspace_id: str = Field(..., description="Workspace ID")
    document_type: DocumentTypeEnum = Field(..., description="Type of document")

class DocumentMetadata(BaseModel):
    """Metadata for uploaded document"""
    id: str
    filename: str
    file_type: DocumentTypeEnum
    chunks_count: int
    created_at: datetime
    status: str  # "processing", "ready", "failed"

class DocumentUploadResponse(BaseModel):
    """Response after document upload"""
    status: str
    document_ids: List[str]
    chunks_ingested: int
    indexing_time_ms: float
    message: str

# ============ Chunk Models ============

class ChunkSource(BaseModel):
    """Source information for a chunk"""
    chunk_id: str
    file: str
    page: Optional[int] = None
    timestamp: Optional[str] = None  # For video
    snippet: str

class ChunkData(BaseModel):
    """Chunk with embedding and metadata"""
    id: str
    document_id: str
    text: str
    chunk_type: ChunkTypeEnum
    page_number: Optional[int] = None
    dense_embedding: Optional[List[float]] = Field(None, exclude=True)
    source_map: Dict[str, Any]

# ============ Chat Models ============

class ChatMessage(BaseModel):
    """Single chat message"""
    role: str  # "user" or "assistant"
    content: str
    source_map: Optional[List[ChunkSource]] = None
    nli_scores: Optional[Dict[str, float]] = None  # {entailment, neutral, contradiction}
    confidence_score: Optional[float] = None

class ChatRequest(BaseModel):
    """Request for chat query"""
    message: str = Field(..., description="User question")
    conversation_id: str = Field(..., description="Conversation ID")
    document_ids: List[str] = Field(default=[], description="Documents to query")
    use_nli_validation: bool = Field(True, description="Enable hallucination shield")

class ChatResponse(BaseModel):
    """Response from chat query"""
    answer: str
    source_map: List[Dict[str, Any]]
    confidence_score: float  # NLI entailment score
    nli_scores: Dict[str, float]
    conversation_id: str
    message_id: str
    execution_time_ms: float
    confidence_explanation: Optional[str] = None

class ConversationResponse(BaseModel):
    """Conversation metadata"""
    id: str
    workspace_id: str
    title: str
    created_at: datetime
    updated_at: datetime
    message_count: int

# ============ Search Models ============

class HybridSearchRequest(BaseModel):
    """Hybrid search query"""
    query: str = Field(..., description="Search query")
    document_ids: Optional[List[str]] = None
    k: int = Field(10, description="Number of results")
    alpha: float = Field(0.6, description="Dense weight (0.6 = 60% semantic, 40% keyword)")

class SearchResult(BaseModel):
    """Single search result"""
    rank: int
    chunk_id: str
    document_id: str
    filename: str
    page: Optional[int] = None
    snippet: str
    dense_score: float
    sparse_score: float
    hybrid_score: float

class HybridSearchResponse(BaseModel):
    """Response from hybrid search"""
    query: str
    results: List[SearchResult]
    total_results: int
    execution_time_ms: float

# ============ Exam Lens Models ============

class ExamQuestion(BaseModel):
    """Generated exam question"""
    stem: str = Field(..., description="Question stem")
    options: List[str] = Field(..., description="4 answer options")
    correct_index: int = Field(..., description="Index of correct answer")
    source_chunk: str = Field(..., description="Source chunk this question was generated from")
    difficulty: str = Field("medium", description="Difficulty level")

class ExamLensRequest(BaseModel):
    """Request to generate exam questions"""
    document_id: str = Field(..., description="Document ID")
    num_questions: int = Field(5, description="Number of questions to generate")
    difficulty: str = Field("medium", description="Difficulty level: easy, medium, hard")

class ExamLensResponse(BaseModel):
    """Response with generated questions"""
    questions: List[ExamQuestion]
    total_questions: int
    document_id: str
    execution_time_ms: float

# ============ Disagreement Detector Models ============

class EntityOccurrence(BaseModel):
    """Single occurrence of an entity"""
    document_id: str
    filename: str
    page: Optional[int] = None
    value: str
    normalized_value: str

class ConflictReport(BaseModel):
    """Report of conflicting entity values"""
    entity_name: str
    entity_type: str  # "date", "number", "name", "other"
    occurrences: List[EntityOccurrence]
    confidence: float  # How certain we are of the conflict

class DisagreementDetectorRequest(BaseModel):
    """Request to analyze for conflicts"""
    document_ids: List[str] = Field(..., description="Documents to analyze")
    min_conflicts: int = Field(1, description="Minimum occurrences to flag as potential conflict")

class DisagreementDetectorResponse(BaseModel):
    """Response with detected conflicts"""
    conflicts: List[ConflictReport]
    total_conflicts: int
    documents_analyzed: int
    execution_time_ms: float

# ============ NLI Validation Models ============

class NLIValidationRequest(BaseModel):
    """Request to validate response against premises"""
    premise: str = Field(..., description="Retrieved context chunks")
    hypothesis: str = Field(..., description="Generated response to validate")

class NLIValidationResponse(BaseModel):
    """Response with NLI scores"""
    entailment_score: float
    neutral_score: float
    contradiction_score: float
    is_valid: bool  # True if entailment > 0.7
    confidence_explanation: str

# ============ Error Models ============

class ErrorResponse(BaseModel):
    """Standard error response"""
    error: str
    status_code: int
    timestamp: datetime
    request_id: str
    details: Optional[Dict[str, Any]] = None
