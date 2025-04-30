import React, { useState, useEffect, useRef } from 'react';
import './ChatBot.css';
import ChatInput from '../ChatInput/ChatInput';
import { LOCAL_API_URL } from '../../services/api';

const Chatbot = ({ questions = [], onUpdateFormData, formData = {} }) => {
  const [chatHistory, setChatHistory] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(-1); // -1 indica descripción inicial
  const [isTyping, setIsTyping] = useState(false);
  const chatMessagesAreaRef = useRef(null);

  useEffect(() => {
    setChatHistory([{
      sender: 'bot',
      text: '¡Hola! Soy tu asistente virtual. Por favor, describe brevemente tu proyecto agrícola para comenzar.',
      questionId: 'initial-description'
    }]);
  }, []);

  const handleSend = async (answer) => {
    setChatHistory(prev => [...prev, { sender: 'user', text: answer }]);
  
    if (currentIndex === -1) {
      setIsTyping(true);
      try {
        const response = await fetch(`${LOCAL_API_URL}/extract_project_data`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ description: answer })
        });
  
        const data = await response.json();
        const extractedData = data.data;
  
        const mappedFormData = {};
        questions.forEach(q => {
          const extractedValue = extractedData[q.Description];
          if (extractedValue) {
            if (q.Type === 4) { // Multiselección
              const selectedOptions = extractedValue.split(',').map(opt => opt.trim());
              mappedFormData[q.IDQuestion] = q.Answers
                .filter(ans => selectedOptions.includes(ans.Description))
                .map(ans => ans.CodAnswer);
            } else if (q.Type === 3) { // Selección simple
              const matchedAnswer = q.Answers.find(ans => ans.Description === extractedValue);
              if (matchedAnswer) {
                mappedFormData[q.IDQuestion] = matchedAnswer.CodAnswer;
              }
            } else { // Texto libre
              mappedFormData[q.IDQuestion] = extractedValue;
            }
          }
        });
  
        onUpdateFormData(mappedFormData);
  
        setChatHistory(prev => [...prev, {
          sender: 'bot',
          text: 'He extraído estos datos de tu descripción inicial. Ahora continuaremos con las preguntas restantes.',
          questionId: 'data-extracted'
        }]);
  
        // Encontrar la primera pregunta sin respuesta
        const nextUnansweredIndex = questions.findIndex(q => !mappedFormData[q.IDQuestion]);
  
        if (nextUnansweredIndex !== -1) {
          setCurrentIndex(nextUnansweredIndex);
        } else {
          setChatHistory(prev => [...prev, {
            sender: 'bot',
            text: '¡Gracias! Has completado todas las preguntas.',
            questionId: 'end'
          }]);
          setCurrentIndex(questions.length);
        }
  
      } catch (error) {
        console.error('Error:', error);
        setChatHistory(prev => [...prev, {
          sender: 'bot',
          text: 'Hubo un error al extraer los datos. Por favor, intenta nuevamente.',
          questionId: 'error-extraction'
        }]);
      } finally {
        setIsTyping(false);
      }
    } else {
      // Manejar respuestas normales después de la extracción inicial
      const currentQuestion = questions[currentIndex];
      
      // Para preguntas de selección simple (Type 3)
      if (currentQuestion.Type === 3 && currentQuestion.Answers) {
        const userAnswer = answer.trim().toLowerCase();
        const questionAnswers = currentQuestion.Answers;
        
        // Intenta encontrar una coincidencia exacta primero
        let matchedAnswer = questionAnswers.find(
          ans => ans.Description.toLowerCase() === userAnswer
        );
        
        // Si no hay coincidencia exacta, busca coincidencias parciales
        if (!matchedAnswer) {
          // Por texto parcial
          matchedAnswer = questionAnswers.find(
            ans => ans.Description.toLowerCase().includes(userAnswer) || 
                  userAnswer.includes(ans.Description.toLowerCase())
          );
          
          // Por letra/número inicial
          if (!matchedAnswer && userAnswer.length === 1) {
            matchedAnswer = questionAnswers.find(
              ans => ans.Description.toLowerCase().startsWith(userAnswer)
            );
          }
        }
        
        if (matchedAnswer) {
          onUpdateFormData({ [currentQuestion.IDQuestion]: matchedAnswer.CodAnswer.toString() });
        } else {
          // Si no se encuentra coincidencia, guarda el texto directamente
          onUpdateFormData({ [currentQuestion.IDQuestion]: answer });
        }
      }
      // Para preguntas de selección múltiple (Type 4)
      else if (currentQuestion.Type === 4 && currentQuestion.Answers) {
        const userSelections = answer.split(',').map(item => item.trim().toLowerCase());
        const questionAnswers = currentQuestion.Answers;
        const selectedValues = [];
        
        userSelections.forEach(selection => {
          // Buscar coincidencia por texto
          const matchedAnswer = questionAnswers.find(
            ans => ans.Description.toLowerCase().includes(selection) || 
                   selection.includes(ans.Description.toLowerCase())
          );
          
          if (matchedAnswer) {
            selectedValues.push(matchedAnswer.CodAnswer.toString());
          }
        });
        
        if (selectedValues.length > 0) {
          onUpdateFormData({ [currentQuestion.IDQuestion]: selectedValues });
        } else {
          onUpdateFormData({ [currentQuestion.IDQuestion]: answer });
        }
      }
      // Para otros tipos de preguntas
      else {
        onUpdateFormData({ [currentQuestion.IDQuestion]: answer });
      }
      
      // Buscar siguiente pregunta sin respuesta
      const nextUnansweredIndex = questions.findIndex(
        (q, idx) => idx > currentIndex && !formData[q.IDQuestion]
      );
      
      if (nextUnansweredIndex !== -1) {
        setCurrentIndex(nextUnansweredIndex);
      } else {
        setChatHistory(prev => [...prev, {
          sender: 'bot',
          text: '¡Gracias! Has completado todas las preguntas.',
          questionId: 'end'
        }]);
        setCurrentIndex(questions.length);
      }
    }
  };
  
  // Efecto para mostrar la pregunta cuando currentIndex cambia
  useEffect(() => {
    const showQuestion = async () => {
      // Solo procesar si estamos en un índice válido y no es la descripción inicial
      if (currentIndex >= 0 && currentIndex < questions.length) {
        const currentQuestion = questions[currentIndex];
        
        // Comprobar si esta pregunta ya tiene respuesta
        if (formData[currentQuestion.IDQuestion] !== undefined && 
            formData[currentQuestion.IDQuestion] !== null && 
            formData[currentQuestion.IDQuestion] !== '') {
          
          console.log(`Pregunta "${currentQuestion.Description}" ya respondida, buscando siguiente...`);
          
          // Buscar la siguiente pregunta sin respuesta
          const nextUnansweredIndex = questions.findIndex(
            (q, idx) => idx > currentIndex && (
              formData[q.IDQuestion] === undefined || 
              formData[q.IDQuestion] === null || 
              formData[q.IDQuestion] === ''
            )
          );
          
          if (nextUnansweredIndex !== -1) {
            // Actualizar el índice para ir a la siguiente pregunta sin respuesta
            setCurrentIndex(nextUnansweredIndex);
            return; // Importante: salir de la función para evitar mostrar la pregunta actual
          } else {
            // Si no hay más preguntas sin responder
            setChatHistory(prev => [...prev, {
              sender: 'bot',
              text: '¡Gracias! Has completado todas las preguntas.',
              questionId: 'end'
            }]);
            setCurrentIndex(questions.length);
            return; // Salir de la función
          }
        }
        
        // Si llegamos aquí, significa que la pregunta actual necesita respuesta
        setIsTyping(true);
        
        try {
          // Generar la pregunta usando la API
          const response = await fetch(`${LOCAL_API_URL}/generate_question`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ input: currentQuestion.Description })
          });
          
          const data = await response.json();
          const questionText = data.question || `¿Cuál es el ${currentQuestion.Description}?`;
          
          // Añadir la pregunta al historial del chat
          setChatHistory(prev => [...prev, {
            sender: 'bot',
            text: questionText,
            questionId: currentQuestion.IDQuestion
          }]);
        } catch (error) {
          console.error('Error al generar la pregunta:', error);
          // Fallback en caso de error
          setChatHistory(prev => [...prev, {
            sender: 'bot',
            text: `¿Cuál es el ${currentQuestion.Description}?`,
            questionId: currentQuestion.IDQuestion
          }]);
        } finally {
          setIsTyping(false);
        }
      }
    };
    
    showQuestion();
  }, [currentIndex, questions, formData]); // Añadido formData a las dependencias

  // Auto-scroll
  useEffect(() => {
    if (chatMessagesAreaRef.current) {
      chatMessagesAreaRef.current.scrollTop = chatMessagesAreaRef.current.scrollHeight;
    }
  }, [chatHistory]);

  const renderChatInput = () => {
    if (isTyping || currentIndex >= questions.length) return null;

    if (currentIndex === -1) {
      // Entrada inicial para descripción
      return (
        <ChatInput
          question={{
            type: 'text',
            placeholder: 'Describe tu proyecto agrícola aquí...',
            id: 'initial-description'
          }}
          onSend={handleSend}
          isLoading={isTyping}
        />
      );
    } else {
      // Entrada para preguntas después de la extracción
      const currentQuestion = questions[currentIndex];
      
      // Si es una pregunta de selección simple (Type 3)
      if (currentQuestion.Type === 3) {
        const questionAnswers = currentQuestion.Answers || [];
        return (
          <ChatInput
            question={{
              type: 'select',
              placeholder: `Selecciona una opción o escribe para ${currentQuestion.Description}...`,
              id: currentQuestion.IDQuestion,
              options: questionAnswers.map(answer => ({
                label: answer.Description,
                value: answer.CodAnswer.toString()
              }))
            }}
            onSend={handleSend}
            isLoading={isTyping}
          />
        );
      }
      
      // Si es una pregunta de selección múltiple (Type 4)
      else if (currentQuestion.Type === 4) {
        const questionAnswers = currentQuestion.Answers || [];
        return (
          <ChatInput
            question={{
              type: 'select',
              placeholder: `Selecciona opciones para ${currentQuestion.Description} (separa múltiples opciones con coma)`,
              id: currentQuestion.IDQuestion,
              options: questionAnswers.map(answer => ({
                label: answer.Description,
                value: answer.CodAnswer.toString()
              }))
            }}
            onSend={handleSend}
            isLoading={isTyping}
          />
        );
      }
      
      // Otros tipos (texto por defecto)
      return (
        <ChatInput
          question={{
            type: 'text',
            placeholder: `Escribe tu respuesta para ${currentQuestion.Description}...`,
            id: currentQuestion.IDQuestion
          }}
          onSend={handleSend}
          isLoading={isTyping}
        />
      );
    }
  };

  return (
    <div className="chatbot-wrapper">
      <div className="chatbot-main-container">
        <div className="chat-card">
          <div className="card-header">
            <h3>Asistente Virtual</h3>
          </div>
          <div className="chat-card-body">
            <div className="chat-messages-area" ref={chatMessagesAreaRef}>
              {chatHistory.map((msg, i) => (
                <div key={i} className={`message ${msg.sender}`}>
                  {msg.text}
                </div>
              ))}
              {isTyping && (
                <div className="message bot typing">
                  <span className="typing-indicator">
                    <span className="dot"></span>
                    <span className="dot"></span>
                    <span className="dot"></span>
                  </span>
                </div>
              )}
            </div>
          </div>
          <div className="chat-input-area">
            {renderChatInput()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chatbot;