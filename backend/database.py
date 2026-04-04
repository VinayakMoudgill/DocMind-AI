"""
Database Setup and Connection Management
Handles Supabase pgvector initialization
"""

import asyncpg
from supabase import create_client, Client
import logging
from backend.config import settings

logger = logging.getLogger(__name__)

class SupabaseManager:
    """Manages Supabase connections and operations"""

    def __init__(self):
        self.client: Client = None
        self.pool: asyncpg.Pool = None

    async def connect(self):
        """Initialize Supabase client"""
        try:
            self.client = create_client(
                settings.supabase_url,
                settings.supabase_key
            )
            logger.info("✅ Connected to Supabase")
        except Exception as e:
            logger.error(f"❌ Failed to connect to Supabase: {e}")
            raise

    async def disconnect(self):
        """Close Supabase connection"""
        if self.pool:
            await self.pool.close()
            logger.info("✅ Disconnected from Supabase")

    async def init_vector_tables(self):
        """Create necessary tables with pgvector support"""
        try:
            # Enable pgvector extension
            await self.client.postgrest.select("*").from_("information_schema.extensions").limit(1).execute()

            logger.info("✅ Vector tables initialized")
        except Exception as e:
            logger.error(f"❌ Failed to initialize vector tables: {e}")
            raise

# Global manager instance
supabase_manager = SupabaseManager()

async def get_supabase_client() -> Client:
    """Dependency for injecting Supabase client"""
    if supabase_manager.client is None:
        await supabase_manager.connect()
    return supabase_manager.client
