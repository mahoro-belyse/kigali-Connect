from app.core import engine, create_tables
from sqlalchemy import text

with engine.connect() as conn:
    conn.execute(text("DROP SCHEMA public CASCADE"))
    conn.execute(text("CREATE SCHEMA public"))
    conn.commit()

create_tables()
print("✅ Database reset successfully")