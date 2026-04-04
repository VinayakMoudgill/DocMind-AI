"""
Hybrid Search Engine | Dense + Sparse Ranking
Combines semantic embeddings with BM25 keyword matching
"""

import logging
import os
import sys
from pathlib import Path
from typing import List, Dict, Tuple, Optional

import numpy as np
from rank_bm25 import BM25Okapi
from sentence_transformers import SentenceTransformer

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from backend.config import settings

logger = logging.getLogger(__name__)


def _resolve_device(requested: str) -> str:
    if requested == "auto":
        try:
            import torch

            return "cuda" if torch.cuda.is_available() else "cpu"
        except Exception:
            return "cpu"
    if requested == "cuda":
        try:
            import torch

            return "cuda" if torch.cuda.is_available() else "cpu"
        except Exception:
            return "cpu"
    return requested

class HybridSearchEngine:
    """
    Hybrid search combining:
    1. Dense Search: Semantic understanding via embeddings
    2. Sparse Search: Exact keyword/entity matching via BM25
    3. Hybrid Ranking: Weighted combination of both scores
    """

    def __init__(
        self,
        embedding_model: Optional[str] = None,
        device: Optional[str] = None,
    ):
        """Initialize search engine"""
        logger.info(f"Initializing Hybrid Search Engine...")

        model_name = embedding_model or os.getenv(
            "DOCMIND_EMBEDDING_MODEL", "sentence-transformers/all-MiniLM-L6-v2"
        )
        dev = _resolve_device(device or settings.device)
        self.embedding_model = SentenceTransformer(model_name, device=dev)
        self.bm25_index = None
        self.documents = []  # List of document texts
        self.document_metadata = []  # Metadata for each document
        self._doc_embeddings = None  # Cached document embeddings (np.ndarray)

        logger.info("✅ Hybrid Search Engine ready")

    def build_index(self, chunks: List[Dict]) -> None:
        """
        Build BM25 index for sparse search.

        Args:
            chunks: List of chunk dicts with 'text', 'id', 'source' keys
        """
        logger.info(f"Building index for {len(chunks)} chunks...")

        self.documents = [chunk["text"] for chunk in chunks]
        self.document_metadata = list(chunks)
        self._doc_embeddings = None

        if not self.documents:
            self.bm25_index = None
            logger.warning("No chunks to index; BM25 cleared")
            return

        # Tokenize for BM25
        tokenized_docs = [doc.split() for doc in self.documents]
        self.bm25_index = BM25Okapi(tokenized_docs)

        # Pre-compute and cache document embeddings
        logger.info("Computing embeddings for %d chunks...", len(self.documents))
        self._doc_embeddings = self.embedding_model.encode(
            self.documents, show_progress_bar=False, batch_size=64
        )
        logger.info("✅ Index built: %d chunks indexed + embeddings cached", len(chunks))

    def dense_search(
        self,
        query: str,
        k: int = 10
    ) -> List[Tuple[int, float]]:
        """
        Semantic search using dense embeddings.

        Args:
            query: User query
            k: Number of results

        Returns:
            List of (doc_index, similarity_score) tuples
        """

        if not self.documents or self._doc_embeddings is None:
            logger.warning("No documents in index")
            return []

        # Encode query only — document embeddings already cached from build_index()
        query_embedding = self.embedding_model.encode(query)

        # Compute cosine similarities using cached embeddings
        similarities = np.dot(self._doc_embeddings, query_embedding) / (
            np.linalg.norm(self._doc_embeddings, axis=1) * np.linalg.norm(query_embedding) + 1e-10
        )

        # Get top-k indices
        top_k_indices = np.argsort(-similarities)[:k]
        top_k_scores = similarities[top_k_indices]

        results = [(idx, float(score)) for idx, score in zip(top_k_indices, top_k_scores)]

        if len(top_k_scores):
            logger.info(f"Dense search: Top-1 similarity = {top_k_scores[0]:.4f}")
        return results

    def sparse_search(
        self,
        query: str,
        k: int = 10
    ) -> List[Tuple[int, float]]:
        """
        Keyword-based search using BM25.

        Args:
            query: User query
            k: Number of results

        Returns:
            List of (doc_index, bm25_score) tuples
        """

        if not self.bm25_index:
            logger.warning("BM25 index not built")
            return []

        # Tokenize query
        query_tokens = query.split()

        # Get BM25 scores
        scores = self.bm25_index.get_scores(query_tokens)

        # Get top-k indices
        top_k_indices = np.argsort(-scores)[:k]
        top_k_scores = scores[top_k_indices]

        results = [(idx, float(score)) for idx, score in zip(top_k_indices, top_k_scores)]

        if len(top_k_scores):
            logger.info(f"Sparse search: Top-1 BM25 score = {top_k_scores[0]:.4f}")
        return results

    def hybrid_search(
        self,
        query: str,
        k: int = 10,
        alpha: float = 0.6
    ) -> List[Dict]:
        """
        Hybrid search combining dense and sparse results.

        Args:
            query: User query
            k: Number of final results
            alpha: Weight for dense search (1-alpha for sparse)
                   alpha=0.6 means 60% semantic, 40% keyword

        Returns:
            List of ranked chunk dicts with scores
        """

        logger.info(f"Hybrid search: query='{query}', k={k}, alpha={alpha}")

        # Run both searches
        dense_results = self.dense_search(query, k=len(self.documents))
        sparse_results = self.sparse_search(query, k=len(self.documents))

        # Create dictionaries for easy lookup
        dense_scores = {idx: score for idx, score in dense_results}
        sparse_scores = {idx: score for idx, score in sparse_results}

        # Get all unique indices
        all_indices = set(dense_scores.keys()) | set(sparse_scores.keys())

        # Normalize scores to [0, 1]
        dense_scores_norm = {}
        sparse_scores_norm = {}

        if dense_scores:
            max_dense = max(dense_scores.values()) if max(dense_scores.values()) > 0 else 1
            dense_scores_norm = {idx: score / max_dense for idx, score in dense_scores.items()}

        if sparse_scores:
            max_sparse = max(sparse_scores.values()) if max(sparse_scores.values()) > 0 else 1
            sparse_scores_norm = {idx: score / max_sparse for idx, score in sparse_scores.items()}

        # Compute hybrid scores
        hybrid_scores = {}
        for idx in all_indices:
            dense = dense_scores_norm.get(idx, 0)
            sparse = sparse_scores_norm.get(idx, 0)
            hybrid = alpha * dense + (1 - alpha) * sparse
            hybrid_scores[idx] = {
                'dense': dense,
                'sparse': sparse,
                'hybrid': hybrid
            }

        # Sort by hybrid score
        sorted_results = sorted(
            hybrid_scores.items(),
            key=lambda x: x[1]['hybrid'],
            reverse=True
        )[:k]

        # Build result list
        results = []
        for rank, (idx, scores) in enumerate(sorted_results, 1):
            chunk = self.document_metadata[idx].copy()
            chunk['rank'] = rank
            chunk['dense_score'] = scores['dense']
            chunk['sparse_score'] = scores['sparse']
            chunk['hybrid_score'] = scores['hybrid']
            results.append(chunk)

        logger.info(f"Hybrid search returned {len(results)} results")
        return results


# Global search engine instance
search_engine = None

def get_search_engine() -> HybridSearchEngine:
    """Lazy-load search engine"""
    global search_engine
    if search_engine is None:
        search_engine = HybridSearchEngine()
    return search_engine
