import React, { useState, useEffect, useRef } from 'react';
import './ChatBot.css';
import ChatInput from '../ChatInput/ChatInput';
import { LOCAL_API_URL } from '../../services/api';

const useRenderChatInput = (currentIndex, questions, isTyping, handleSend) => {
  return React.useMemo(() => {
    if (currentIndex >= questions.length) return null;
    
    if (currentIndex === -1) {
      return (
        <ChatInput
          question={{
            type: 'text',
            placeholder: 'Describe tu proyecto agrícola aquí...',
            id: 'initial-description'
          }}
          onSend={handleSend}
          isLoading={false}
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
            isLoading={false}
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
            isLoading={false}
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
            isLoading={false}
          />
        );
      }
    }
  }, [currentIndex, questions, handleSend]);
};

const Chatbot = ({ questions = [], onUpdateFormData, formData = {} }) => {
  // Asegurarse de que formData siempre sea un objeto
  const safeFormData = React.useMemo(() => formData || {}, [formData]);
  const [chatHistory, setChatHistory] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(-1); // -1 indica descripción inicial
  const [isTyping, setIsTyping] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionProgress, setExtractionProgress] = useState(0);
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
      
      if (!cached) return null;
      
      const parsedCache = JSON.parse(cached);
      
      // Validar la estructura de los datos en caché
      if (!parsedCache || typeof parsedCache !== 'object' || !parsedCache.data) {
        console.warn("Estructura de caché inválida, descartando");
        localStorage.removeItem(cacheKey);
        return null;
      }
      
      console.log("Datos recuperados de caché:", parsedCache);
      return parsedCache;
    } catch (e) {
      console.warn("Error al recuperar caché:", e);
      return null;
    }
  };

  const saveCachedExtraction = React.useCallback((description, extractedData) => {
    try {
      const cacheKey = `extraction_${description.substring(0, 50).replace(/[^a-z0-9]/gi, '_')}`;
      localStorage.setItem(cacheKey, JSON.stringify(extractedData));
    } catch (e) {
      console.warn("Error al guardar caché:", e);
    }
  }, []); // Sin dependencias, ya que localStorage no cambia

  const extractDataInBatches = React.useCallback(async (description, allQuestions) => {
    setIsTyping(true);
    
    try {
      // Asegurarse que allQuestions sea un array
      const safeQuestions = Array.isArray(allQuestions) ? allQuestions : [];
      
      // Solo proceder si hay preguntas para procesar
      if (safeQuestions.length === 0) {
        console.warn("No hay preguntas para procesar");
        return { data: {}, autoCompletedFields: [] };
      }
      
      // Mejorar el prompt añadiendo la descripción completa de cada pregunta
      const questionPrompts = safeQuestions
        .filter(q => q && q.Description)
        .map(q => {
          let prompt = q.Description;
          
          // Si es una pregunta de selección, incluir opciones para el modelo
          if (q.Type === 3 && Array.isArray(q.Answers) && q.Answers.length > 0) {
            const options = q.Answers.map(a => a.Description).join(", ");
            prompt += ` (opciones: ${options})`;
          }
          
          return prompt;
        });
      
      console.log(`Enviando ${questionPrompts.length} preguntas al backend`);
      
      const response = await fetch(`${LOCAL_API_URL}/extract_project_data`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          description, 
          questionDescriptions: questionPrompts
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error en la respuesta:', response.status, errorText);
        throw new Error(`Error del servidor: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.data) {
        console.warn("La respuesta del backend no contiene datos");
        return { data: {}, autoCompletedFields: [] };
      }
      
      const extractedData = data.data;
      console.log("Datos extraídos del backend:", extractedData);
      
      // AQUÍ ES DONDE FALTA EL CÓDIGO: Mapear los datos extraídos a los IDs de las preguntas
      const mappedFormData = {};
      const autoCompletedFields = [];
      
      // Recorrer las preguntas y verificar si hay datos extraídos para cada una
      safeQuestions.forEach(question => {
        if (!question || !question.Description || !question.IDQuestion) return;
        
        const fieldValue = extractedData[question.Description];
        
        if (fieldValue !== undefined && fieldValue !== null && fieldValue !== '') {
          // Tenemos un valor para esta pregunta
          mappedFormData[question.IDQuestion] = fieldValue;
          autoCompletedFields.push(question.IDQuestion);
        }
      });
      
      console.log("Datos mapeados para el formulario:", mappedFormData);
      console.log("Campos autocompletados:", autoCompletedFields.length);
      
      return {
        data: mappedFormData,
        autoCompletedFields: autoCompletedFields
      };
      
    } catch (error) {
      console.error("Error en la extracción por lotes:", error);
      return { data: {}, autoCompletedFields: [] };
    } finally {
      setIsTyping(false);
    }
  }, [setIsTyping]);

  const processBatchesInBackground = React.useCallback(async (description, batches, existingData) => {
    // Garantizar que existingData sea un objeto
    let accumulatedData = {...(existingData || {})};
    let completedBatches = 0;
    
    try {
      // Verificar que batches sea un array
      if (!Array.isArray(batches) || batches.length === 0) {
        console.log("No hay lotes para procesar en segundo plano");
        return;
      }
      
      for (const batch of batches) {
        // Verificar que el lote sea un array válido
        if (!Array.isArray(batch) || batch.length === 0) continue;
        
        // Evitar bloquear la interfaz de usuario
        await new Promise(resolve => setTimeout(resolve, 100));
        
        try {
          const result = await extractDataInBatches(description, batch);
          
          // Añadir este debug:
          console.log(`Lote ${completedBatches+1}/${batches.length} procesado:`, 
                     result && result.data ? Object.keys(result.data).length : 0, 
                     "campos extraídos");
          
          if (result && result.data && Object.keys(result.data).length > 0) {
            const newData = result.data;
            
            // Fusionar con datos existentes
            const combinedData = {...accumulatedData, ...newData};
            accumulatedData = combinedData;
            
            // Mostrar qué campos específicos se han extraído
            console.log("Campos extraídos en este lote:", 
                       Object.keys(newData).map(key => {
                         const questionObj = questions.find(q => q.IDQuestion === key);
                         return questionObj ? questionObj.Description : key;
                       }));
            
            // Actualizar formulario incremental con nuevos campos
            onUpdateFormData(newData, result.autoCompletedFields);
            
            // Actualizar progreso
            completedBatches++;
            setExtractionProgress(Math.floor((completedBatches / batches.length) * 100));
          } else {
            console.warn("Lote procesado sin extraer campos");
          }
        } catch (err) {
          console.error("Error procesando lote en segundo plano:", err);
        }
      }
      
      // Objeto seguro para guardar en caché
      const safeResult = {
        data: accumulatedData || {},
        autoCompletedFields: Object.keys(accumulatedData || {})
      };
      
      saveCachedExtraction(description, safeResult);
      
      // Notificación de finalización
      setChatHistory(prev => [...prev, {
        sender: 'bot',
        text: `He terminado de analizar tu proyecto. He completado ${Object.keys(accumulatedData || {}).length} campos automáticamente.`,
        questionId: 'background-extraction-complete',
        isBackgroundNotification: true
      }]);
    } finally {
      setIsExtracting(false);
    }
  }, [extractDataInBatches, onUpdateFormData, questions, saveCachedExtraction]);

  const showCompletedFieldsSummary = React.useCallback((completedData) => {
    // Verificar que completedData no sea null ni undefined
    if (!completedData) {
      return "No he podido extraer ningún dato automáticamente. Vamos a completar el formulario paso a paso.";
    }
    
    const completedFields = Object.keys(completedData).length;
    
    if (completedFields === 0) {
      return "No he podido extraer ningún dato automáticamente. Vamos a completar el formulario paso a paso.";
    }
    
    const completedFieldNames = questions
      .filter(q => q && q.IDQuestion && completedData[q.IDQuestion])
      .map(q => q.Description)
      .slice(0, 3);
      
    const fieldsList = completedFieldNames.join(", ");
    const moreFields = completedFields > 3 ? ` y ${completedFields - 3} más` : "";
    
    return `He extraído automáticamente ${completedFields} campos, incluyendo ${fieldsList}${moreFields}. Continuemos con los campos restantes.`;
  }, [questions]);

  // Añadir esta función al inicio del componente
  const isFieldEmpty = (data, fieldId) => {
    // Si no hay data o no hay fieldId, considerarlo vacío
    if (!data || !fieldId) return true;
    if (typeof data !== 'object') return true;
    const value = data[fieldId];
    return value === undefined || value === null || value === '';
  };

  const handleSend = React.useCallback(async (answer) => {
    setChatHistory(prev => [...prev, { sender: 'user', text: answer }]);
    if (currentIndex === -1) {
      setIsTyping(true);
      try {
        const cachedData = getCachedExtraction(answer);
        if (cachedData) {
          const mappedFormData = cachedData.data || {};
          const autoCompletedFields = cachedData.autoCompletedFields || [];
          onUpdateFormData(mappedFormData, autoCompletedFields);
          
          setChatHistory(prev => [...prev, {
            sender: 'bot',
            text: showCompletedFieldsSummary(mappedFormData),
            questionId: 'data-extracted'
          }]);
          
          let foundValidQuestion = false;
          let nextUnansweredIndex = -1;
          
          for (let i = 0; i < questions.length; i++) {
            const q = questions[i];
            if (q && q.IDQuestion && isFieldEmpty(mappedFormData, q.IDQuestion)) {
              nextUnansweredIndex = i;
              foundValidQuestion = true;
              break;
            }
          }
          
          if (foundValidQuestion) {
            setCurrentIndex(nextUnansweredIndex);
          } else {
            setChatHistory(prev => [...prev, {
              sender: 'bot',
              text: '¡Gracias! Se han completado todas las preguntas.',
              questionId: 'end'
            }]);
            setCurrentIndex(questions.length);
          }
        } else {
          // AQUÍ ESTÁ EL CAMBIO PRINCIPAL: Extracción en dos fases
          // Fase 1: Extracción rápida de campos prioritarios
          const priorityFields = ["CodCompany", "Tipo De Oferta", "Destino"];
          const priorityQuestions = questions.filter(q => 
            q && q.Description && (
              priorityFields.includes(q.Description) || 
              q.Required === true ||
              q.Description.includes("CodCompany")
            )
          ).slice(0, 10); // Aumentar a 10 para tener más posibilidades
          console.log("Preguntas prioritarias seleccionadas:", priorityQuestions.map(q => q.Description));
          setChatHistory(prev => [...prev, {
            sender: 'bot',
            text: 'Estoy analizando tu proyecto y completando automáticamente algunos campos en segundo plano. Puedes continuar respondiendo las preguntas mientras tanto.',
            questionId: 'background-extraction-start'
          }]);
          // Iniciar extracción prioritaria
          const quickResult = await extractDataInBatches(answer, priorityQuestions);
          if (quickResult && quickResult.data) {
            // Actualizar formulario con datos prioritarios
            onUpdateFormData(quickResult.data, quickResult.autoCompletedFields);
            // Mostrar breve resumen
            setChatHistory(prev => [...prev, {
              sender: 'bot',
              questionId: 'quick-extraction'
            }]);
          }
          // Fase 2: Comenzar extracción completa en segundo plano
          setIsExtracting(true);
          setExtractionProgress(0);
          // Dividir preguntas en lotes para procesamiento en segundo plano
          const batchSize = 20;
          const remainingQuestions = questions.filter(q => !quickResult?.data[q.IDQuestion]);
          const batches = [];
          for (let i = 0; i < remainingQuestions.length; i += batchSize) {
            batches.push(remainingQuestions.slice(i, i + batchSize));
          }
          // Iniciar primera pregunta mientras sigue extracción
          const firstUnansweredIndex = questions.findIndex(
            (q, idx) => {
              if (!q || !q.IDQuestion) return false;
              
              return idx > currentIndex && 
                     q && 
                     // Asegurar que quickResult existe y tiene data
                     (quickResult === undefined || quickResult === null || 
                      isFieldEmpty(quickResult.data, q.IDQuestion));
            }
          );
          if (firstUnansweredIndex !== -1 && firstUnansweredIndex !== currentIndex) {
            setCurrentIndex(firstUnansweredIndex);
          }
          // Procesar lotes en segundo plano
          processBatchesInBackground(answer, batches, quickResult?.data || {});
        }
      } catch (error) {
        console.error('Error:', error);
        setChatHistory(prev => [...prev, {
          sender: 'bot',
          text: 'Hubo un error al analizar tu descripción. Continuaremos con las preguntas manualmente.',
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
        (q, idx) => {
          return idx > currentIndex && 
                 q && 
                 q.IDQuestion && 
                 isFieldEmpty(safeFormData, q.IDQuestion);
        }
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
  }, [currentIndex, onUpdateFormData, questions, showCompletedFieldsSummary, extractDataInBatches, processBatchesInBackground, safeFormData]);

  useEffect(() => {
    const showQuestion = async () => {
      if (currentIndex >= 0 && currentIndex < questions.length) {
        const currentQuestion = questions[currentIndex];
        const currentFormData = safeFormData;

        // Añadir esta condición para evitar repetición infinita:
        if (!isFieldEmpty(currentFormData, currentQuestion.IDQuestion)) {
          const nextUnansweredIndex = questions.findIndex(
            (q, idx) => idx > currentIndex && isFieldEmpty(currentFormData, q.IDQuestion)
          );
          if (nextUnansweredIndex !== -1 && nextUnansweredIndex !== currentIndex) {
            setCurrentIndex(nextUnansweredIndex);
          } else {
            setChatHistory(prev => [...prev, {
              sender: 'bot',
              text: '¡Gracias! Has completado todas las preguntas.',
              questionId: 'end'
            }]);
            setCurrentIndex(questions.length);
          }
          return;
        }

        // Añadir esta condición para evitar generar la misma pregunta repetidamente:
        const alreadyAsked = chatHistory.some(msg => msg.questionId === currentQuestion.IDQuestion);
        if (alreadyAsked) {
          return;
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
  }, [currentIndex, questions, safeFormData, chatHistory]);

  useEffect(() => {
    if (chatMessagesAreaRef.current) {
      chatMessagesAreaRef.current.scrollTop = chatMessagesAreaRef.current.scrollHeight;
    }
  }, [chatHistory, safeFormData]); // Añadir safeFormData como dependencia

  const chatInputComponent = useRenderChatInput(currentIndex, questions, isTyping, handleSend);

  return (
    <div className="chatbot-wrapper">
      <div className="chatbot-main-container">
        <div className="chat-card">
          <div className="card-header">
          </div>
          <div className="chat-card-body">
            <div className="chat-messages-area" ref={chatMessagesAreaRef}>
              {chatHistory.map((message, index) => {
                // Comprobar si el mensaje es una pregunta y si es requerida
                const isQuestion = message.questionId && message.sender === 'bot';
                const currentQuestionObj = isQuestion ? 
                  questions.find(q => q.IDQuestion === message.questionId) : null;
                const isRequired = currentQuestionObj?.Required === true;
                const isAnswered = isQuestion && 
                  safeFormData[message.questionId] !== undefined && 
                  safeFormData[message.questionId] !== null &&
                  safeFormData[message.questionId] !== '';
                
                // Determinar las clases CSS según estado
                let requiredClass = '';
                if (isRequired) {
                  requiredClass = isAnswered ? 'required-answered' : 'required-unanswered';
                }
              
                return (
                  <div 
                    key={index} 
                    className={`message ${message.sender} ${message.isAutoCompleted ? 'auto-completed' : ''} ${requiredClass}`}
                  >
                    {message.text}
                    {isRequired && !isAnswered && <span className="required-indicator">*</span>}
                  </div>
                );
              })}
              {isTyping && (
                <div className="message bot typing">
                  <span className="typing-indicator">
                    <span className="dot"></span>
                    <span className="dot"></span>
                    <span className="dot"></span>
                  </span>
                </div>
              )}
              {isExtracting && (
                <div className="background-extraction-indicator">
                  <div className="progress">
                    <div 
                      className="progress-bar" 
                      role="progressbar" 
                      style={{ width: `${extractionProgress}%` }} 
                      aria-valuenow={extractionProgress} 
                      aria-valuemin="0" 
                      aria-valuemax="100"
                    >
                      {extractionProgress}%
                    </div>
                  </div>
                  <small>Analizando proyecto en segundo plano...</small>
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