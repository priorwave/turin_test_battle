import requests
import json


def get_model_list():
    """
    Fetches the list of models from the OpenRouter API and filters to only include
    models that support text input and text output.

    Returns:
        list: A list of text-capable models if the request is successful, otherwise an empty list.
    """
    url = "https://openrouter.ai/api/v1/models"
    try:
        response = requests.get(url)
        response.raise_for_status()  # Raise an exception for bad status codes (4xx or 5xx)
        models = response.json()
        all_models = models.get("data", [])
        
        # Filter models to only include those with text input and output modalities
        text_models = []
        for model in all_models:
            if _supports_text_modalities(model):
                text_models.append(model)
        
        return text_models
    except requests.exceptions.RequestException as e:
        print(f"Error fetching models: {e}")
        return []


def _supports_text_modalities(model):
    """
    Check if a model supports both text input and text output modalities.
    
    Args:
        model (dict): Model data from the API
        
    Returns:
        bool: True if the model supports text input and output, False otherwise
    """
    # Check if model has architecture field
    architecture = model.get("architecture")
    if not architecture:
        return False
    
    # Get input and output modalities
    input_modalities = architecture.get("input_modalities", [])
    output_modalities = architecture.get("output_modalities", [])
    
    # Check if both input and output modalities contain "text"
    return "text" in input_modalities and "text" in output_modalities

if __name__ == "__main__":
    model_list = get_model_list()
    if model_list:
        print(f"Successfully fetched {len(model_list)} text-capable models.")
        # Print all details of the first model as an example
        for model in model_list[:1]:
            print("---")
            print(f"Example model: {model.get('name', 'Unknown')}")
            print(f"Input modalities: {model.get('architecture', {}).get('input_modalities', [])}")
            print(f"Output modalities: {model.get('architecture', {}).get('output_modalities', [])}")
            print("---")
            print(json.dumps(model, indent=4))
    else:
        print("Failed to fetch model list.")