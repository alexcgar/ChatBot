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
    question_descriptions = data.get("questionDescriptions", [])  # Lista de todas las descripciones

    if not project_description:
        return jsonify({"error": "Falta el campo 'description'"}), 400

    if not openai_client:
        return jsonify({"error": "Cliente OpenAI no inicializado"}), 500

    # Procesar campos en lotes más pequeños
    batch_size = 30  # Ajusta según sea necesario
    all_extracted_data = {}
    auto_completed_fields = []  # Lista para seguir qué campos fueron autocompletados
    
    for i in range(0, len(question_descriptions), batch_size):
        batch = question_descriptions[i:i+batch_size]
        
        # Preparar lista de campos para este lote
        fields_to_extract = []
        for desc in batch:
            if desc == "Tipo De Oferta":
                fields_to_extract.append(f"- {desc} (opciones válidas exactas: 'B (En firme)', 'A (Estimada)', 'NINGUNO')")
            else:
                fields_to_extract.append(desc)

        # Formatear campos para el prompt
        fields_prompt_list = "\n".join([f"- {field}" for field in fields_to_extract])

        try:
            messages = [
                {"role": "system", "content": (
                    "Eres un asistente experto en agricultura que extrae información estructurada "
                    "de descripciones de proyectos agrícolas. A partir del texto proporcionado por el usuario, "
                    "extrae únicamente los siguientes campos en formato JSON. "
                    "Usa exactamente los nombres de campo proporcionados:\n"
                    f"{fields_prompt_list}\n\n"
                    "Rellena solo los campos que puedas deducir con alta confianza a partir del texto. "
                    "Si algún campo no está presente o no puedes deducirlo con certeza, devuélvelo con valor null. "
                    "No inventes datos. No añadas explicaciones o campos adicionales."
                )},
                {"role": "user", "content": project_description}
            ]

            chat_completion = openai_client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=messages,
                temperature=0.0,
                max_tokens=1000
            )

            extracted_data = chat_completion.choices[0].message.content.strip()
            
            # Parsear JSON (con manejo de errores mejorado como en la Solución 1)
            import json
            try:
                # Si la respuesta viene envuelta en bloques de código, limpiarla
                extracted_data = extracted_data.strip()
                
                if extracted_data.startswith("```json"):
                    extracted_data = extracted_data[7:].strip()
                elif extracted_data.startswith("```"):
                    extracted_data = extracted_data[3:].strip()
                if extracted_data.endswith("```"):
                    extracted_data = extracted_data[:-3].strip()
                
                # Intenta corregir JSON truncado o malformado
                if extracted_data.endswith(","):
                    extracted_data = extracted_data[:-1] + "}"
                
                # Asegurar que hay llaves de apertura y cierre
                if not extracted_data.startswith("{"):
                    extracted_data = "{" + extracted_data
                if not extracted_data.endswith("}"):
                    extracted_data = extracted_data + "}"
                
                # Intentar parsear
                extracted_json = json.loads(extracted_data)
                
                # Registrar los campos autocompletados (aquellos con valor no nulo)
                for field, value in extracted_json.items():
                    if value is not None and value != "":
                        # Añadir el campo a all_extracted_data
                        all_extracted_data[field] = value
                        # Marcar este campo como autocompletado si no está ya en la lista
                        if field not in auto_completed_fields:
                            auto_completed_fields.append(field)
                
            except json.JSONDecodeError as json_err:
                print(f"Error parsing JSON: {json_err}")
                print(f"Raw response: {extracted_data}")
                
                # Plan B: Crear un JSON con los campos que podamos extraer
                try:
                    # Regex para extraer pares clave-valor
                    import re
                    pairs = re.findall(r'"([^"]+)"\s*:\s*("[^"]*"|null|\d+|true|false)', extracted_data)
                    
                    if pairs:
                        fallback_json = "{"
                        for i, (key, value) in enumerate(pairs):
                            fallback_json += f'"{key}":{value}'
                            if i < len(pairs) - 1:
                                fallback_json += ","
                        fallback_json += "}"
                        
                        extracted_json = json.loads(fallback_json)
                        
                        # Registrar solo los campos autocompletados
                        for field, value in extracted_json.items():
                            if value is not None and value != "" and value != "null":
                                all_extracted_data[field] = value
                                if field not in auto_completed_fields:
                                    auto_completed_fields.append(field)
                except:
                    pass
                
                print(f"Error parsing response from AI, raw response: {extracted_data}")
                continue

        except Exception as e:
            print(f"Error al procesar lote {i}-{i+batch_size}: {e}")
            # Continuar con el siguiente lote

    # Devolver todos los datos extraídos y qué campos fueron autocompletados
    return jsonify({
        "data": all_extracted_data,
        "autoCompletedFields": auto_completed_fields
    })


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
