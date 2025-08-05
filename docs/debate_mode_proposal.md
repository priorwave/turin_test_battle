# Debate Mode Feature Proposal

## Overview
Introduce a new Debate Mode where two AI models debate a chosen topic with configurable roles, turn limits, and response lengths. This leverages the existing Flask app, OpenRouter model catalog, streaming UX, and SQLite logging.

## Goals
- Allow user to select a debate topic/proposition
- Choose a model for the Pro (argue for) and a model for the Con (argue against)
- Configure number of turns per side and approximate length per response
- Stream debate in real time to the UI, similar to current game
- Persist debates and show them alongside existing battle history and leaderboard (or in a dedicated tab)

## Key Concepts
- **Debate**: a structured exchange between two roles, Pro and Con, guided by a Moderator prompt (system)
- **Turn**: one side produces a single response before yielding to the other
- **Round**: consists of a Pro turn and a Con turn; total turns = rounds × 2

## Current Architecture Summary
- **Backend**: Flask app with Server-Sent Events endpoint at [`GET /api/play`](webapp/app.py:44) using [`play_turing_test_game`](game.py:93) in [`game.py`](game.py:1)
- **Prompts**: Role-specific system prompts in [`prompts.py`](prompts.py:1)
- **Models**: Discovered via OpenRouter in [`get_models.py`](get_models.py:1)
- **Database**: SQLite for `game_runs` with helpers in [`database.py`](database.py:1) and used in [`game.py`](game.py:59)
- **Frontend**: [`index.html`](webapp/templates/index.html:1) + [`script.js`](webapp/static/script.js:1) for the main battle UI and [`battles.html`](webapp/templates/battles.html:1) + [`battles.js`](webapp/static/battles.js:1) for history/leaderboard

## Functional Specification

### User Flow
1. Navigate to Debate Mode page via nav link "Debate Mode"
2. Choose Topic/Proposition (text)
3. Select Pro Model and Con Model (dropdowns powered by [`/api/models`](webapp/app.py:27))
4. Configure:
   - Turns per side (e.g., 1–10)
   - Approx words per response (e.g., 50–400)
   - Optional: Opening statements on/off; Rebuttal rounds on/off; Closing statements on/off (v2)
5. Start Debate: stream updates in a conversation pane
6. End of Debate: show optional auto-summary and "winner" determination if configured (v2), and offer save/share

### Inputs
- `topic`: string (required)
- `pro_model`: string (required, OpenRouter model id)
- `con_model`: string (required, OpenRouter model id)
- `turns_per_side`: int (required; default 3; bounds 1–10)
- `approx_words`: int (required; default 150; bounds 50–400)

### Outputs
- Real-time SSE stream messages with roles: moderator (optional), pro, con, summary (v2), meta messages
- Persisted record in SQLite
- Display in Debate History UI with ability to open a detail modal (similar to battles)

### Constraints and Validation
- `pro_model` and `con_model` must be valid OpenRouter model IDs (from [`get_model_list`](get_models.py:5))
- `turns_per_side` must be between 1 and 10
- `approx_words` must be between 50 and 400
- Topic must be non-empty and reasonable length (e.g., 10–500 chars)

## Technical Design

### Backend Changes

#### 1. New Prompts in [`prompts.py`](prompts.py:1)
Add three new prompt functions:
- `get_pro_system_prompt(topic, approx_words)`: Instructs model to argue FOR the topic, be persuasive, stay within word limit
- `get_con_system_prompt(topic, approx_words)`: Instructs model to argue AGAINST the topic, be persuasive, stay within word limit
- `get_moderator_system_prompt()`: Optional system prompt for debate structure/rules (v2)

Example structure:
```python
def get_pro_system_prompt(topic, approx_words):
    return f"""
    You are arguing FOR the proposition: "{topic}"
    Be persuasive, use evidence and logic, and keep responses under {approx_words} words.
    Do not concede points or agree with the opposition.
    """
```

#### 2. New Game Logic in [`game.py`](game.py:1)
Add `play_debate_game(pro_model, con_model, topic, turns_per_side, approx_words)`:
- Similar structure to [`play_turing_test_game`](game.py:93)
- Initialize two message histories (pro_messages, con_messages)
- Alternate between pro and con for specified turns
- Stream each message as JSON with role: "pro" or "con"
- Save to database using new schema (see below)

#### 3. New API Endpoints in [`webapp/app.py`](webapp/app.py:1)
- `GET /debate` - renders debate setup page (new template)
- `GET /api/debate/play` - starts debate, returns SSE stream (like [`/api/play`](webapp/app.py:44))
- `GET /api/debates` - list past debates (like [`/api/battles`](webapp/app.py:75))
- `GET /api/debate/<debate_id>` - get detailed debate (like [`/api/battle/<run_id>`](webapp/app.py:83))

#### 4. Database Schema Extensions in [`database.py`](database.py:1)
Create separate `debate_runs` table (recommended for cleaner separation):
```sql
CREATE TABLE debate_runs (
    debate_id TEXT PRIMARY KEY,
    topic TEXT,
    pro_model TEXT,
    con_model TEXT,
    turns_per_side INTEGER,
    approx_words INTEGER,
    conversation TEXT, -- JSON with pro/con messages
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**Note**: For future improvements, we could design a more flexible table structure that handles multiple game modes (Turing Test, Debates, etc.) in a unified schema. However, for now we'll keep it simple with a dedicated debate table to maintain clarity and avoid over-engineering.

### Frontend Changes

#### 1. New Debate Setup Page: [`webapp/templates/debate.html`](webapp/templates/debate.html:1)
- Similar layout to [`index.html`](webapp/templates/index.html:1) but with debate-specific fields
- Form with:
  - Topic input (textarea)
  - Pro model dropdown
  - Con model dropdown
  - Turns per side (number input)
  - Approx words (number input)
  - Start Debate button

#### 2. New Debate JavaScript: [`webapp/static/debate.js`](webapp/static/debate.js:1)
- Handle form submission and validation
- Connect to `/api/debate/play` SSE stream
- Render pro/con messages in conversation area (different styling than interrogator/participant)
- Handle debate completion

#### 3. Extend Battles UI for Debates
- Modify [`battles.html`](webapp/templates/battles.html:1) to show both Turing Tests and Debates
- Add filter/tabs to switch between game types
- Update [`battles.js`](webapp/static/battles.js:1) to handle debate display
- Add debate-specific styling in [`style.css`](webapp/static/style.css:1)

#### 4. Navigation Updates
- Add "Debate Mode" link to header nav in both [`index.html`](webapp/templates/index.html:18) and [`battles.html`](webapp/templates/battles.html:14)

### Data Flow
1. User submits debate form → POST to `/api/debate/play`
2. [`play_debate_game()`](game.py:1) orchestrates:
   - Sets up system prompts for pro/con
   - Alternates calls to [`get_llm_response()`](game.py:36) for each side
   - Yields JSON messages for SSE stream
3. Frontend receives and displays messages in real-time
4. On completion, saves to SQLite via new database functions
5. Debate appears in history with dedicated view

### Error Handling
- Reuse existing error patterns from [`play_turing_test_game`](game.py:93)
- Validate all inputs before starting debate
- Handle API errors gracefully with user-friendly messages
- Log errors for debugging

## Implementation Plan & Milestones

### Phase 1: Core Debate Backend (MVP)
**Goal**: Basic debate functionality with streaming and persistence

1. **Database Schema**
   - Create `debate_runs` table in [`database.py`](database.py:1)
   - Add CRUD functions: `save_debate_run()`, `get_past_debates()`, `get_debate_details()`
   - (2 hours)

2. **Prompts**
   - Implement `get_pro_system_prompt()` and `get_con_system_prompt()` in [`prompts.py`](prompts.py:1)
   - Test prompts with sample topics
   - (1 hour)

3. **Game Logic**
   - Implement `play_debate_game()` in [`game.py`](game.py:1)
   - Reuse [`get_llm_response()`](game.py:36) for API calls
   - Implement message alternation logic
   - Add debate saving to database
   - (4 hours)

4. **API Endpoints**
   - Add `GET /api/debate/play` SSE endpoint in [`app.py`](webapp/app.py:1)
   - Add debate listing and detail endpoints
   - (2 hours)

**Phase 1 Total**: ~9 hours

### Phase 2: Frontend Debate UI
**Goal**: Complete user interface for creating and viewing debates

1. **Debate Setup Page**
   - Create [`debate.html`](webapp/templates/debate.html:1) template
   - Add debate form with all required fields
   - Style to match existing UI
   - (3 hours)

2. **Debate JavaScript**
   - Create [`debate.js`](webapp/static/debate.js:1) for form handling
   - Implement SSE connection and message rendering
   - Add pro/con message styling
   - (4 hours)

3. **Navigation Integration**
   - Add "Debate Mode" link to header nav
   - Update routing in [`app.py`](webapp/app.py:1)
   - (1 hour)

**Phase 2 Total**: ~8 hours

### Phase 3: History & Leaderboard Integration
**Goal**: Display debates alongside Turing Tests

1. **Extend Battles UI**
   - Modify [`battles.html`](webapp/templates/battles.html:1) to show debates
   - Add game type filter/tabs
   - (2 hours)

2. **Update Battles JavaScript**
   - Extend [`battles.js`](webapp/static/battles.js:1) to handle debate display
   - Add debate-specific conversation rendering
   - (3 hours)

3. **Database Queries**
   - Update leaderboard functions to include debates
   - Add debate-specific statistics
   - (2 hours)

**Phase 3 Total**: ~7 hours

### Phase 4: Polish & Enhancements (v2)
**Goal**: Advanced features and improvements

1. **Enhanced Prompts**
   - Add moderator system for structured debates
   - Implement opening/closing statements
   - Add rebuttal rounds
   - (3 hours)

2. **Winner Determination**
   - Add AI judge to evaluate debates
   - Display winner reasoning
   - (3 hours)

3. **Export/Share**
   - Add debate export functionality
   - Implement shareable links
   - (2 hours)

**Phase 4 Total**: ~8 hours

### Total Estimated Effort: ~32 hours

## Success Metrics
- Users can successfully create and watch debates in real-time
- Debates are saved and viewable in history
- No regression in existing Turing Test functionality
- Code reuses existing patterns and maintains consistency

## Risks & Mitigations
- **API Cost**: Debates may use more tokens than Turing Tests
  - Mitigation: Add token usage tracking and warnings
- **UI Complexity**: Adding debates may clutter existing interface
  - Mitigation: Use clear separation and filtering
- **Database Performance**: Additional debates may slow queries
  - Mitigation: Add pagination and indexing

## Future Enhancements
- Multi-model debates (3+ participants)
- Human vs AI debates
- Debate templates and presets
- Real-time audience voting/judging
- Debate analysis and scoring metrics
- **Flexible Database Schema**: Design a unified table structure that can handle multiple game modes (Turing Test, Debates, etc.) with type-specific columns and metadata