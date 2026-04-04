"""
Configuration Management for DocMind AI
Handles environment variables and application settings
"""

from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional
import os

class Settings(BaseSettings):
    """Application Settings"""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # App Configuration
    app_name: str = "DocMind AI"
    app_version: str = "1.0.0"
    environment: str = os.getenv("ENVIRONMENT", "development")
    debug: bool = environment == "development"
    log_level: str = os.getenv("LOG_LEVEL", "info")

    # API Configuration
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    api_timeout: int = 300  # 5 minutes

    # OpenAI Configuration
    openai_api_key: str = os.getenv("OPENAI_API_KEY", "")
    openai_model: str = "gpt-4"
    openai_embedding_model: str = "text-embedding-3-large"
    embedding_dimensions: int = 1536

    # Groq Configuration (Fast Inference)
    groq_api_key: str = os.getenv("GROQ_API_KEY", "")
    groq_model: str = "mixtral-8x7b-32768"

    # Gemini Configuration (Video Processing)
    gemini_api_key: str = os.getenv("GEMINI_API_KEY", "")
    gemini_model: str = "gemini-pro-vision"

    # Supabase Configuration
    supabase_url: str = os.getenv("SUPABASE_URL", "")
    supabase_key: str = os.getenv("SUPABASE_KEY", "")

    # Redis Configuration
    redis_url: str = os.getenv("REDIS_URL", "redis://localhost:6379")
    redis_ttl: int = 3600  # 1 hour

    # AWS S3 Configuration
    aws_s3_bucket: str = os.getenv("AWS_S3_BUCKET", "docmind-ai")
    aws_region: str = os.getenv("AWS_REGION", "us-east-1")
    aws_access_key_id: str = os.getenv("AWS_ACCESS_KEY_ID", "")
    aws_secret_access_key: str = os.getenv("AWS_SECRET_ACCESS_KEY", "")

    # LlamaParse Configuration
    llamaparse_api_key: str = os.getenv("LLAMAPARSE_API_KEY", "")

    # Document Processing
    max_file_size_mb: int = 100
    max_documents_per_workspace: int = 1000
    chunk_size: int = 512
    chunk_overlap: int = 128
    video_keyframe_interval: int = 5  # seconds

    # RAG Configuration
    top_k_retrieval: int = 5
    hybrid_search_alpha: float = 0.6  # 60% dense, 40% sparse
    min_confidence_threshold: float = 0.7

    # NLI Model Configuration
    nli_model_name: str = "cross-encoder/nli-deberta-v3-large"
    nli_batch_size: int = 32

    # Model Inference ("auto" picks CUDA when available)
    device: str = os.getenv("DOCMIND_DEVICE", "auto")

    # Security
    secret_key: str = os.getenv("SECRET_KEY", "dev-secret-key-change-in-production")
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30

# Global settings instance
settings = Settings()
