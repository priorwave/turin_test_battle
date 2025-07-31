import os
import json
import uuid
import sqlite3
import re
from openai import OpenAI
from dotenv import load_dotenv
from database import get_db_connection
from prompts import get_participant_system_prompt, get_interrogator_system_prompt, get_judgment_prompt

load_dotenv()


API_KEY = os.getenv("OPENROUTER_API_KEY")


HTTP_REFERER = os.getenv("HTTP_REFERER", "<YOUR_SITE_URL>")
X_TITLE = os.getenv("X_TITLE", "<YOUR_SITE_NAME>")

# Default models for the game
# The "Participant" model tries to act as a person. Creative, conversational models work well.
PARTICIPANT_MODEL = "moonshotai/kimi-k2"
# The "Interrogator" model asks questions and makes the final judgment. Analytical models are ideal.
INTERROGATOR_MODEL = "openai/gpt-4o-mini"

# The number of questions the interrogator gets to ask.
NUMBER_OF_QUESTIONS = 5


# --- API Client Setup ---
client = OpenAI(
  base_url="https://openrouter.ai/api/v1",
  api_key=API_KEY,
)

def get_llm_response(model: str, messages: list) -> str:
    """
    Calls the OpenRouter API to get a response from a specified model.
    """
    # Initialize client here to ensure it picks up the latest API key
    client = OpenAI(
      base_url="https://openrouter.ai/api/v1",
      api_key=os.getenv("OPENROUTER_API_KEY"),
    )
    try:
        completion = client.chat.completions.create(
            extra_headers={
                "HTTP-Referer": HTTP_REFERER,
                "X-Title": X_TITLE,
            },
            model=model,
            messages=messages
        )
        return completion.choices[0].message.content.strip()
    except Exception as e:
        print(f"API error with model {model}: {e}")
        return "I am unable to respond at the moment. Please check your API key and try again."

def save_game_run(run_id, interrogator_model, participant_model, interrogator_system_prompt, participant_system_prompt, conversation, judgment, verdict, run_by):
    """Saves the completed game run to the database.
    
    Args:
        run_id: Unique identifier for this game run
        interrogator_model: Model used as interrogator
        participant_model: Model used as participant
        interrogator_system_prompt: System prompt for interrogator
        participant_system_prompt: System prompt for participant
        conversation: Full conversation history
        judgment: Interrogator's reasoning
        verdict: Final verdict (Human/AI)
        run_by: Identifier for who ran the game
    """
    conn = get_db_connection()
    if conn is None:
        return

    try:
        cursor = conn.cursor()
        sql = """
            INSERT INTO game_runs (run_id, interrogator_model, participant_model, interrogator_system_prompt, participant_system_prompt, conversation, judgment, verdict, run_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """
        val = (run_id, interrogator_model, participant_model, interrogator_system_prompt, participant_system_prompt, json.dumps(conversation), judgment, verdict, run_by)
        cursor.execute(sql, val)
        conn.commit()
        print(f"Game run {run_id} saved successfully to SQLite.")
    except sqlite3.Error as e:
        print(f"Error saving game run to SQLite: {e}")
    finally:
        if conn:
            conn.close()

def play_turing_test_game(participant_model, interrogator_model, num_questions):
    """
    Main function to orchestrate the Turing Test game between two LLMs.
    """
    run_id = str(uuid.uuid4())
    print(f"--- Welcome to the LLM Turing Test Game (Run ID: {run_id}) ---")
    print(f"Interrogator Model: {interrogator_model}")
    print(f"'Participant' Model: {participant_model}\n")

    # System prompts define the roles for each LLM
    participant_system_prompt = get_participant_system_prompt()

    interrogator_system_prompt = get_interrogator_system_prompt(num_questions)

    participant_messages = [{"role": "system", "content": participant_system_prompt}]
    interrogator_messages = [{"role": "system", "content": interrogator_system_prompt}]

    # The interrogator asks the first question to kick off the game
    question = get_llm_response(interrogator_model, interrogator_messages)
    interrogator_messages.append({"role": "assistant", "content": question})
    yield json.dumps({"role": "interrogator", "content": question, "turn": 1})

    # Main game loop for the specified number of turns
    for i in range(num_questions):
        # 1. The participant model answers the question
        participant_messages.append({"role": "user", "content": question})
        answer = get_llm_response(participant_model, participant_messages)
        participant_messages.append({"role": "assistant", "content": answer})
        yield json.dumps({"role": "human", "content": answer})

        # Add the participant's answer to the interrogator's conversation history
        interrogator_messages.append({"role": "user", "content": answer})

        # 2. If it's not the last turn, the interrogator asks the next question
        if i < num_questions - 1:
            question = get_llm_response(interrogator_model, interrogator_messages)
            interrogator_messages.append({"role": "assistant", "content": question})
            yield json.dumps({"role": "interrogator", "content": question, "turn": i + 2})

    # --- Final Judgment ---
    judgment_prompt = get_judgment_prompt()
    
    interrogator_messages.append({"role": "user", "content": judgment_prompt})
    
    final_judgment_text = get_llm_response(interrogator_model, interrogator_messages)
    yield json.dumps({"role": "judgment", "content": final_judgment_text})

    # --- Save Game Run ---
    verdict = "Unknown"
    judgment_for_db = final_judgment_text.strip()

    # Use regex to find the verdict and clean the judgment text
    verdict_match = re.search(r"Final Verdict:\s*(Human|AI)", final_judgment_text, re.IGNORECASE)
    if verdict_match:
        verdict = verdict_match.group(1).capitalize()
        # Remove the verdict line from the judgment text for a cleaner log
        judgment_for_db = re.sub(r"^\s*Final Verdict:.*$", "", judgment_for_db, flags=re.MULTILINE | re.IGNORECASE).strip()

    # The full conversation history for context
    conversation_history = {
        "interrogator_transcript": interrogator_messages,
        "participant_transcript": participant_messages
    }

    save_game_run(
        run_id=run_id,
        interrogator_model=interrogator_model,
        participant_model=participant_model,
        interrogator_system_prompt=interrogator_system_prompt,
        participant_system_prompt=participant_system_prompt,
        conversation=conversation_history,
        judgment=judgment_for_db,
        verdict=verdict,
        run_by="webapp"  # Or could be a user ID in a multi-user system
    )


if __name__ == "__main__":
    # For standalone execution, ensure .env is loaded.
    from dotenv import load_dotenv
    load_dotenv()
    
    api_key_check = os.getenv("OPENROUTER_API_KEY")
    if not api_key_check or api_key_check == "YOUR_OPENROUTER_API_KEY":
        print("Warning: OPENROUTER_API_KEY is not set or is a placeholder.")
        print("Please create a .env file in the project root and add your key.")
    else:
        for message in play_turing_test_game(PARTICIPANT_MODEL, INTERROGATOR_MODEL, NUMBER_OF_QUESTIONS):
            print(message)
