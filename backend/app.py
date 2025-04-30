import os
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
from openai import OpenAI

# Cargar variables de entorno
load_dotenv()

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "http://localhost:5173"}})

# Inicializar cliente OpenAI
try:
    openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    if not openai_client.api_key:
        raise ValueError("OpenAI API key not found in .env file")
except Exception as e:
    print(f"Error initializing OpenAI client: {e}")
    openai_client = None


@app.route("/generate_question", methods=["POST"])
def generate_question():
    data = request.json
    user_input = data.get("input")

    if not user_input:
        return jsonify({"error": "Falta el campo 'input'"}), 400

    if not openai_client:
        return jsonify({"error": "Cliente OpenAI no inicializado"}), 500

    try:
        messages = [
            {
                "role": "system",
                "content": (
                    "Eres un asistente virtual que ayuda a recopilar datos específicos "
                    "sobre proyectos agrícolas. Tu tarea es formular preguntas breves, "
                    "claras y directas para obtener información concreta del usuario. "
                    "No des explicaciones ni formules preguntas largas o complejas. "
                    "Limítate a pedir directamente el dato específico indicado por el usuario."
                ),
            },
            {
                "role": "user",
                "content": f"Formula una pregunta breve y directa para pedir este dato: '{user_input}'",
            },
        ]

        chat_completion = openai_client.chat.completions.create(
            model="gpt-3.5-turbo", messages=messages, temperature=0.1, max_tokens=50
        )

        generated_question = chat_completion.choices[0].message.content.strip()

        return jsonify({"question": generated_question})

    except Exception as e:
        print(f"Error al llamar a OpenAI: {e}")
        return jsonify({"error": "Error al generar la pregunta"}), 500


@app.route("/extract_project_data", methods=["POST"])
def extract_project_data():
    data = request.json
    project_description = data.get("description")

    if not project_description:
        return jsonify({"error": "Falta el campo 'description'"}), 400

    if not openai_client:
        return jsonify({"error": "Cliente OpenAI no inicializado"}), 500

    # List of all fields to extract
    fields_to_extract = [
        "CodCompany",
        "Oportunidad",
        "Referencia",
        "- Tipo De Oferta (opciones válidas exactas: 'B (En firme)', 'A (Estimada)', 'NINGUNO')\n",
        "Destino",
        "Filtro Proyecto",
    ]

    # Format the fields for the prompt
    fields_prompt_list = "\n".join([f"- {field}" for field in fields_to_extract])

    try:
        messages = [
            {
                "role": "system",
                "content": (
                    "Eres un asistente experto en agricultura que extrae información estructurada "
                    "de descripciones de proyectos agrícolas. A partir del texto proporcionado por el usuario, "
                    "extrae únicamente los siguientes campos en formato JSON. Usa exactamente los nombres de campo proporcionados:\n"
                    f"{fields_prompt_list}\n\n"
                    "Rellena solo los campos que puedas deducir con alta confianza a partir del texto. "
                    "Si algún campo no está presente o no puedes deducirlo con certeza, devuélvelo con valor null. "
                    "No inventes datos. No añadas explicaciones."
                ),
            },
            {"role": "user", "content": project_description},
        ]

        chat_completion = openai_client.chat.completions.create(
            model="gpt-3.5-turbo", messages=messages, temperature=0.0, max_tokens=1500
        )

        extracted_data = chat_completion.choices[0].message.content.strip()

        # Attempt to parse the JSON response
        import json

        try:
            if extracted_data.startswith("```json"):
                extracted_data = extracted_data[7:-3].strip()
            extracted_json = json.loads(extracted_data)
        except json.JSONDecodeError as json_err:
            print(f"Error decoding JSON from OpenAI: {json_err}")
            print(f"Raw response: {extracted_data}")
            return (
                jsonify(
                    {
                        "error": "Error al decodificar la respuesta de la IA",
                        "raw_response": extracted_data,
                    }
                ),
                500,
            )

        return jsonify({"data": extracted_json})

    except Exception as e:
        print(f"Error al llamar a OpenAI o procesar la respuesta: {e}")
        return jsonify({"error": "Error al extraer los datos"}), 500


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
