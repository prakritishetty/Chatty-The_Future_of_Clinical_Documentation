# backend/init_db.py
import asyncio
from sqlalchemy import text
from database import engine, Base
import models # This imports the table definitions we just wrote

async def create_tables():
    print("Connecting to your Cloud Vault...")
    
    # Enable pgvector math extension
    async with engine.begin() as conn:
        print("Enabling pgvector extension securely...")
        await conn.execute(text('CREATE EXTENSION IF NOT EXISTS vector;'))
        
    # Build the Tables securely
    async with engine.begin() as conn:
        print("Creating Patient and Visit Note Tables...")
        # await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
        
    print("Cloud Vault Fully Initialized and Ready for RAG!")

if __name__ == "__main__":
    asyncio.run(create_tables())
