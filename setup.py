#!/usr/bin/env python3
"""
Setup script for LLM Turing Test Battle.

This script helps users get started quickly by checking dependencies,
setting up the environment, and providing helpful guidance.
"""

import os
import sys
import subprocess
from pathlib import Path

def check_python_version():
    """Check if Python version is sufficient."""
    if sys.version_info < (3, 7):
        print("❌ Error: Python 3.7 or higher is required")
        print(f"   Current version: {sys.version}")
        return False
    
    print(f"✅ Python version: {sys.version_info.major}.{sys.version_info.minor}")
    return True

def install_dependencies():
    """Install required dependencies."""
    print("📦 Installing dependencies...")
    try:
        subprocess.check_call([sys.executable, "-m", "pip", "install", "-r", "requirements.txt"])
        print("✅ Dependencies installed successfully")
        return True
    except subprocess.CalledProcessError:
        print("❌ Failed to install dependencies")
        print("   Try running: pip install -r requirements.txt")
        return False

def setup_environment():
    """Set up environment file."""
    env_file = Path(".env")
    env_example = Path(".env_example")
    
    if env_file.exists():
        print("✅ .env file already exists")
        return True
    
    if not env_example.exists():
        print("❌ .env_example file not found")
        return False
    
    # Copy example to .env
    try:
        with open(env_example, 'r') as src, open(env_file, 'w') as dst:
            dst.write(src.read())
        print("✅ Created .env file from template")
        print("📝 Please edit .env and add your OpenRouter API key")
        return True
    except Exception as e:
        print(f"❌ Failed to create .env file: {e}")
        return False

def setup_database():
    """Initialize the SQLite database."""
    print("🗄️ Setting up database...")
    try:
        # Import and run database setup
        from database import create_table_if_not_exists
        create_table_if_not_exists()
        print("✅ Database initialized successfully")
        return True
    except Exception as e:
        print(f"❌ Failed to initialize database: {e}")
        print("   Database will be created automatically when you first run the app")
        return True  # Don't fail setup for this

def main():
    """Main setup function."""
    print("🤖 LLM Turing Test Battle - Setup")
    print("=" * 40)
    
    # Check Python version
    if not check_python_version():
        sys.exit(1)
    
    # Install dependencies
    if not install_dependencies():
        sys.exit(1)
    
    # Setup environment
    if not setup_environment():
        sys.exit(1)
    
    # Setup database
    setup_database()
    
    print("\n🎉 Setup complete!")
    print("\n📋 Next steps:")
    print("1. Edit .env file and add your OpenRouter API key")
    print("   Get one at: https://openrouter.ai/")
    print("2. Run the application: python run.py")
    print("3. Open your browser to: http://localhost:5001")
    print("\n🚀 Enjoy the AI battles!")

if __name__ == "__main__":
    main()