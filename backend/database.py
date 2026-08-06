"""
SAFE-FUSE AI — Database Configuration
SQLAlchemy + SQLite setup for persistent storage.
"""

import os
import tempfile
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

if os.getenv("VERCEL"):
    db_path = os.path.join(tempfile.gettempdir(), "safefuse.db")
    DATABASE_URL = f"sqlite:///{db_path}"
else:
    DATABASE_URL = "sqlite:///./safefuse.db"

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False},
    echo=False,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def init_db():
    """Create all tables."""
    from models import Incident, SensorLog, RelayEvent, AlertLog  # noqa
    Base.metadata.create_all(bind=engine)
    print("[DB] [OK] Database initialized")


def get_db():
    """Dependency for FastAPI route injection."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
