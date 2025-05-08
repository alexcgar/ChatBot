import React, { useState, useEffect, useRef } from 'react';
import { FaRobot, FaPaperPlane, FaTimes } from 'react-icons/fa';
import './ChatBot.css';
import { LOCAL_API_URL } from '../../services/api';

// Header del chat - make sure header is always visible
const ChatHeader = ({ onClose }) => (
  <div className="chat-header">
    <div className="chat-header-title">
      <FaRobot style={{ fontSize: '18px', marginRight: '8px' }} /> 
      <span>Asistente Virtual</span>
    </div>
    <button 
      onClick={onClose} 
      className="chat-close-button"
      aria-label="Cerrar chat"
    >
      <FaTimes size={16} />
    </button>
  </div>
);

// Mejorar el diseño del input
const ChatInput = ({ value = '', onChange, onSubmit, isTyping, placeholder }) => {
  // Función para manejar pulsación de tecla
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !isTyping && value.trim()) {
      e.preventDefault(); // Evitar salto de línea
      onSubmit();
    }
  };

  return (
    <div className="chat-input-container">
      <input
        type="text"
        className="chat-input"
        value={value}
        onChange={onChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={isTyping}
      />
      <button 
        className="send-button" 
        onClick={onSubmit}
        disabled={(!value || !value.trim()) || isTyping}
      >
        <FaPaperPlane size={16} />
      </button>
    </div>
  );
};

// Añadir este componente después de ChatInput:

const OptionsDisplay = ({ options, onSelect }) => {
  if (!Array.isArray(options) || options.length === 0) return null;
  
  return (
    <div className="options-container">
      {options.map((option, idx) => (
        <button 
          key={option.CodAnswer || idx}
          className="option-button"
          onClick={() => onSelect(option.Description)}
        >
          {option.Description}
        </button>
      ))}
    </div>
  );
};

// CORRECCIÓN: Mover isFieldEmpty fuera del componente para evitar duplicación
const isFieldEmpty = (data, fieldId) => {
  if (!data || !fieldId) return true;
  if (typeof data !== 'object') return true;
  const value = data[fieldId];
  return value === undefined || value === null || value === '';
};

// Componente completo con correcciones

const Chatbot = ({ questions = [], onUpdateFormData, formData = {}, onClose, isVisible }) => {
  // Estado necesario
  const safeFormData = React.useMemo(() => formData || {}, [formData]);
  const [autoCompletedFields, setAutoCompletedFields] = useState([]);
  const [chatHistory, setChatHistory] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  
  // CORRECCIÓN: Añadir estados faltantes
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionProgress, setExtractionProgress] = useState(0);
  
  const chatMessagesAreaRef = useRef(null);
  const typingTimerRef = useRef(null);

  // Función para mostrar el indicador de escritura con duración mínima
  const setTypingWithMinDuration = (isTypingValue) => {
    if (isTypingValue) {
      setIsTyping(true);
      if (typingTimerRef.current) {
        clearTimeout(typingTimerRef.current);
        typingTimerRef.current = null;
      }
    } else {
      if (!typingTimerRef.current) {
        typingTimerRef.current = setTimeout(() => {
          setIsTyping(false);
          typingTimerRef.current = null;
        }, 1500); // 1.5 segundos de duración mínima
      }
    }
  };

  // Limpiar el temporizador al desmontar
  useEffect(() => {
    return () => {
      if (typingTimerRef.current) {
        clearTimeout(typingTimerRef.current);
      }
    };
  }, []);

  // Mensaje inicial del chatbot
  useEffect(() => {
    setChatHistory([{
      sender: 'bot',
      text: '¡Hola! Soy el asistente virtual de Novagric. Cuéntame sobre tu proyecto agrícola y extraeré automáticamente la información relevante. Puedes enviar varios mensajes con diferentes detalles y completaré los campos del formulario.',
      questionId: 'initial-message'
    }]);
  }, []);

  // Funciones de caché sin cambios
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

  // Función para extraer datos en lotes
  const extractDataInBatches = React.useCallback(async (description, allQuestions) => {
    // No cambiamos isTyping aquí para evitar parpadeos
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
      
      const mappedFormData = {};
      const autoCompletedFields = [];
      
      // Recorrer las preguntas y verificar si hay datos extraídos para cada una
      safeQuestions.forEach(question => {
        if (!question || !question.Description || !question.IDQuestion) return;
        
        const fieldValue = extractedData[question.Description];
        
        if (fieldValue !== undefined && fieldValue !== null && fieldValue !== '') {
          // Tenemos un valor para esta pregunta
          
          // Para campos tipo select (Type 3), buscar el CodAnswer adecuado
          if (question.Type === 3 && Array.isArray(question.Answers) && question.Answers.length > 0) {
            // Convertir el valor extraído a minúscula para comparación insensible a mayúsculas
            const extractedValueLower = String(fieldValue).toLowerCase();
            
            // Buscar coincidencia exacta primero
            let matchedAnswer = question.Answers.find(
              ans => ans.Description.toLowerCase() === extractedValueLower
            );
            
            // Si no hay coincidencia exacta, buscar coincidencia parcial
            if (!matchedAnswer) {
              matchedAnswer = question.Answers.find(
                ans => ans.Description.toLowerCase().includes(extractedValueLower) ||
                      extractedValueLower.includes(ans.Description.toLowerCase())
              );
            }
            
            // Si encontramos una coincidencia, usar el CodAnswer
            if (matchedAnswer) {
              mappedFormData[question.IDQuestion] = matchedAnswer.CodAnswer.toString();
              console.log(`Coincidencia encontrada para ${question.Description}: "${fieldValue}" -> ${matchedAnswer.Description} (${matchedAnswer.CodAnswer})`);
            } else {
              // Si no hay coincidencia, usar el valor original como fallback
              mappedFormData[question.IDQuestion] = fieldValue;
              console.log(`No se encontró coincidencia para ${question.Description}: "${fieldValue}"`);
            }
          } else {
            // Para otros tipos de campos, usar el valor directamente
            mappedFormData[question.IDQuestion] = fieldValue;
          }
          
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
    }
  }, [questions]); // CORREGIDO: Añadir questions como dependencia

  // Función para procesar lotes en segundo plano
  const processBatchesInBackground = React.useCallback(async (description, batches, existingData) => {
    // Implementación con correcciones:
    // Garantizar que existingData sea un objeto
    let accumulatedData = {...(existingData || {})};
    let completedBatches = 0;
    
    // Iniciar con un progreso mínimo visible
    setExtractionProgress(5);
    setIsExtracting(true); // CORRECCIÓN: Establecer isExtracting al iniciar
    
    // Definir el intervalo fuera del bloque try para que sea accesible en finally
    let progressInterval;
    
    try {
      // Verificar que batches sea un array
      if (!Array.isArray(batches) || batches.length === 0) {
        console.log("No hay lotes para procesar en segundo plano");
        return;
      }
      
      // Establecer un intervalo de actualización de progreso simulado
      // para que la barra siempre muestre algún movimiento
      progressInterval = setInterval(() => {
        setExtractionProgress(prev => {
          // Si el progreso ya es alto, no incrementar más
          if (prev >= 95) return prev;
          // Incrementar ligeramente el progreso para dar sensación de movimiento
          return prev + 0.5;
        });
      }, 800);
      
      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        // Verificar que el lote sea un array válido
        if (!Array.isArray(batch) || batch.length === 0) continue;
        
        // Evitar bloquear la interfaz de usuario
        await new Promise(resolve => setTimeout(resolve, 100));
        
        try {
          const result = await extractDataInBatches(description, batch);
          
          // Añadir este debug:
          console.log(`Lote ${i+1}/${batches.length} procesado:`, 
                     result && result.data ? Object.keys(result.data).length : 0, 
                     "campos extraídos");
          
          if (result && result.data && Object.keys(result.data).length > 0) {
            const newData = result.data;
            
            // Acumular datos para el resultado final
            Object.entries(newData).forEach(([key, value]) => {
              accumulatedData[key] = value;
            });
            
            // Actualizar autoCompletedFields con los nuevos campos
            const newAutoCompletedFields = [...autoCompletedFields, ...(result.autoCompletedFields || [])];
            setAutoCompletedFields(newAutoCompletedFields);

            // Proceso los datos para asegurar compatibilidad con el formulario
            const formattedData = {};
            Object.entries(newData).forEach(([key, value]) => {
              // Para campos select, asegurar que sea string
              const questionObj = questions.find(q => q.IDQuestion === key);
              if (questionObj && questionObj.Type === 3) {
                formattedData[key] = String(value);
              } else {
                formattedData[key] = value;
              }
            });

            // Imprimir para debug
            console.log("Enviando datos formateados al formulario:", formattedData);

            // Actualizar formulario con datos formateados
            onUpdateFormData(formattedData, result.autoCompletedFields);
            
            // Mostrar qué campos específicos se han extraído
            console.log("Campos extraídos en este lote:", 
                       Object.keys(newData).map(key => {
                         const questionObj = questions.find(q => q.IDQuestion === key);
                         return questionObj ? questionObj.Description : key;
                       }));
          } else {
            console.warn("Lote procesado sin extraer campos");
          }
          
          // Actualizar progreso basado en la cantidad de lotes procesados
          completedBatches++;
          // Calculamos el progreso real basado en los lotes completados (max 95%)
          const realProgress = Math.min(95, Math.floor((completedBatches / batches.length) * 100));
          setExtractionProgress(realProgress);
          
        } catch (err) {
          console.error("Error procesando lote en segundo plano:", err);
          // Incrementar contador de batches incluso si hubo error
          completedBatches++;
        }
      }
      
      // Limpiar el intervalo de progreso simulado
      clearInterval(progressInterval);
      
      // Marcar como 100% completado al finalizar todos los lotes
      setExtractionProgress(100);
      
      // Objeto seguro para guardar en caché
      const safeResult = {
        data: accumulatedData || {},
        autoCompletedFields: Object.keys(accumulatedData || {})
      };
      
      saveCachedExtraction(description, safeResult);
      
      // Notificación de finalización
      const numFieldsCompleted = Object.keys(accumulatedData || {}).length;
      setChatHistory(prev => {
        // Add the new message
        const newHistory = [...prev, {
          sender: 'bot',
          text: `He terminado de analizar tu proyecto. He completado automáticamente ${numFieldsCompleted} campos (marcados con 'Auto'). Puedes continuar completando el resto del formulario.`,
          questionId: 'background-extraction-complete',
          isBackgroundNotification: true
        }];
        
        // Ensure we scroll to bottom after state update
        setTimeout(() => {
          if (chatMessagesAreaRef.current) {
            chatMessagesAreaRef.current.scrollTop = chatMessagesAreaRef.current.scrollHeight;
          }
        }, 100);
        
        return newHistory;
      });
    } finally {
      // En caso de error, asegurarse de limpiar el intervalo
      if (progressInterval) {
        clearInterval(progressInterval);
      }
      
      // Siempre marcar como 100% al finalizar
      setExtractionProgress(100);
      setIsExtracting(false);
    }
  }, [extractDataInBatches, onUpdateFormData, questions, saveCachedExtraction, autoCompletedFields, setAutoCompletedFields]);

  // Función para mostrar resumen de campos completados
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
    
    return `¡Genial! He extraído automáticamente ${completedFields} campos de tu proyecto (marcados con 'Auto'), incluyendo ${fieldsList}${moreFields}. Continuemos con los campos restantes.`;
  }, [questions]);

  // CORRECCIÓN: Implementar una sola versión de handleSend
  const handleSend = React.useCallback(async (answer) => {
    setChatHistory(prev => [...prev, { sender: 'user', text: answer }]);
    
    // Indicar que el bot está escribiendo
    setTypingWithMinDuration(true);
    
    try {
      // Determinar qué campos están vacíos
      const emptyFields = questions.filter(q => 
        q && q.IDQuestion && isFieldEmpty(safeFormData, q.IDQuestion)
      );
      
      console.log(`Analizando mensaje para extraer información. Campos vacíos: ${emptyFields.length}`);
      
      // Si hay campos vacíos, intentar extraer información
      if (emptyFields.length > 0) {
        // Intentar extraer información del mensaje actual
        const result = await extractDataInBatches(answer, emptyFields);
        
        if (result && result.data && Object.keys(result.data).length > 0) {
          console.log("Información extraída:", result.data);
          
          // Actualizar el formulario con los datos extraídos
          onUpdateFormData(result.data, result.autoCompletedFields || []);
          
          // Actualizar campos autocompletados
          setAutoCompletedFields(prev => {
            const newFields = [...prev];
            (result.autoCompletedFields || []).forEach(field => {
              if (!newFields.includes(field)) newFields.push(field);
            });
            return newFields;
          });
          
          // Mostrar qué campos se completaron
          const completedFieldNames = emptyFields
            .filter(q => result.data[q.IDQuestion])
            .map(q => q.Description);
          
          if (completedFieldNames.length > 0) {
            const fieldsList = completedFieldNames.join(", ");
            setChatHistory(prev => [...prev, {
              sender: 'bot',
              text: `He extraído la siguiente información de tu mensaje: ${fieldsList}`,
              questionId: 'extraction-success-continuous'
            }]);
            
            // Mostrar cuántos campos quedan por completar
            const remainingFieldsCount = questions.filter(q => 
              q && q.IDQuestion && isFieldEmpty({...safeFormData, ...result.data}, q.IDQuestion)
            ).length;
            
            setChatHistory(prev => [...prev, {
              sender: 'bot',
              text: `Todavía quedan ${remainingFieldsCount} campos por completar. Cuéntame más sobre tu proyecto.`,
              questionId: 'remaining-fields'
            }]);
          } else {
            // No se completaron nuevos campos
            setChatHistory(prev => [...prev, {
              sender: 'bot',
              text: 'Gracias por la información. ¿Puedes contarme más detalles sobre tu proyecto?',
              questionId: 'no-extraction'
            }]);
          }
        } else {
          // No se pudo extraer información
          setChatHistory(prev => [...prev, {
            sender: 'bot',
            text: 'Gracias por el mensaje. ¿Hay algo más que quieras añadir sobre tu proyecto?',
            questionId: 'no-extraction'
          }]);
        }
      } else {
        // Todos los campos están completos
        setChatHistory(prev => [...prev, {
          sender: 'bot',
          text: 'Todos los campos han sido completados. ¡Gracias por la información!',
          questionId: 'all-fields-complete'
        }]);
      }
    } catch (error) {
      console.error('Error al procesar el mensaje:', error);
      setChatHistory(prev => [...prev, {
        sender: 'bot',
        text: 'Lo siento, ha ocurrido un error al procesar tu mensaje. ¿Puedes intentarlo de nuevo?',
        questionId: 'error-processing'
      }]);
    } finally {
      setTypingWithMinDuration(false);
    }
  }, [questions, safeFormData, onUpdateFormData, extractDataInBatches]);

  // HOOK USERENDERCHATINPUT CORREGIDO
  const useRenderInput = () => {
    const [inputValue, setInputValue] = useState('');
    
    // Función para manejar el envío
    const handleSubmit = React.useCallback(() => {
      if (inputValue.trim()) {
        handleSend(inputValue);
        setInputValue('');
      }
    }, [inputValue]);
    
    // Manejar cambio de entrada
    const handleChange = (e) => {
      setInputValue(e.target.value);
    };
    
    return React.useMemo(() => {
      // Calcular cuántos campos quedan por completar
      const emptyFieldsCount = questions.filter(q => 
        q && q.IDQuestion && isFieldEmpty(safeFormData, q.IDQuestion)
      ).length;
      
      // Ajustar placeholder según los campos pendientes
      let placeholder = emptyFieldsCount > 0
        ? `Cuéntame sobre tu proyecto (${emptyFieldsCount} campos pendientes)...`
        : 'Cuéntame más sobre tu proyecto...';
    
      return (
        <ChatInput
          value={inputValue}
          onChange={handleChange}
          onSubmit={handleSubmit}
          isTyping={isTyping}
          placeholder={placeholder}
        />
      );
    }, [questions, safeFormData, inputValue, handleSubmit, isTyping]);
  };

  const chatInputComponent = useRenderInput();

  // ESTRUCTURA DE RENDERIZADO CORREGIDA
  return (
    <div className="chatbot-wrapper">
      <ChatHeader onClose={onClose} />
      <div className="chatbot-main-container">
        <div className="chat-card">
          <div className="chat-card-body">
            <div className="chat-messages-area" ref={chatMessagesAreaRef}>
              {chatHistory.map((message, idx) => (
                <div 
                  key={`msg-${idx}`}
                  className={`chat-message ${message.sender === 'user' ? 'user-message' : 'bot-message'}`}
                >
                  {message.sender === 'bot' && (
                    <div className="bot-avatar">
                      <FaRobot />
                    </div>
                  )}
                  <div className="message-content">
                    <div className="message-text">{message.text}</div>
                  </div>
                </div>
              ))}
              
              {isTyping && (
                <div className="chat-message bot-message">
                  <div className="bot-avatar">
                    <FaRobot />
                  </div>
                  <div className="message-content">
                    <div className="typing-indicator">
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>
                  </div>
                </div>
              )}
              
              {isExtracting && (
                <div className="chat-message bot-message extraction-progress">
                  <div className="bot-avatar">
                    <FaRobot />
                  </div>
                  <div className="message-content">
                    <div className="message-text">
                      Analizando tu proyecto para extraer información relevante...
                    </div>
                    <div className="progress-bar-container">
                      <div 
                        className="progress-bar" 
                        style={{ width: `${extractionProgress}%` }}
                      ></div>
                    </div>
                  </div>
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