import React, { useState, useEffect, useRef } from 'react';
import './ChatBot.css';
import ChatInput from '../ChatInput/ChatInput';

const API_BASE_URL = 'http://127.0.0.1:5000';

const Chatbot = ({ onUpdateFormData, currentFormData = {}, showSummary = true }) => {
    const [chatHistory, setChatHistory] = useState([]);
    const [currentQuestion, setCurrentQuestion] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [summaryMessages, setSummaryMessages] = useState([]);
    const sessionId = useRef(`session_${Date.now()}`).current; // Usar useRef en lugar de useState para sessionId
    const chatMessagesAreaRef = useRef(null);

    // Scroll to the bottom of the chat
    const scrollToBottom = () => {
        if (chatMessagesAreaRef.current) {
            chatMessagesAreaRef.current.scrollTop = chatMessagesAreaRef.current.scrollHeight;
        }
    };

    // Iniciar una nueva sesión de chat
    const startSession = async () => {
        try {
            setIsLoading(true);

            // Comprobar si ya hay respuestas en el formulario y enviarlas al iniciar
            const hasFormData = Object.keys(currentFormData).length > 0;
            
            const payload = { 
                session_id: sessionId,
                existing_answers: hasFormData ? currentFormData : {} // Enviar respuestas existentes
            };

            const response = await fetch(`${API_BASE_URL}/start`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!response.ok) throw new Error(`Error al iniciar sesión: ${response.status}`);

            const firstQuestion = await response.json();

            // Verificar si esta pregunta ya tiene respuesta
            if (firstQuestion.id && currentFormData[firstQuestion.id]) {
                // Ya hay una respuesta, enviarla automáticamente
                handleSend(currentFormData[firstQuestion.id], true);
                return; // Evitar mostrar la pregunta duplicada

            } else {
                // Mostrar la pregunta
                setCurrentQuestion(firstQuestion);
                setChatHistory(prev => [...prev, { sender: 'bot', text: firstQuestion.text }]);
            }
        } catch (error) {
            console.error('Error starting session:', error);
            setChatHistory(prev => [
                ...prev, 
                { 
                    sender: 'bot', 
                    text: "Lo siento, estoy teniendo problemas para conectarme al servidor. Por favor, intenta de nuevo más tarde." 
                }
            ]);
        } finally {
            setIsLoading(false);
        }
    };

    // Enviar respuesta y obtener la siguiente pregunta
    const handleSend = async (answer, isAutomatic = false) => {
        if (!currentQuestion) return;

        setIsLoading(true);

        // Add the user's answer to the chat history
        setChatHistory(prev => [...prev, { 
            sender: 'user', 
            text: answer,
            autoFilled: isAutomatic 
        }]);

        // Add to summary if it's not an info type question
        if (currentQuestion.type !== 'info') {
            setSummaryMessages(prev => [
                ...prev,
                {
                    question: currentQuestion.text,
                    answer: answer,
                    isGreenhouseType: currentQuestion.id === 'tipo_arco'
                }
            ]);
        }

        // Update the form data
        if (currentQuestion.id && onUpdateFormData) {
            onUpdateFormData({ [currentQuestion.id]: answer });
        }

        try {
            const response = await fetch(`${API_BASE_URL}/answer`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    session_id: sessionId,
                    answer: answer 
                }),
            });

            if (!response.ok) throw new Error(`Error al enviar respuesta: ${response.status}`);

            const data = await response.json();

            if (data.end) {
                // Conversation ended
                setChatHistory(prev => [
                    ...prev, 
                    { 
                        sender: 'bot', 
                        text: "¡Gracias! Hemos completado todas las preguntas." 
                    }
                ]);
                setCurrentQuestion(null);
            } else {
                // Show the next question
                setCurrentQuestion(data);
                
                // Agregar la pregunta al historial
                setChatHistory(prev => [...prev, { sender: 'bot', text: data.text }]);
                
                // Verificar si esta nueva pregunta ya tiene respuesta
                if (data.id && currentFormData[data.id]) {
                    // Esperar un momento para mostrar la pregunta y luego auto-responder
                    setTimeout(() => {
                        handleSend(currentFormData[data.id], true);
                    }, 500);
                }
            }
        } catch (error) {
            console.error('Error sending answer:', error);
            setChatHistory(prev => [
                ...prev, 
                { 
                    sender: 'bot', 
                    text: "Lo siento, estoy teniendo problemas para procesar tu respuesta." 
                }
            ]);
        } finally {
            setIsLoading(false);
        }
    };

    // Start the chat session when component mounts
    useEffect(() => {
        startSession();
    }, []);

    // Scroll to the bottom whenever the chat history changes
    useEffect(() => {
        scrollToBottom();
    }, [chatHistory]);

    return (
        <div className="chatbot-wrapper">
            <div className="chatbot-main-container row">
                {/* Chat area */}
                <div className={`${showSummary ? 'col-md-8' : 'col-md-12'}`}>
                    <div className="chat-card">
                        <div className="card-header">
                            <h3>Asistente Virtual</h3>
                        </div>

                        <div className="chat-card-body">
                            <div className="chat-messages-area" ref={chatMessagesAreaRef}>
                                {chatHistory.map((message, index) => (
                                    <div
                                        key={index}
                                        className={`message ${message.sender} ${message.autoFilled ? 'auto-filled' : ''}`}
                                    >
                                        {message.text}
                                    </div>
                                ))}

                                {isLoading && (
                                    <div className="message bot typing">
                                        <span></span>
                                        <span></span>
                                        <span></span>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="chat-input-area">
                            {currentQuestion && (
                                <ChatInput 
                                    question={currentQuestion}
                                    onSend={handleSend}
                                    isLoading={isLoading}
                                />
                            )}
                        </div>
                    </div>
                </div>

                {/* Summary area */}
                {showSummary && summaryMessages.length > 0 && (
                    <div className="col-md-4">
                        <div className="summary-card">
                            <div className="card-header">
                                <h3>Resumen de Respuestas</h3>
                                <p className="text-muted">Información proporcionada hasta ahora</p>
                            </div>
                            <div className="summary-card-body">
                                {summaryMessages.map((item, index) => (
                                    <div key={index} className="summary-item">
                                        <strong>{item.question}</strong>
                                        <p>{item.answer}</p>
                                        
                                        {/* Mostrar detalles adicionales si es un tipo de invernadero */}
                                        {item.isGreenhouseType && (
                                            <div className="invernadero-details">
                                                <small>
                                                    <strong>Tipo:</strong> <span>{item.answer}</span><br />
                                                    {item.answer === 'Multitunel' && (
                                                        <>
                                                            <strong>Ancho Capilla:</strong> <span>9.60m</span><br />
                                                            <strong>Material:</strong> <span>Acero galvanizado</span><br />
                                                            <div className="mt-2">
                                                                <img 
                                                                    src="/images/multitunel.jpg" 
                                                                    alt="Invernadero tipo Multitunel" 
                                                                />
                                                            </div>
                                                        </>
                                                    )}
                                                    {item.answer === 'Asimétrico' && (
                                                        <>
                                                            <strong>Ancho Capilla:</strong> <span>8.00m</span><br />
                                                            <strong>Material:</strong> <span>Acero galvanizado</span><br />
                                                            <div className="mt-2">
                                                                <img 
                                                                    src="/images/asimetrico.jpg" 
                                                                    alt="Invernadero tipo Asimétrico" 
                                                                />
                                                            </div>
                                                        </>
                                                    )}
                                                </small>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Chatbot;