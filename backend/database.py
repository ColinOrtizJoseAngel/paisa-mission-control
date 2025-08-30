# backend/database.py
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

DATABASE_URL = "postgresql://paisa_db_user:sIcaNtX2J51h8poqqc5yRpbOnfq6ZcNx@dpg-d2pjv1f5r7bs739qaca0-a/paisa_db"

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()