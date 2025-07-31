#!/usr/bin/env python3
"""
Simple startup script for the LLM Turing Test Battle application.

This script provides an easy way to start the web application with
proper environment setup and helpful error messages.
"""

import os
import sys
from pathlib import Path

def check_requirements():
    """Check if basic requirements are met before starting."""
    
    # Check if .env file exists
    if not Path(".env").exists():
        if Path(".env_example").exists():
            print("❌ Error: .env file not found!")
            print("📝 Please copy .env_example to .env and add your OpenRouter API key:")
            print("   cp .env_example .env")
            print("   # Then edit .env with your API key")
            return False
        else:
            print("❌ Error: No .env configuration found!")
            print("📝 Please create a .env file with your OpenRouter API key:")
            print("   OPENROUTER_API_KEY=your_api_key_here")
            return False
    
    # Check if required packages are installed
    try:
        import flask
        import openai
        import requests
        from dotenv import load_dotenv
    except ImportError as e:
        print(f"❌ Error: Missing required package: {e}")
        print("📦 Please install requirements:")
        print("   pip install -r requirements.txt")
        return False
    
    # Load and check API key
    from dotenv import load_dotenv
    load_dotenv()
    
    api_key = os.getenv("OPENROUTER_API_KEY")
    if not api_key or api_key in ["your_openrouter_api_key_here", "insert_your_openrouter_api_key"]:
        print("❌ Error: OpenRouter API key not configured!")
        print("🔑 Please add your API key to the .env file:")
        print("   OPENROUTER_API_KEY=your_actual_api_key")
        print("   Get an API key at: https://openrouter.ai/")
        return False
    
    return True

def main():
    """Main startup function."""
    print("🤖 LLM Turing Test Battle")
    print("=" * 30)
    
    # Check requirements first
    if not check_requirements():
        sys.exit(1)
    
    print("✅ Environment check passed!")
    print("🚀 Starting web application...")
    print("🌐 Open your browser to: http://localhost:5001")
    print("🛑 Press Ctrl+C to stop")
    print()
    
    # Add webapp directory to Python path
    webapp_path = os.path.join(os.path.dirname(__file__), 'webapp')
    sys.path.insert(0, webapp_path)
    
    # Import and run the Flask app
    try:
        from webapp.app import app
        app.run(host='0.0.0.0', port=5001, debug=False)
    except KeyboardInterrupt:
        print("\n👋 Shutting down gracefully...")
    except Exception as e:
        print(f"❌ Error starting application: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()