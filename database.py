
import sqlite3
import os

DB_FILE = "turing_test_db.sqlite"

def get_db_connection():
    """Establishes a connection to the SQLite database."""
    try:
        conn = sqlite3.connect(DB_FILE)
        conn.row_factory = sqlite3.Row  # This allows accessing columns by name
        return conn
    except sqlite3.Error as e:
        print(f"Error connecting to SQLite: {e}")
        return None

def create_table_if_not_exists():
    """Creates the 'game_runs' table in SQLite if it doesn't already exist."""
    conn = get_db_connection()
    if conn is None:
        return

    try:
        cursor = conn.cursor()
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS game_runs (
                run_id TEXT PRIMARY KEY,
                interrogator_model TEXT,
                participant_model TEXT,
                interrogator_system_prompt TEXT,
                participant_system_prompt TEXT,
                conversation TEXT, -- Storing JSON as a TEXT field in SQLite
                judgment TEXT,
                verdict TEXT,
                run_by TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Migration: Add missing columns if they don't exist (for existing databases)
        try:
            cursor.execute("ALTER TABLE game_runs ADD COLUMN participant_model TEXT")
        except sqlite3.OperationalError:
            pass  # Column already exists
            
        try:
            cursor.execute("ALTER TABLE game_runs ADD COLUMN participant_system_prompt TEXT")
        except sqlite3.OperationalError:
            pass  # Column already exists
        conn.commit()
    except sqlite3.Error as e:
        print(f"Error creating table: {e}")
    finally:
        if conn:
            conn.close()

def get_past_battles(limit=50):
    """Fetches past battles from the database."""
    conn = get_db_connection()
    if conn is None:
        return []

    try:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT run_id, interrogator_model, participant_model, judgment, verdict, created_at
            FROM game_runs
            ORDER BY created_at DESC
            LIMIT ?
        """, (limit,))
        battles = cursor.fetchall()
        return [dict(battle) for battle in battles]
    except sqlite3.Error as e:
        print(f"Error fetching past battles: {e}")
        return []
    finally:
        if conn:
            conn.close()

def get_battle_details(run_id):
    """Fetches detailed battle information including full conversation."""
    conn = get_db_connection()
    if conn is None:
        return None

    try:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT *
            FROM game_runs
            WHERE run_id = ?
        """, (run_id,))
        battle = cursor.fetchone()
        return dict(battle) if battle else None
    except sqlite3.Error as e:
        print(f"Error fetching battle details: {e}")
        return None
    finally:
        if conn:
            conn.close()

def get_leaderboard_stats():
    """Generates leaderboard statistics for models."""
    conn = get_db_connection()
    if conn is None:
        return {"participant_stats": [], "interrogator_stats": []}

    try:
        cursor = conn.cursor()
        
        # Participant model stats (how often they fooled the interrogator)
        cursor.execute("""
            SELECT 
                participant_model,
                COUNT(*) as total_games,
                SUM(CASE WHEN verdict = 'Human' THEN 1 ELSE 0 END) as fooled_count,
                ROUND(
                    (SUM(CASE WHEN verdict = 'Human' THEN 1 ELSE 0 END) * 100.0 / COUNT(*)), 1
                ) as success_rate
            FROM game_runs
            WHERE participant_model IS NOT NULL
            GROUP BY participant_model
            HAVING total_games >= 1
            ORDER BY success_rate DESC, total_games DESC
        """)
        participant_stats = [dict(row) for row in cursor.fetchall()]
        
        # Interrogator model stats (how often they correctly identified AI)
        cursor.execute("""
            SELECT 
                interrogator_model,
                COUNT(*) as total_games,
                SUM(CASE WHEN verdict = 'AI' THEN 1 ELSE 0 END) as correct_count,
                ROUND(
                    (SUM(CASE WHEN verdict = 'AI' THEN 1 ELSE 0 END) * 100.0 / COUNT(*)), 1
                ) as success_rate
            FROM game_runs
            WHERE interrogator_model IS NOT NULL
            GROUP BY interrogator_model
            HAVING total_games >= 1
            ORDER BY success_rate DESC, total_games DESC
        """)
        interrogator_stats = [dict(row) for row in cursor.fetchall()]
        
        return {
            "participant_stats": participant_stats,
            "interrogator_stats": interrogator_stats
        }
    except sqlite3.Error as e:
        print(f"Error generating leaderboard stats: {e}")
        return {"participant_stats": [], "interrogator_stats": []}
    finally:
        if conn:
            conn.close()

if __name__ == '__main__':
    create_table_if_not_exists()
    print("SQLite database table check complete.") 