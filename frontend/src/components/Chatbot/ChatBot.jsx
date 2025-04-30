import React, { useState, useEffect, useRef } from 'react';
import './ChatBot.css';
import ChatInput from '../ChatInput/ChatInput';
import { LOCAL_API_URL } from '../../services/api';

const useRenderChatInput = (currentIndex, questions, isTyping, handleSend) => {
  return React.useMemo(() => {
    if (isTyping || currentIndex >= questions.length) return null;
    
    if (currentIndex === -1) {
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
      const currentQuestion = questions[currentIndex];
      
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
      } else if (currentQuestion.Type === 4) {
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
      } else {
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
    }
  }, [currentIndex, isTyping, questions, handleSend]);
};

const Chatbot = ({ questions = [], onUpdateFormData, formData = {} }) => {
  const [chatHistory, setChatHistory] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(-1); // -1 indica descripción inicial
  const [isTyping, setIsTyping] = useState(false);
  const chatMessagesAreaRef = useRef(null);

  useEffect(() => {
    setChatHistory([{
      sender: 'bot',
      text: '¡Hola! Soy el asistente virtual de Novagric. Por favor, describe brevemente tu proyecto agrícola para comenzar.',
      questionId: 'initial-description'
    }]);
  }, []);

  const getCachedExtraction = (description) => {
    try {
      const cacheKey = `extraction_${description.substring(0, 50).replace(/[^a-z0-9]/gi, '_')}`;
      const cached = localStorage.getItem(cacheKey);
      return cached ? JSON.parse(cached) : null;
    } catch (e) {
      console.warn("Error al recuperar caché:", e);
      return null;
    }
  };

  const saveCachedExtraction = (description, extractedData) => {
    try {
      const cacheKey = `extraction_${description.substring(0, 50).replace(/[^a-z0-9]/gi, '_')}`;
      localStorage.setItem(cacheKey, JSON.stringify(extractedData));
    } catch (e) {
      console.warn("Error al guardar caché:", e);
    }
  };

  const extractDataInBatches = async (description, allQuestions) => {
    setIsTyping(true);
    
    try {
      const questionDescriptions = allQuestions.map(q => q.Description);
      
      const response = await fetch(`${LOCAL_API_URL}/extract_project_data`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          description, 
          questionDescriptions 
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error en la respuesta:', response.status, errorText);
        throw new Error(`Error del servidor: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.data && data.error) {
        console.error('Error del backend:', data.error);
        console.error('Respuesta cruda:', data.raw_response || 'No disponible');
        throw new Error(`Error del backend: ${data.error}`);
      }
      
      if (!data.data) {
        throw new Error("Respuesta inválida del backend");
      }
      
      const extractedData = data.data;
      console.log("Datos extraídos:", extractedData);
      
      const mappedFormData = {};
      
      allQuestions.forEach(q => {
        const fieldName = q.Description;
        const extractedValue = extractedData[fieldName];
        
        if (extractedValue !== null && extractedValue !== undefined && extractedValue !== '') {
          if (q.Type === 3) {
            const matchedAnswer = q.Answers?.find(ans => 
              ans.Description.toLowerCase() === String(extractedValue).toLowerCase()
            );
            
            if (matchedAnswer) {
              mappedFormData[q.IDQuestion] = matchedAnswer.CodAnswer.toString();
            } else {
              console.warn(`No se encontró coincidencia para '${extractedValue}' en las opciones de '${fieldName}'`);
            }
          } 
          else if (q.Type === 4) {
            const selectedOptions = Array.isArray(extractedValue) 
              ? extractedValue 
              : String(extractedValue).split(',').map(opt => opt.trim());
              
            const selectedValues = q.Answers
              ?.filter(ans => selectedOptions.some(opt => 
                ans.Description.toLowerCase() === opt.toLowerCase() ||
                ans.Description.toLowerCase().includes(opt.toLowerCase())
              ))
              ?.map(ans => ans.CodAnswer.toString()) || [];
              
            if (selectedValues.length > 0) {
              mappedFormData[q.IDQuestion] = selectedValues;
            }
          }
          else {
            mappedFormData[q.IDQuestion] = String(extractedValue);
          }
        }
      });

      const completedFields = Object.keys(mappedFormData).length;
      console.log(`Campos completados automáticamente: ${completedFields}/${allQuestions.length}`);

      const completedInfo = allQuestions
        .filter(q => mappedFormData[q.IDQuestion])
        .map(q => {
          const value = mappedFormData[q.IDQuestion];
          let displayValue = value;
          
          if (q.Type === 3 && q.Answers) {
            const answer = q.Answers.find(a => a.CodAnswer.toString() === value);
            if (answer) displayValue = answer.Description;
          }
          
          return `${q.Description}: ${displayValue}`;
        });

      console.log("Campos extraídos:", completedInfo);
      
      return mappedFormData;
    } catch (error) {
      console.error("Error en la extracción por lotes:", error);
      console.error("Detalles:", error.message || 'Sin detalles');
      throw error;
    } finally {
      setIsTyping(false);
    }
  };

  const showCompletedFieldsSummary = React.useCallback((completedData) => {
    const completedFields = Object.keys(completedData).length;
    
    if (completedFields === 0) {
      return "No he podido extraer ningún dato automáticamente. Vamos a completar el formulario paso a paso.";
    }
    
    const completedFieldNames = questions
      .filter(q => completedData[q.IDQuestion])
      .map(q => q.Description)
      .slice(0, 3);
      
    const fieldsList = completedFieldNames.join(", ");
    const moreFields = completedFields > 3 ? ` y ${completedFields - 3} más` : "";
    
    return `He extraído automáticamente ${completedFields} campos, incluyendo ${fieldsList}${moreFields}. Continuemos con los campos restantes.`;
  }, [questions]);

  const handleSend = React.useCallback(async (answer) => {
    setChatHistory(prev => [...prev, { sender: 'user', text: answer }]);

    if (currentIndex === -1) {
      setIsTyping(true);
      try {
        const cachedData = getCachedExtraction(answer);
        let mappedFormData;
        
        if (cachedData) {
          console.log("Usando datos extraídos de caché");
          mappedFormData = cachedData;
        } else {
          console.log("Extrayendo datos desde API...");
          mappedFormData = await extractDataInBatches(answer, questions);
          saveCachedExtraction(answer, mappedFormData);
        }
        
        onUpdateFormData(mappedFormData);
        
        setChatHistory(prev => [...prev, {
          sender: 'bot',
          text: showCompletedFieldsSummary(mappedFormData),
          questionId: 'data-extracted'
        }]);
        
        const nextUnansweredIndex = questions.findIndex(q => 
          mappedFormData[q.IDQuestion] === undefined || 
          mappedFormData[q.IDQuestion] === null || 
          mappedFormData[q.IDQuestion] === ''
        );
        
        if (nextUnansweredIndex !== -1) {
          setCurrentIndex(nextUnansweredIndex);
        } else {
          setChatHistory(prev => [...prev, {
            sender: 'bot',
            text: '¡Gracias! Se han completado todas las preguntas basadas en tu descripción.',
            questionId: 'end'
          }]);
          setCurrentIndex(questions.length);
        }
        
      } catch (error) {
        console.error('Error:', error);
        setChatHistory(prev => [...prev, {
          sender: 'bot',
          text: 'Hubo un error al extraer los datos. Continuaremos con las preguntas manualmente.',
          questionId: 'error-extraction'
        }]);
        setCurrentIndex(0);
      } finally {
        setIsTyping(false);
      }
    } else {
      const currentQuestion = questions[currentIndex];
      
      if (currentQuestion.Type === 3 && currentQuestion.Answers) {
        const userAnswer = answer.trim().toLowerCase();
        const questionAnswers = currentQuestion.Answers;
        
        let matchedAnswer = questionAnswers.find(
          ans => ans.Description.toLowerCase() === userAnswer
        );
        
        if (!matchedAnswer) {
          matchedAnswer = questionAnswers.find(
            ans => ans.Description.toLowerCase().includes(userAnswer) || 
                  userAnswer.includes(ans.Description.toLowerCase())
          );
          
          if (!matchedAnswer && userAnswer.length === 1) {
            matchedAnswer = questionAnswers.find(
              ans => ans.Description.toLowerCase().startsWith(userAnswer)
            );
          }
        }
        
        if (matchedAnswer) {
          onUpdateFormData({ [currentQuestion.IDQuestion]: matchedAnswer.CodAnswer.toString() });
        } else {
          onUpdateFormData({ [currentQuestion.IDQuestion]: answer });
        }
      } else if (currentQuestion.Type === 4 && currentQuestion.Answers) {
        const userSelections = answer.split(',').map(item => item.trim().toLowerCase());
        const questionAnswers = currentQuestion.Answers;
        const selectedValues = [];
        
        userSelections.forEach(selection => {
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
      } else {
        onUpdateFormData({ [currentQuestion.IDQuestion]: answer });
      }
      
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
  }, [currentIndex, onUpdateFormData, questions, showCompletedFieldsSummary, formData]);
  
  useEffect(() => {
    const showQuestion = async () => {
      if (currentIndex >= 0 && currentIndex < questions.length) {
        const currentQuestion = questions[currentIndex];
        
        const currentFormData = formData;
          
        if (currentFormData[currentQuestion.IDQuestion] !== undefined && 
            currentFormData[currentQuestion.IDQuestion] !== null && 
            currentFormData[currentQuestion.IDQuestion] !== '') {
          
          console.log(`Pregunta "${currentQuestion.Description}" ya respondida, buscando siguiente...`);
          
          const nextUnansweredIndex = questions.findIndex(
            (q, idx) => idx > currentIndex && (
              currentFormData[q.IDQuestion] === undefined || 
              currentFormData[q.IDQuestion] === null || 
              currentFormData[q.IDQuestion] === ''
            )
          );
          
          if (nextUnansweredIndex !== -1) {
            setCurrentIndex(nextUnansweredIndex);
            return;
          } else {
            setChatHistory(prev => [...prev, {
              sender: 'bot',
              text: '¡Gracias! Has completado todas las preguntas.',
              questionId: 'end'
            }]);
            setCurrentIndex(questions.length);
            return;
          }
        }
        
        setIsTyping(true);
        
        try {
          const response = await fetch(`${LOCAL_API_URL}/generate_question`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ input: currentQuestion.Description })
          });
          
          const data = await response.json();
          const questionText = data.question || `¿Cuál es el ${currentQuestion.Description}?`;
          
          setChatHistory(prev => [...prev, {
            sender: 'bot',
            text: questionText,
            questionId: currentQuestion.IDQuestion
          }]);
        } catch (error) {
          console.error('Error al generar la pregunta:', error);
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
  }, [currentIndex, questions, formData]);

  useEffect(() => {
    if (chatMessagesAreaRef.current) {
      chatMessagesAreaRef.current.scrollTop = chatMessagesAreaRef.current.scrollHeight;
    }
  }, [chatHistory]);

  const chatInputComponent = useRenderChatInput(currentIndex, questions, isTyping, handleSend);

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
            {chatInputComponent}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chatbot;