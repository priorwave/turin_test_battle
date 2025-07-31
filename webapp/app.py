
import os
import sys
from flask import Flask, render_template, request, jsonify, Response
import json

# Add the parent directory to the Python path to access game.py and get_models.py
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from game import play_turing_test_game
from get_models import get_model_list
from database import create_table_if_not_exists, get_past_battles, get_battle_details, get_leaderboard_stats

app = Flask(__name__)

# --- Database Initialization ---
with app.app_context():
    create_table_if_not_exists()

@app.route('/')
def index():
    """
    Renders the main page of the application.
    """
    return render_template('index.html')

@app.route('/api/models')
def api_get_models():
    """
    API endpoint to get the list of available models.
    """
    models = get_model_list()
    providers = sorted(list(set(model.get('id', '').split('/')[0] for model in models)))
    return jsonify({'models': models, 'providers': providers})

@app.route('/api/check_api_key')
def check_api_key():
    """
    API endpoint to check if the OpenRouter API key is set.
    """
    api_key = os.getenv('OPENROUTER_API_KEY')
    return jsonify({'api_key_set': bool(api_key and api_key != 'YOUR_OPENROUTER_API_KEY')})

@app.route('/api/play')
def play():
    """
    API endpoint to play the Turing Test game.
    """
    participant_model = request.args.get('participant_model')
    interrogator_model = request.args.get('interrogator_model')
    num_questions = int(request.args.get('num_questions', 5))

    if not all([participant_model, interrogator_model]):
        return jsonify({
            'error': 'Both participant and interrogator models must be selected'
        }), 400

    def event_stream():
        try:
            for message in play_turing_test_game(participant_model, interrogator_model, num_questions):
                yield f"data: {message}\n\n"
        except Exception as e:
            error_msg = f"Game error: {str(e)}. Please check your API key and model selection."
            yield f"data: {json.dumps({'error': error_msg})}\n\n"

    return Response(event_stream(), mimetype='text/event-stream')

@app.route('/battles')
def battles():
    """
    Renders the battles page showing past battles and leaderboard.
    """
    return render_template('battles.html')

@app.route('/api/battles')
def api_get_battles():
    """
    API endpoint to get past battles.
    """
    battles = get_past_battles()
    return jsonify({'battles': battles})

@app.route('/api/battle/<run_id>')
def api_get_battle_details(run_id):
    """
    API endpoint to get detailed battle information including full conversation.
    """
    battle = get_battle_details(run_id)
    if battle:
        return jsonify({'battle': battle})
    else:
        return jsonify({'error': 'Battle not found'}), 404

@app.route('/api/leaderboard')
def api_get_leaderboard():
    """
    API endpoint to get leaderboard statistics.
    """
    stats = get_leaderboard_stats()
    return jsonify(stats)


if __name__ == '__main__':
    # Only enable debug mode if explicitly set
    debug_mode = os.getenv('FLASK_DEBUG', 'False').lower() == 'true'
    app.run(debug=debug_mode, host='0.0.0.0', port=5001) 