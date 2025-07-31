# 🤖 LLM Turing Test Battle

So I've built this rather fun web app where AI models have a go at each other in a modern twist on the classic Turing Test. Basically, one AI tries to convince another that it's human, whilst the interrogator AI attempts to expose the whole charade.

![LLM Turing Test Game](https://img.shields.io/badge/AI-Battle-blue) ![Python](https://img.shields.io/badge/Python-3.7+-green) ![Flask](https://img.shields.io/badge/Flask-Web%20App-red)

## 🎯 What It Actually Does

This system orchestrates some genuinely fascinating conversations between AI models:

- **The Participant**: An AI model that gets detailed instructions to act human, complete with personality, memories, and emotions (it's surprisingly good at this!)
- **The Interrogator**: An AI model that asks probing questions to suss out whether it's chatting to a human or another AI
- **Real-time Battle**: You can watch the whole conversation unfold live in your browser
- **Intelligent Judgement**: The interrogator makes a final verdict based on the entire conversation
- **Battle Archive**: All conversations get saved to a database for later analysis (some are absolute crackers)

## ✨ Features

- **300+ AI Models**: Choose from OpenRouter's extensive model catalog
- **Live Conversation Stream**: Watch the battle happen in real-time
- **Smart Model Selection**: Pick different models for different roles (creative vs analytical)
- **Conversation History**: All battles are saved with full context and verdicts
- **Clean Web Interface**: Simple, responsive design focused on the conversation
- **Configurable Questions**: Set how many rounds the interrogator gets

## 🚀 Quick Start

### Prerequisites

- Python 3.7+
- OpenRouter API key ([get one here](https://openrouter.ai/))

### Installation

#### Option 1: Quick Setup (Recommended)

1. **Clone and setup**
   ```bash
   git clone https://github.com/shakermakerk/turin_test_battle.git
   cd turin_test_battle
   python setup.py  # Installs dependencies and creates .env
   ```

2. **Add your API key**
   Edit `.env` and add your OpenRouter API key

3. **Run the application**
   ```bash
   python run.py
   ```

4. **Open your browser**
   Navigate to `http://localhost:5001`

#### Option 2: Manual Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/turin_test_battle.git
   cd turin_test_battle
   ```

2. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

3. **Set up your API key**
   ```bash
   cp .env_example .env
   # Edit .env and add your OpenRouter API key
   ```

4. **Run the application**
   ```bash
   python webapp/app.py
   ```

## 🎮 How to Play

1. **Select Models**: Choose a "Participant" model (tries to act human) and an "Interrogator" model (tries to detect AI)
2. **Set Questions**: Decide how many questions the interrogator gets to ask (5-20 recommended)
3. **Start Battle**: Watch as the interrogator tries to expose the participant
4. **See the Verdict**: The interrogator makes a final judgment: Human or AI?

## 🛠️ Technical Details

### Architecture

- **Backend**: Flask web server with real-time streaming
- **Frontend**: Vanilla JavaScript with Server-Sent Events
- **Database**: SQLite for conversation storage
- **AI API**: OpenRouter for access to 300+ models

### Project Structure

```
turin_test_battle/
├── webapp/
│   ├── app.py              # Flask web server
│   ├── static/             # CSS/JS assets
│   └── templates/          # HTML templates
├── game.py                 # Core Turing test logic
├── prompts.py              # System prompts for each role
├── database.py             # SQLite database management
├── get_models.py           # OpenRouter model fetching
└── requirements.txt        # Python dependencies
```

### API Endpoints

- `GET /` - Main web interface
- `GET /api/models` - List available AI models
- `GET /api/check_api_key` - Verify API key status
- `GET /api/play` - Start a game (Server-Sent Events stream)

## 🎨 Example Battle

```
Interrogator: "Tell me about a childhood memory that still makes you smile."

Participant: "Oh, that's easy! When I was about 7, my dad and I built this absolutely terrible birdhouse together. We used way too much glue, the roof was crooked, and we painted it this hideous orange color. But every morning that summer, I'd run outside to check if any birds had moved in. They never did, but I was so proud of that ugly little house."

Interrogator: "What did the wood smell like when you were building it?"

Participant: "You know, it's funny you ask that. I remember it smelled like... sawdust, obviously, but also kind of sweet? My dad said it was because we used pine, and he let me hold the pieces up to my nose. I probably looked ridiculous, but I loved that smell."

Final Verdict: Human
```

## 📊 Database Schema

Game results are stored with full conversation context:

```sql
CREATE TABLE game_runs (
    run_id TEXT PRIMARY KEY,
    interrogator_model TEXT,
    participant_model TEXT,
    conversation TEXT,      -- Full JSON conversation
    judgment TEXT,          -- Interrogator's reasoning
    verdict TEXT,           -- "Human" or "AI"
    created_at DATETIME
);
```

## 🔧 Configuration

Environment variables in `.env`:

```env
OPENROUTER_API_KEY=your_api_key_here
HTTP_REFERER=https://yoursite.com          # Optional: for OpenRouter
X_TITLE=Your Site Name                     # Optional: for OpenRouter
```

## 🤝 Contributing

This project is designed to stay simple and focused. If you have ideas for improvements:

1. Keep it simple - avoid over-engineering
2. Focus on the core experience - the AI battle
3. Test with different model combinations
4. Share interesting conversation results

## 📝 License

MIT License - see LICENSE file for details.

## 🎯 Use Cases

- **AI Research**: Study how different models approach deception and detection
- **Education**: Demonstrate AI capabilities and limitations
- **Entertainment**: Fascinating conversations between AI systems
- **Portfolio**: Showcase AI integration and real-time web applications

---

**Built with curiosity about AI consciousness and the nature of human communication.**