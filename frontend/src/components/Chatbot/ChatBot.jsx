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

const useRenderChatInput = (currentIndex, questions, isTyping, handleSend) => {
  const [inputValue, setInputValue] = useState('');
  
  // Función para manejar el envío respetando la interfaz existente
  const handleSubmit = React.useCallback(() => {
    if (inputValue.trim()) {
      handleSend(inputValue);
      setInputValue('');
    }
  }, [inputValue, handleSend]);
  
  // Manejar cambio de entrada
  const handleChange = (e) => {
    setInputValue(e.target.value);
  };
  
  return React.useMemo(() => {
    if (currentIndex >= questions.length) return null;
    
    // Placeholder según el tipo de pregunta
    let placeholder = 'Escribe tu consulta aquí...';
    
    if (currentIndex === -1) {
      placeholder = 'Describe tu proyecto agrícola aquí...';
    } else if (currentIndex < questions.length) {
      const currentQuestion = questions[currentIndex];
      if (currentQuestion.Type === 3) {
        placeholder = `Selecciona una opción para ${currentQuestion.Description}...`;
      } else if (currentQuestion.Type === 4) {
        placeholder = `Selecciona opciones para ${currentQuestion.Description} (separa con coma)...`;
      } else {
        placeholder = `Escribe tu respuesta para ${currentQuestion.Description}...`;
      }
    }
    
    return (
      <ChatInput
        value={inputValue}
        onChange={handleChange}
        onSubmit={handleSubmit}
        isTyping={isTyping}
        placeholder={placeholder} // Añadir esta línea para utilizar el placeholder dinámico
      />
    );
  }, [currentIndex, questions, inputValue, handleSubmit, isTyping]);
};

const Chatbot = ({ questions = [], onUpdateFormData, formData = {}, onClose, isVisible }) => {
  // Asegurarse de que formData siempre sea un objeto
  const safeFormData = React.useMemo(() => formData || {}, [formData]);
  // Guardar los campos auto-completados en el estado local
  const [autoCompletedFields, setAutoCompletedFields] = useState([]);
  const [chatHistory, setChatHistory] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(-1); // -1 indica descripción inicial
  const [isTyping, setIsTyping] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionProgress, setExtractionProgress] = useState(0);
  const chatMessagesAreaRef = useRef(null);
  const typingTimerRef = useRef(null);

  // Función para mostrar el indicador de escritura con duración mínima
  const setTypingWithMinDuration = (isTypingValue) => {
    if (isTypingValue) {
      // Si estamos activando el indicador, simplemente activarlo
      setIsTyping(true);
      // Limpiar cualquier temporizador anterior
      if (typingTimerRef.current) {
        clearTimeout(typingTimerRef.current);
        typingTimerRef.current = null;
      }
    } else {
      // Si estamos desactivando, asegurar duración mínima de 1.5 segundos
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
  }, []);

  const processBatchesInBackground = React.useCallback(async (description, batches, existingData) => {
    // Garantizar que existingData sea un objeto
    let accumulatedData = {...(existingData || {})};
    let completedBatches = 0;
    
    // Iniciar con un progreso mínimo visible
    setExtractionProgress(5);
    
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
      // No cambiamos isTyping aquí para evitar problemas de parpadeo
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
    
    return `¡Genial! He extraído automáticamente ${completedFields} campos de tu proyecto (marcados con 'Auto'), incluyendo ${fieldsList}${moreFields}. Continuemos con los campos restantes.`;
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
      setTypingWithMinDuration(true); // Iniciar indicador de escritura
      try {
        const cachedData = getCachedExtraction(answer);
        if (cachedData) {
          const mappedFormData = cachedData.data || {};
          
          // Procesar los datos en caché para campos select
          questions.forEach(question => {
            if (question.Type === 3 && mappedFormData[question.IDQuestion] && 
                Array.isArray(question.Answers) && question.Answers.length > 0) {
              
              const cachedValue = String(mappedFormData[question.IDQuestion]).toLowerCase();
              
              // Verificar si el valor ya es un CodAnswer válido
              const isValidCode = question.Answers.some(
                ans => String(ans.CodAnswer).toLowerCase() === cachedValue
              );
              
              // Si no es un código válido, buscar la coincidencia por descripción
              if (!isValidCode) {
                const matchedAnswer = question.Answers.find(
                  ans => ans.Description.toLowerCase().includes(cachedValue) ||
                        cachedValue.includes(ans.Description.toLowerCase())
                );
                
                if (matchedAnswer) {
                  mappedFormData[question.IDQuestion] = matchedAnswer.CodAnswer.toString();
                }
              }
            }
          });
          
          const autoFields = cachedData.autoCompletedFields || [];
          setAutoCompletedFields(autoFields);
          onUpdateFormData(mappedFormData, autoFields);
          
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
          
          // Agregar mensaje de análisis sin cambiar el estado de isTyping
          setChatHistory(prev => [...prev, {
            sender: 'bot',
            text: 'Estoy analizando tu proyecto y completando automáticamente algunos campos del formulario. Los campos identificados aparecerán con una etiqueta "(Auto)". Puedes continuar respondiendo preguntas mientras termino el análisis.',
            questionId: 'background-extraction-start'
          }]);
          
          // Iniciar extracción prioritaria sin cambiar isTyping
          const quickResult = await extractDataInBatches(answer, priorityQuestions);
          if (quickResult && quickResult.data) {
            // Actualizar formulario con datos prioritarios
            const quickFields = quickResult.autoCompletedFields || [];
            setAutoCompletedFields(quickFields);
            onUpdateFormData(quickResult.data, quickFields);
            
            // Mostrar breve resumen sin cambiar isTyping
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
            // Solo cambiar isTyping a false cuando ya tenemos la siguiente pregunta lista
            setTypingWithMinDuration(false);
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
        setTypingWithMinDuration(false);
      }
    } else {
      setTypingWithMinDuration(true);
      try {
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
      } finally {
        setTypingWithMinDuration(false);
      }
    }
  }, [currentIndex, onUpdateFormData, questions, showCompletedFieldsSummary, extractDataInBatches, processBatchesInBackground, safeFormData]);

  useEffect(() => {
    const showQuestion = async () => {
      if (currentIndex >= 0 && currentIndex < questions.length) {
        const currentQuestion = questions[currentIndex];
        const currentFormData = safeFormData;

        // Evitar repetición si ya está contestada
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

        // Evitar repetir preguntas
        const alreadyAsked = chatHistory.some(msg => msg.questionId === currentQuestion.IDQuestion);
        if (alreadyAsked) {
          return;
        }

        setTypingWithMinDuration(true);
        try {
          const response = await fetch(`${LOCAL_API_URL}/generate_question`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ input: currentQuestion.Description })
          });
          const data = await response.json();
          let questionText = data.question || `¿Cuál es el ${currentQuestion.Description}?`;
          
          // Añadir opciones para preguntas de tipo selección
          if ((currentQuestion.Type === 3 || currentQuestion.Type === 4) && 
              Array.isArray(currentQuestion.Answers) && 
              currentQuestion.Answers.length > 0) {
            
            // Añadir las opciones disponibles
            questionText += '\n\nOpciones disponibles:';
            currentQuestion.Answers.forEach((answer, idx) => {
              questionText += `\n${idx + 1}. ${answer.Description}`;
            });
            
            if (currentQuestion.Type === 3) {
              questionText += '\n\nSelecciona una opción por su número o nombre.';
            } else {
              questionText += '\n\nPuedes seleccionar varias opciones separándolas por comas.';
            }
          }
          
          setChatHistory(prev => [...prev, {
            sender: 'bot',
            text: questionText,
            questionId: currentQuestion.IDQuestion,
            options: (currentQuestion.Type === 3 || currentQuestion.Type === 4) ? 
                     currentQuestion.Answers : null
          }]);
        } catch (error) {
          console.error('Error al generar la pregunta:', error);
          setChatHistory(prev => [...prev, {
            sender: 'bot',
            text: `¿Cuál es el ${currentQuestion.Description}?`,
            questionId: currentQuestion.IDQuestion
          }]);
        } finally {
          setTypingWithMinDuration(false);
        }
      }
    };
    showQuestion();
  }, [currentIndex, questions, safeFormData, chatHistory]);

  useEffect(() => {
    if (chatMessagesAreaRef.current) {
      // Ensure always scrolls to bottom after any state update
      const scrollToBottom = () => {
        if (chatMessagesAreaRef.current) {
          chatMessagesAreaRef.current.scrollTop = chatMessagesAreaRef.current.scrollHeight;
        }
      };
      
      // Try immediately
      scrollToBottom();
      
      // And also with a small delay to ensure DOM updated
      setTimeout(scrollToBottom, 100);
    }
  }, [chatHistory, isTyping, isExtracting, extractionProgress, isVisible, currentIndex]);

  useEffect(() => {
    if (isVisible && chatMessagesAreaRef.current) {
      chatMessagesAreaRef.current.scrollTop = chatMessagesAreaRef.current.scrollHeight;
    }
  }, [isVisible]);

  const chatInputComponent = useRenderChatInput(currentIndex, questions, isTyping, handleSend);

  return (
    <div className="chatbot-wrapper">
      <ChatHeader onClose={onClose} />
      <div className="chatbot-main-container">
        <div className="chat-card">
          <div className="chat-card-body">
            <div className="chat-messages-area" ref={chatMessagesAreaRef}>
              {chatHistory.length === 0 && (
                <div className="empty-chat-message">
                  Esperando tu mensaje...
                </div>
              )}
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
                
                // Determinar si el campo fue autocompletado
                const isAutoCompleted = isQuestion && 
                  (Array.isArray(autoCompletedFields) && autoCompletedFields.includes(message.questionId)) ||
                  message.isAutoCompleted === true;
                
                // Determinar las clases CSS según estado
                let requiredClass = '';
                if (isRequired) {
                  requiredClass = isAnswered ? 'required-answered' : 'required-unanswered';
                }

                return (
                  <React.Fragment key={index}>
                    <div 
                      className={`message ${message.sender} ${isAutoCompleted ? 'auto-completed' : ''} ${requiredClass}`}
                    >
                      {message.text}
                      {isRequired && !isAnswered && <span className="required-indicator">*</span>}
                      {isAutoCompleted && <span className="auto-tag">(Auto)</span>}
                    </div>
                    
                    {/* Mostrar botones de opciones si el mensaje tiene opciones disponibles */}
                    {message.options && Array.isArray(message.options) && message.options.length > 0 && (
                      <OptionsDisplay 
                        options={message.options} 
                        onSelect={(optionText) => {
                          // Simular que el usuario escribe la opción y envía
                          const input = document.querySelector('.chat-input');
                          if (input) {
                            const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
                              window.HTMLInputElement.prototype, 'value'
                            ).set;
                            nativeInputValueSetter.call(input, optionText);
                            input.dispatchEvent(new Event('input', { bubbles: true }));
                            
                            // Retrasar un poco el envío para que se vea el cambio
                            setTimeout(() => handleSend(optionText), 100);
                          } else {
                            handleSend(optionText);
                          }
                        }}
                      />
                    )}
                  </React.Fragment>
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
                      style={{ 
                        width: `${extractionProgress}%`, 
                        transition: 'width 0.6s ease-in-out'
                      }} 
                      aria-valuenow={extractionProgress} 
                      aria-valuemin="0" 
                      aria-valuemax="100"
                    >
                    </div>
                  </div>
                  <small>Analizando tu proyecto en segundo plano ({Math.round(extractionProgress)}%)</small>
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