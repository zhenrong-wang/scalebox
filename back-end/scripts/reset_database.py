#!/usr/bin/env python3
"""
Script to reset the database with new AWS-style ID schema.
This will drop all tables and recreate them with the new ID format.
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine, text
from config import settings
from app.models import Base
from app.database import engine

def reset_database():
    """Drop all tables and recreate with new schema"""
    print("🔄 Resetting database with new AWS-style ID schema...")
    
    # Drop all tables
    print("📥 Dropping all existing tables...")
    Base.metadata.drop_all(engine)
    
    # Create all tables with new schema
    print("📤 Creating tables with new schema...")
    Base.metadata.create_all(engine)
    
    print("✅ Database reset complete!")
    print("\n📋 New ID format:")
    print("   Users:      123456789012         (12-digit numeric account_id)")
    print("   Projects:   prj-abcdefghijklmnopq (21 chars total)")
    print("   Templates:  tpl-abcdefghijklmnopq (21 chars total)")
    print("   Sandboxes:  sbx-abcdefghijklmnopq (21 chars total)")
    print("   API Keys:   sbk-abcdefghijklmnopqrstuvwxyz1234567890 (43 chars total)")

if __name__ == "__main__":
    reset_database() 