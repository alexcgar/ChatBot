import os
import json
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from dotenv import load_dotenv
from openai import OpenAI

# Load environment variables (for API key)
load_dotenv()

app = Flask(__name__)
# Allow requests from your React frontend development server
CORS(app, resources={r"/*": {"origins": "http://localhost:5173"}})

# --- OpenAI Setup ---
try:
    openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    if not openai_client.api_key:
        raise ValueError("OpenAI API key not found in .env file")
except Exception as e:
    print(f"Error initializing OpenAI client: {e}")
    openai_client = None  # Indicate failure

# --- Load Questions ---
try:
    with open('preguntas.json', 'r', encoding='utf-8') as f:
        # Use a dictionary for easy lookup by ID
        questions_data = json.load(f)['questions']
        questions = {q['id']: q for q in questions_data}
        FIRST_QUESTION_ID = questions_data[0]['id']  # Get the ID of the first question
except FileNotFoundError:
    print("Error: preguntas.json not found!")
    questions = {}
    FIRST_QUESTION_ID = None
except Exception as e:
    print(f"Error loading questions: {e}")
    questions = {}
    FIRST_QUESTION_ID = None

# --- Load Invernaderos Data ---
try:
    with open('invernaderos.json', 'r', encoding='utf-8') as f:
        invernaderos_data = json.load(f)['data']
        # Create a dictionary for quick lookup by ID
        invernaderos = {item['ID']: item for item in invernaderos_data}
except FileNotFoundError:
    print("Error: invernaderos.json not found!")
    invernaderos = {}
except Exception as e:
    print(f"Error loading invernaderos data: {e}")
    invernaderos = {}

# --- Session Storage (In-Memory) ---
sessions = {}

# --- Helper Function: Get Next Question ID ---
def get_next_question_id(current_id, answer_value, session_answers):
    if current_id not in questions:
        return None  # Should not happen with valid flow

    question = questions[current_id]
    next_q_config = question.get('next')

    if next_q_config is None:
        return None  # End of this path

    if isinstance(next_q_config, str):
        # Simple next step
        return next_q_config

    if isinstance(next_q_config, dict):
        if 'condition' in next_q_config:
            # Conditional logic based on the *current* answer
            try:
                # Basic context for eval - BE CAREFUL WITH EVAL
                context = {'answer': answer_value}
                # Try converting to number if possible for comparison
                try:
                    context['answer_num'] = float(answer_value)
                except ValueError:
                    pass  # Keep as string if not a number

                # Example condition: "answer_num >= 1000"
                condition_met = eval(next_q_config['condition'], {"__builtins__": {}}, context)
                return next_q_config.get('true') if condition_met else next_q_config.get('false')
            except Exception as e:
                print(f"Error evaluating condition '{next_q_config.get('condition')}': {e}")
                return None  # Error in condition logic
        else:
            # Selection based on answer value (e.g., from 'select' type)
            return next_q_config.get(str(answer_value))  # Ensure answer is treated as string key

    return None  # Default case if logic doesn't match

# --- Helper Function: Build OpenAI Prompt Messages ---
def build_openai_messages(session_history, current_question_text, user_answer, next_question_template):
    messages = [
        {"role": "system", "content": "Eres un asistente eficaz, conciso y directo que guía a los usuarios a través de un formulario para configurar un invernadero. Evita hacer suposiciones sobre lo que el usuario quiere o lo que está pensando. Limítate a formular preguntas claras y directas sin añadir interpretaciones innecesarias."}
    ]
    
    # Add past Q&A pairs from session history
    for q_id, answer in session_history.items():
        if q_id in questions:
            messages.append({"role": "assistant", "content": questions[q_id]['text']})  # The question the bot asked
            messages.append({"role": "user", "content": str(answer)})  # The user's answer

    # Add the current interaction
    messages.append({"role": "assistant", "content": current_question_text})
    messages.append({"role": "user", "content": str(user_answer)})

    # Add the prompt for the next question generation
    messages.append({
        "role": "system",
        "content": f"Formula la siguiente pregunta de manera concisa y directa. La pregunta base es: '{next_question_template}'. NO hagas suposiciones sobre la respuesta del usuario. NO añadas texto innecesario. Sé breve y específico. Puedes usar un tono amigable pero mantén un enfoque profesional."
    })
    return messages

# --- API Endpoints ---
@app.route("/start", methods=["POST"])
def start():
    if not FIRST_QUESTION_ID or not questions:
        return jsonify({"error": "Questions not loaded correctly"}), 500

    session_id = request.json.get("session_id")
    if not session_id:
        return jsonify({"error": "session_id is required"}), 400

    # Initialize session state
    sessions[session_id] = {"answers": {}, "current_question_id": FIRST_QUESTION_ID, "history": []}  # history stores tuples (question_id, answer)
    first_question = questions[FIRST_QUESTION_ID]

    print(f"Session started: {session_id}")
    return jsonify(first_question)

@app.route("/answer", methods=["POST"])
def answer():
    data = request.json
    session_id = data.get("session_id")
    user_answer = data.get("answer")  # Raw answer from user
    if not session_id or session_id not in sessions:
        return jsonify({"error": "Invalid or missing session_id"}), 400
    if user_answer is None:
        return jsonify({"error": "Missing 'answer'"}), 400

    state = sessions[session_id]
    current_q_id = state["current_question_id"]
    current_question = questions.get(current_q_id)

    if not current_question:
        return jsonify({"error": "Current question not found in state"}), 500

    # Store the answer
    state["answers"][current_q_id] = user_answer
    state["history"].append((current_q_id, user_answer))  # Add to history

    # Determine the *logical* next question ID based on rules
    next_q_id = get_next_question_id(current_q_id, user_answer, state["answers"])

    state["current_question_id"] = next_q_id  # Update state

    print(f"Session {session_id}: Q: {current_q_id}, A: {user_answer}, Next: {next_q_id}")

    # Check for end condition
    if next_q_id is None or next_q_id == "end":
        print(f"Session {session_id} ended. Data: {state['answers']}")
        final_data = state["answers"]
        # Optionally clean up session
        # del sessions[session_id]
        return jsonify({"end": True, "data": final_data})

    if next_q_id not in questions:
        print(f"Error: Next question ID '{next_q_id}' not found in questions.json")
        return jsonify({"error": f"Invalid next question id: {next_q_id}"}), 500

    next_question_data = questions[next_q_id].copy()  # Get template for next question

    # --- OpenAI Integration ---
    generated_text = next_question_data['text']  # Default text
    if openai_client:
        try:
            # Build message history for OpenAI
            openai_messages = build_openai_messages(
                state['answers'],  # Pass the full answer dict for context
                current_question['text'],
                user_answer,
                next_question_data['text']  # Template for the next question
            )

            # Call OpenAI API
            print(f"Calling OpenAI for session {session_id}...")
            chat_completion = openai_client.chat.completions.create(
                model="gpt-3.5-turbo",  # O GPT-4 si tienes acceso
                messages=openai_messages,
                temperature=0.2,  # Reducido de 0.5 para respuestas más predecibles
                max_tokens=100
            )
            generated_text = chat_completion.choices[0].message.content.strip()
            print(f"OpenAI response: {generated_text}")

            # Update the text of the next question with the AI-generated version
            next_question_data['text'] = generated_text

        except Exception as e:
            print(f"Error calling OpenAI API: {e}")
            # Fallback to default text if AI fails
            next_question_data['text'] = questions[next_q_id]['text']
    else:
        
        print("OpenAI client not initialized. Skipping AI generation.")
        # Use default text if OpenAI is not configured
        next_question_data['text'] = questions[next_q_id]['text']

    # Return the next question (potentially with AI-enhanced text)
    return jsonify(next_question_data)

from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from io import BytesIO

def generate_pdf(data):
    buffer = BytesIO()
    c = canvas.Canvas(buffer, pagesize=letter)
    textobject = c.beginText()
    textobject.setTextOrigin(10, 730)  # Adjust as needed

    for question, answer in data.items():
        textobject.textLine(f"{question}: {answer}")

    c.drawText(textobject)
    c.save()
    buffer.seek(0)
    return buffer

@app.route("/download_pdf/<session_id>", methods=["GET"])
def download_pdf(session_id):
    if session_id not in sessions:
        return jsonify({"error": "Invalid session_id"}), 400

    final_data = sessions[session_id]["answers"]
    pdf_buffer = generate_pdf(final_data)
    
    return send_file(
        pdf_buffer,
        mimetype='application/pdf',
        as_attachment=True,
        download_name=f'formulario_{session_id}.pdf'
    )
    
@app.route("/invernaderos", methods=["GET"])
def get_invernaderos():
    # Asegúrate de que 'invernaderos' esté definido antes de devolverlo
    # Imprime para depuración
    print(f"Sending invernaderos data: {len(invernaderos.get('data', []))} records")
    return jsonify(invernaderos)

@app.route("/questions", methods=["GET"])
def get_questions():
    # Devuelve los datos de las preguntas
    return jsonify({"questions": questions_data})

@app.route("/edit_answer", methods=["POST"])
def edit_answer():
    data = request.get_json()
    session_id = data.get("session_id")
    question_index = data.get("question_index")
    question_text = data.get("question_text")
    original_answer = data.get("original_answer")
    new_answer = data.get("new_answer")
    
    if not session_id or question_index is None or not new_answer:
        return jsonify({"error": "Faltan datos necesarios"}), 400
    
    if session_id not in sessions:
        return jsonify({"error": "ID de sesión no válido"}), 400
    
    session_data = sessions[session_id]
    
    # Actualizar la respuesta en el historial de sesión
    if question_text in session_data["answers"]:
        session_data["answers"][question_text] = new_answer
        
    # Determinar si necesitamos reiniciar el flujo de preguntas
    reset_flow = False
    next_question = None
    
    # Buscar la pregunta por su texto usando questions_data en lugar de preguntas["questions"]
    question_object = next((q for q in questions_data if q["text"] == question_text), None)
    
    if question_object:
        # Determinar la siguiente pregunta basada en la nueva respuesta
        next_id = question_object.get("next")
        
        if isinstance(next_id, dict):
            next_id = next_id.get(new_answer, list(next_id.values())[0])
        
        next_question = next((q for q in questions_data if q["id"] == next_id), None)
        
        if next_question:
            # Actualizar la pregunta actual en la sesión
            session_data["current_question"] = next_question
            reset_flow = True
    
    return jsonify({
        "success": True,
        "reset_flow": reset_flow,
        "next_question": next_question
    })
if __name__ == "__main__":
    if not FIRST_QUESTION_ID or not questions:
        print("Could not start Flask server: Questions failed to load.")
    else:
        # Use 0.0.0.0 to make it accessible on your network if needed
        app.run(host="0.0.0.0", port=5000, debug=True)
