"""
Configuration Management for DocMind AI
Handles environment variables and application settings

Note: Use plain defaults below so pydantic-settings can load values from .env
(do not use os.getenv() as field defaults — that runs before .env is read).
"""

from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

_ENV_FILE = Path(__file__).resolve().parent.parent / ".env"


class Settings(BaseSettings):
    """Application Settings"""

    model_config = SettingsConfigDict(
        env_file=str(_ENV_FILE),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # App Configuration
    app_name: str = "DocMind AI"
    app_version: str = "1.0.0"
    environment: str = "development"
    debug: bool = True
    log_level: str = "info"

    # API Configuration
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    api_timeout: int = 300  # 5 minutes

    # OpenAI Configuration
    openai_api_key: str = ""
    openai_model: str = "gpt-4"
    openai_embedding_model: str = "text-embedding-3-large"
    embedding_dimensions: int = 1536

    # OpenRouter (OpenAI-compatible API; https://openrouter.ai/)
    openrouter_api_key: str = ""
    openrouter_base_url: str = "https://openrouter.ai/api/v1"
    openrouter_model: str = "openai/gpt-4o-mini"
    openrouter_http_referer: str = ""  # optional; site URL for OpenRouter rankings

    # Groq Configuration (Fast Inference)
    groq_api_key: str = ""
    groq_model: str = "mixtral-8x7b-32768"

    # Google AI Studio / Gemini
    gemini_api_key: str = ""
    gemini_model: str = "gemini-2.0-flash"

    # Supabase Configuration
    supabase_url: str = ""
    supabase_key: str = ""

    # Redis Configuration
    redis_url: str = "redis://localhost:6379"
    redis_ttl: int = 3600  # 1 hour

    # AWS S3 Configuration
    aws_s3_bucket: str = "docmind-ai"
    aws_region: str = "us-east-1"
    aws_access_key_id: str = ""
    aws_secret_access_key: str = ""

    # LlamaParse Configuration
    llamaparse_api_key: str = ""

    # Document Processing
    max_file_size_mb: int = 100
    max_documents_per_workspace: int = 1000
    chunk_size: int = 512
    chunk_overlap: int = 128
    video_keyframe_interval: int = 5  # seconds

    # RAG Configuration
    top_k_retrieval: int = 5
    hybrid_search_alpha: float = 0.6  # 60% dense, 40% sparse
    min_confidence_threshold: float = 0.45

    # NLI Model Configuration
    nli_model_name: str = "cross-encoder/nli-deberta-v3-large"
    nli_batch_size: int = 32

    # Model Inference ("auto" picks CUDA when available)
    device: str = "auto"

    # Security
    secret_key: str = "dev-secret-key-change-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30


# Global settings instance
settings = Settings()
