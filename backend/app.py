import os
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from dotenv import load_dotenv
from openai import OpenAI
import requests
import logging

# Cargar variables de entorno
load_dotenv()

# Configuración para servir archivos estáticos
app = Flask(__name__, static_folder="static", static_url_path="/")
CORS(app, resources={r"/*": {"origins": "*"}})

# Configurar logging
logging.basicConfig(level=logging.DEBUG)

# Inicializar cliente OpenAI
try:
    openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    if not openai_client.api_key:
        raise ValueError("OpenAI API key not found in .env file")
except Exception as e:
    print(f"Error initializing OpenAI client: {e}")
    openai_client = None

# Almacenamiento en memoria para sesiones de chat
# En producción debería usar una base de datos real
session_store = {}

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

    # MEJORA: Detectar si es un mensaje corto para optimizar el prompt
    is_short_message = len(project_description.split()) < 30
    
    # Para mensajes cortos, usar lotes más pequeños para mejorar precisión
    batch_size = 10 if is_short_message else 30
    
    # Debug info
    print(f"Procesando mensaje {'corto' if is_short_message else 'largo'} con batch_size={batch_size}")
    print(f"Cantidad de campos a extraer: {len(question_descriptions)}")
    
    # Almacenar resultados
    all_extracted_data = {}
    auto_completed_fields = []  # Lista para seguir qué campos fueron autocompletados
    
    for i in range(0, len(question_descriptions), batch_size):
        batch = question_descriptions[i:i+batch_size]
        
        # Preparar lista de campos para este lote
        fields_to_extract = []
        for desc in batch:
            if "Tipo De Oferta" in desc:
                fields_to_extract.append(f"- {desc} (opciones válidas exactas: 'B (En firme)', 'A (Estimada)', 'NINGUNO')")
            else:
                fields_to_extract.append(desc)

        # Formatear campos para el prompt
        fields_prompt_list = "\n".join([f"- {field}" for field in fields_to_extract])
        
        # CORRECCIÓN: Usar el template adecuado según el tipo de mensaje
        if is_short_message:
            system_content = (
                "Eres un asistente experto en extraer información específica de mensajes cortos "
                "sobre proyectos agrícolas. El usuario enviará mensajes breves que pueden contener "
                "información para completar campos de un formulario. Extrae ÚNICAMENTE los datos "
                "que se mencionan explícitamente, sin inferir información adicional. "
                "Extrae los siguientes campos en formato JSON:\n"
                f"{fields_prompt_list}\n\n"
                "Devuelve SOLO los campos que puedas extraer con certeza absoluta del mensaje. "
                "Si no hay información clara para un campo, omítelo completamente."
            )
        else:
            system_content = (
                "Eres un asistente experto en agricultura que extrae información estructurada "
                "de descripciones de proyectos agrícolas. A partir del texto proporcionado por el usuario, "
                "extrae únicamente los siguientes campos en formato JSON. "
                "Usa exactamente los nombres de campo proporcionados:\n"
                f"{fields_prompt_list}\n\n"
                "Rellena solo los campos que puedas deducir con alta confianza a partir del texto. "
                "Si algún campo no está presente o no puedes deducirlo con certeza, omítelo completamente. "
                "No inventes datos. No añadas explicaciones o campos adicionales."
            )

        try:
            messages = [
                {"role": "system", "content": system_content},
                {"role": "user", "content": project_description}
            ]

            chat_completion = openai_client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=messages,
                temperature=0.0,
                max_tokens=1000
            )

            extracted_data = chat_completion.choices[0].message.content.strip()
            
            # Resto del código existente para procesar la respuesta...
            # [Mantener el código de procesamiento JSON sin cambios]
            
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


@app.route("/start", methods=["POST"])
def start_session():
    data = request.json
    session_id = data.get("session_id")
    existing_answers = data.get("existing_answers", {})
    
    if not session_id:
        return jsonify({"error": "Falta el campo 'session_id'"}), 400
        
    # Guardar la sesión con las respuestas iniciales
    session_store[session_id] = {
        "answers": existing_answers,
        "started_at": str(os.path.getmtime(__file__))  # Timestamp para seguimiento
    }
    
    return jsonify({
        "status": "success",
        "message": "Sesión iniciada correctamente",
        "session_id": session_id
    })


@app.route("/answer", methods=["POST"])
def save_answer():
    data = request.json
    session_id = data.get("session_id")
    answer = data.get("answer")
    
    if not session_id:
        return jsonify({"error": "Falta el campo 'session_id'"}), 400
        
    if not answer:
        return jsonify({"error": "Falta el campo 'answer'"}), 400
        
    # Verificar si la sesión existe
    if session_id not in session_store:
        return jsonify({"error": "La sesión no existe o ha expirado"}), 404
        
    # Almacenar la respuesta (asumiendo que answer tiene una estructura con ID de pregunta)
    # Si answer es un diccionario, agregar cada clave-valor
    if isinstance(answer, dict):
        for key, value in answer.items():
            session_store[session_id]["answers"][key] = value
    else:
        # Si es un solo valor, guardarlo con una clave genérica
        answer_id = f"answer_{len(session_store[session_id]['answers']) + 1}"
        session_store[session_id]["answers"][answer_id] = answer
    
    return jsonify({
        "status": "success",
        "message": "Respuesta guardada correctamente"
    })


# Proxy para la API externa de preguntas
@app.route('/api/HTDV2/consult', methods=['POST'])
def proxy_external_api():
    try:
        print(">>> Recibida petición al proxy de la API externa")
        print(f">>> Headers: {request.headers}")
        print(f">>> Body: {request.json}")
        
        # Obtener el token de la cabecera
        auth_header = request.headers.get('Authorization')
        if not auth_header:
            return jsonify({"error": "Falta el token de autorización"}), 401
        
        # Preparar la solicitud para reenviar a la API externa
        headers = {
            'Authorization': auth_header,
            'Content-Type': 'application/json'
        }
        
        # URL real de la API externa
        external_api_url = 'https://erp.wskserver.com:56544/api/HTDV2/consult'
        
        # Reenviar la solicitud a la API externa
        response = requests.post(
            external_api_url, 
            headers=headers, 
            json=request.json,
            verify=True  # Si la API externa usa HTTPS con un certificado válido
        )
        
        # Antes de devolver la respuesta
        print(f">>> Respuesta de la API externa: {response.status_code}")
        print(f">>> Contenido: {response.text[:200]}...")  # Primeros 200 caracteres
        
        return response.json(), response.status_code
    except Exception as e:
        print(f">>> ERROR en proxy_external_api: {e}")
        return jsonify({"error": f"Error: {str(e)}"}), 500


# Ruta para servir el frontend
@app.route("/", defaults={"path": ""})
@app.route("/<path:path>")
def serve_frontend(path):
    if path != "" and os.path.exists(os.path.join(app.static_folder, path)):
        return send_from_directory(app.static_folder, path)
    else:
        return send_from_directory(app.static_folder, "index.html")


if __name__ == "__main__":
    # Verificar si existen los archivos del frontend
    if not os.path.exists(app.static_folder):
        print(f"\n⚠️ ADVERTENCIA: No se encontró la carpeta static en {app.static_folder}")
        print("Por favor, crea una carpeta 'static' en la raíz del backend y copia los archivos del frontend build allí.\n")
    else:
        index_path = os.path.join(app.static_folder, 'index.html')
        if not os.path.exists(index_path):
            print(f"\n⚠️ ADVERTENCIA: No se encontró el archivo index.html en {app.static_folder}")
            print("Por favor, asegúrate de que el build del frontend se ha copiado correctamente a la carpeta static.\n")
        else:
            print(f"\n✅ Frontend detectado correctamente en {app.static_folder}")
    
    # Iniciar servidor
    print("\n🚀 Iniciando servidor en http://localhost:5001\n")
    app.run(host="0.0.0.0", port=5002, debug=True)
