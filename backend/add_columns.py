import asyncio
from sqlalchemy import text
from database import engine

async def add_columns():
    async with engine.begin() as conn:
        print("Adding columns to patients table...")
        try:
            await conn.execute(text("ALTER TABLE patients ADD COLUMN outstanding_balance INTEGER DEFAULT 0;"))
            print("Added outstanding_balance.")
        except Exception as e:
            print(f"Error or already exists outstanding_balance: {e}")
            
        try:
            await conn.execute(text("ALTER TABLE patients ADD COLUMN preferred_hours VARCHAR;"))
            print("Added preferred_hours.")
        except Exception as e:
            print(f"Error or already exists preferred_hours: {e}")

if __name__ == "__main__":
    asyncio.run(add_columns())
