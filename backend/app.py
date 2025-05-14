import os
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from dotenv import load_dotenv
from openai import OpenAI
import requests
import logging
from datetime import datetime, timedelta, timezone
from cryptography.hazmat.primitives.serialization.pkcs12 import load_key_and_certificates

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
                    "No respondas cosas como no mencionado o no disponible. "
                    "Solo rellena el campo si puedes deducirlo con alta confianza a partir del texto. "
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
    # Lista de todas las descripciones
    question_descriptions = data.get("questionDescriptions", [])

    if not project_description:
        return jsonify({"error": "Falta el campo 'description'"}), 400

    if not openai_client:
        return jsonify({"error": "Cliente OpenAI no inicializado"}), 500

    # MEJORA: Detectar si es un mensaje corto para optimizar el prompt
    is_short_message = len(project_description.split()) < 30

    # Para mensajes cortos, usar lotes más pequeños para mejorar precisión
    batch_size = 10 if is_short_message else 30

    # Debug info
    print(
        f"Procesando mensaje {'corto' if is_short_message else 'largo'} con batch_size={batch_size}")
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
                fields_to_extract.append(
                    f"- {desc} (opciones válidas exactas: 'B (En firme)', 'A (Estimada)', 'NINGUNO')")
            else:
                fields_to_extract.append(desc)

        # Formatear campos para el prompt
        fields_prompt_list = "\n".join(
            [f"- {field}" for field in fields_to_extract])

        # CORRECCIÓN: Usar el template adecuado según el tipo de mensaje
        if is_short_message:
            system_content = (
                "Eres un asistente experto en extraer información específica de mensajes "
                "sobre proyectos agrícolas. Tu tarea es EXCLUSIVAMENTE extraer datos "
                "concretos y factuales. IMPORTANTE:\n\n"
                "1. NO generes valores como 'No mencionado', 'No disponible', 'Ninguno', etc.\n"
                "2. Si un dato no está presente en el mensaje del usuario, OMÍTELO COMPLETAMENTE del JSON.\n"
                "3. NUNCA inventes información ni rellenes campos con valores genéricos.\n"
                "4. Solo extraigo datos explícitamente mencionados en el mensaje.\n\n"
                f"Extrae los siguientes campos en formato JSON:\n{fields_prompt_list}\n\n"
                "La omisión de un campo del JSON indica que no hay información disponible para él."
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
                "IMPORTANTE: No generes valores como 'No mencionado', 'No disponible', 'No especificado', etc. "
                "Si no hay información clara para un campo, omite ese campo completamente del JSON. "
                "Debe interpretarse que la ausencia de un campo significa que no hay datos disponibles, "
                "en lugar de rellenarlo con valores genéricos de 'No mencionado'."
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

            # Reemplazar el bloque de procesamiento JSON existente con este:
            import json
            try:
                # Limpieza del formato JSON
                extracted_data = extracted_data.strip()

                if extracted_data.startswith("```json"):
                    extracted_data = extracted_data[7:].strip()
                elif extracted_data.startswith("```"):
                    extracted_data = extracted_data[3:].strip()
                if extracted_data.endswith("```"):
                    extracted_data = extracted_data[:-3].strip()

                # Correcciones de formato
                if extracted_data.endswith(","):
                    extracted_data = extracted_data[:-1] + "}"

                if not extracted_data.startswith("{"):
                    extracted_data = "{" + extracted_data
                if not extracted_data.endswith("}"):
                    extracted_data = extracted_data + "}"

                # Parsear el JSON
                extracted_json = json.loads(extracted_data)

                # Expandir la lista de valores no deseados
                unwanted_values = [
                    # Valores negativos o indeterminados
                    "no mencionado", "no especificado", "no disponible", "no indicado",
                    "desconocido", "sin especificar", "n/a", "na", "no aplica",
                    "-- selecciona --", "seleccione", "selecciona",
                    "no se especifica", "por determinar", "por definir",

                    # Valores vacíos o genéricos
                    "false", "true", "none", "null", "undefined", "ninguno", "ninguna",
                    "dato no proporcionado", "información no disponible", "vacio", "vacío",
                    "no hay datos", "pendiente", "a confirmar",

                    # Variaciones con mayúsculas
                    "NO MENCIONADO", "NO ESPECIFICADO", "NO DISPONIBLE", "NINGUNO", "NINGUNA",

                    # Valores imprecisos o no informativos
                    "normal", "estándar", "estandar", "regular", "común", "comun",
                    "varios", "multiple", "multiples", "múltiples"
                ]

                # Modificar el filtrado para ser más estricto
                filtered_json = {}
                for field, value in extracted_json.items():
                    if isinstance(value, str):
                        # Normalizar: minúsculas, sin puntuación
                        normalized = value.lower().strip().strip('.').strip(',')

                        # Rechazar valores muy cortos no numéricos (probablemente no son respuestas válidas)
                        if len(normalized) < 2 and not normalized.isdigit():
                            continue

                        # Rechazar valores que están en la lista de no deseados o que contienen subcadenas no deseadas
                        if normalized in [u.lower() for u in unwanted_values] or any(
                            u.lower() in normalized for u in [
                                "no mencionado", "no especificado", "ninguno", "no disponible"
                            ]
                        ):
                            continue

                        # Solo guardar valores que pasan todas las validaciones
                        filtered_json[field] = value
                    elif value is not None and value != False:
                        # Para valores booleanos, sólo incluir True (False a menudo es valor por defecto)
                        filtered_json[field] = value

                # Registrar solo los campos con valores válidos
                for field, value in filtered_json.items():
                    all_extracted_data[field] = value
                    if field not in auto_completed_fields:
                        auto_completed_fields.append(field)

            except json.JSONDecodeError as json_err:
                # Código de manejo de errores existente sin cambios...
                print(f"Error parsing JSON: {json_err}")
                print(f"Raw response: {extracted_data}")

                # Plan B: Crear un JSON con los campos que podamos extraer
                try:
                    # Regex para extraer pares clave-valor
                    import re
                    pairs = re.findall(
                        r'"([^"]+)"\s*:\s*("[^"]*"|null|\d+|true|false)', extracted_data)

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

                print(
                    f"Error parsing response from AI, raw response: {extracted_data}")
                continue

        except Exception as e:
            print(f"Error al procesar lote {i}-{i+batch_size}: {e}")
            # Continuar con el siguiente lote

    # Devolver todos los datos extraídos y qué campos fueron autocompletados
    return jsonify({
        "data": all_extracted_data,
        "autoCompletedFields": auto_completed_fields
    })

# Add this new endpoint after your existing endpoints


@app.route("/transcribe_audio", methods=["POST"])
def transcribe_audio():
    """Endpoint to transcribe audio using OpenAI's Whisper API"""
    if 'audio' not in request.files:
        return jsonify({"error": "No audio file provided"}), 400

    audio_file = request.files['audio']

    if audio_file.filename == '':
        return jsonify({"error": "No audio file selected"}), 400

    if not openai_client:
        return jsonify({"error": "OpenAI client not initialized"}), 500

    try:
        # Save the file temporarily
        temp_audio_path = "temp_audio.webm"
        audio_file.save(temp_audio_path)

        # Open the file for the OpenAI API
        with open(temp_audio_path, "rb") as audio_data:
            # Call OpenAI's transcription API
            transcript = openai_client.audio.transcriptions.create(
                model="whisper-1",
                file=audio_data,
                language="es"  # Spanish language for better accuracy
            )

        # Clean up the temporary file
        os.remove(temp_audio_path)

        # Return the transcription
        return jsonify({
            "success": True,
            "text": transcript.text
        })

    except Exception as e:
        print(f"Error transcribing audio: {str(e)}")
        return jsonify({"error": f"Error processing audio: {str(e)}"}), 500


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
        # Timestamp para seguimiento
        "started_at": str(os.path.getmtime(__file__))
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
        # Primeros 200 caracteres
        print(f">>> Contenido: {response.text[:200]}...")

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
    import ssl
    import os
    import tempfile
    from cryptography.hazmat.primitives.serialization.pkcs12 import load_key_and_certificates
    from cryptography.hazmat.primitives.serialization import Encoding, PrivateFormat, NoEncryption

    # Ajusta esta ruta a donde esté tu .pfx en Linux
    pfx_path = "/home/practicas-ti/ChatBot/backend/novagric-2026.pfx"
    # Reemplaza con la ruta real en tu sistema Linux
    pfx_password = "2j70m86a9"

    def load_pfx_to_temp(pfx_path, pfx_password):
        # 1. Leer bytes del PFX
        with open(pfx_path, "rb") as f:
            pfx_data = f.read()

        # 2. Extraer clave, certificado y CA intermedias
        private_key, cert, additional_certs = load_key_and_certificates(
            pfx_data,
            pfx_password.encode("utf-8"),
            None
        )

        # 3. Volcar todo en un único PEM temporal
        pem_file = tempfile.NamedTemporaryFile(delete=False, suffix=".pem")
        with open(pem_file.name, "wb") as out:
            # Clave privada en PKCS8
            out.write(private_key.private_bytes(
                encoding=Encoding.PEM,
                format=PrivateFormat.PKCS8,
                encryption_algorithm=NoEncryption()
            ))
            # Certificado principal
            out.write(cert.public_bytes(Encoding.PEM))
            # Cualquier CA intermedia
            if additional_certs:
                for ca in additional_certs:
                    out.write(ca.public_bytes(Encoding.PEM))

        return pem_file.name

    try:
        # Convertimos el PFX → un único PEM que contiene clave+certificados
        pem_path = load_pfx_to_temp(pfx_path, pfx_password)

        # Creamos el contexto SSL y cargamos el PEM como certfile y keyfile
        context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
        context.load_cert_chain(certfile=pem_path, keyfile=pem_path)

        print("🚀 Servidor seguro en https://0.0.0.0:5002 usando tu .pfx")
        app.run(host="0.0.0.0", port=5002, debug=True, ssl_context=context)

    except Exception as e:
        print(f"❌ Error al cargar PFX: {e}")
        print("🟡 Iniciando sin SSL…")
        app.run(host="0.0.0.0", port=5002, debug=True)

    finally:
        # Limpiar el archivo PEM temporal
        if 'pem_path' in locals() and os.path.exists(pem_path):
            os.unlink(pem_path)
