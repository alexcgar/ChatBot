import React, { useState, useEffect, useRef } from 'react';
import { FaRobot, FaPaperPlane, FaTimes, FaMicrophone, FaStop, FaAcquisitionsIncorporated, FaLeaf, FaCanadianMapleLeaf } from 'react-icons/fa';
import './ChatBot.css';
import { LOCAL_API_URL } from '../../services/api';
import { formSections} from '../FormularioManual/sectionConfig';// Header del chat - make sure header is always visible

// Añadir esta función fuera del componente principal para su reutilización

// Función auxiliar para verificar si una pregunta pertenece a una sección omitida
const isSectionSkipped = (question, sectionStatuses) => {
  if (!question || !question.Orden) return false;
  
  const section = formSections.find(section => 
    section.orderRanges.some(range => 
      question.Orden >= range.min && question.Orden <= range.max
    )
  );
  
  // Fixed: Remove duplicate check and ensure case-insensitive comparison
  return section && 
    sectionStatuses[section.id]?.toLowerCase?.() === 'no';
};

const ChatHeader = ({ onClose }) => (
  <div className="chat-header">
    <div className="chat-header-title">
      <FaCanadianMapleLeaf style={{ fontSize: '19px', marginRight: '8px' }} /> 
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
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);

  // Handle keyboard submission
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !isTyping && value.trim()) {
      e.preventDefault(); // Evitar salto de línea
      onSubmit();
    }
  };

  // Start recording function
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        // Create audio blob from recorded chunks
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        console.log("Audio recording completed, blob size:", audioBlob.size);
        
        // Set transcribing state
        setIsTranscribing(true);
        
        // Show "Transcribing..." message
        if (onChange) {
          onChange({ target: { value: "Transcribiendo audio..." } });
        }
        
        try {
          // Create FormData to send the audio file
          const formData = new FormData();
          formData.append('audio', audioBlob, 'recording.webm');
          
          // Send to backend for transcription
          const response = await fetch(`${LOCAL_API_URL}/transcribe_audio`, {
            method: 'POST',
            body: formData,
          });
          
          if (!response.ok) {
            throw new Error(`Server responded with ${response.status}`);
          }
          
          const result = await response.json();
          
          if (result.success && result.text) {
            // Set the transcribed text in the input field
            onChange({ target: { value: result.text } });
          } else {
            throw new Error("Transcription failed");
          }
        } catch (error) {
          console.error("Error transcribing audio:", error);
          onChange({ target: { value: "Error al transcribir el audio." } });
        } finally {
          // Stop all tracks to release microphone
          stream.getTracks().forEach(track => track.stop());
          
          // Reset recording state
          setIsRecording(false);
          setIsTranscribing(false);
          setRecordingTime(0);
          clearInterval(timerRef.current);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      
      // Start recording timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      
    } catch (error) {
      console.error("Error accessing microphone:", error);
      alert("No se pudo acceder al micrófono. Por favor, verifica los permisos.");
    }
  };

  // Stop recording function
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
    }
  };

  // Format recording time as MM:SS
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
    const secs = (seconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  };

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  const inputPlaceholder = isRecording 
    ? "Grabando audio..." 
    : isTranscribing 
      ? "Transcribiendo audio..." 
      : placeholder;

  return (
    <div className="chat-input-container">
      <input
        type="text"
        className="chat-input"
        value={value}
        onChange={onChange}
        onKeyDown={handleKeyDown}
        placeholder={inputPlaceholder}
        disabled={isTyping || isRecording}
      />
      
      {isRecording && (
        <div className="recording-indicator">
          <span className="recording-pulse"></span>
          <span className="recording-time">{formatTime(recordingTime)}</span>
        </div>
      )}
      
      <button 
        className={`mic-button ${isRecording ? 'recording' : ''}`}
        onClick={isRecording ? stopRecording : startRecording}
        disabled={isTyping}
        title={isRecording ? "Detener grabación" : "Enviar mensaje de voz"}
      >
        {isRecording ? <FaStop size={16} /> : <FaMicrophone size={16} />}
      </button>
      
      <button 
        className="send-button" 
        onClick={onSubmit}
        disabled={(!value || !value.trim()) || isTyping || isRecording || isTranscribing}
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
  if (value === undefined || value === null || value === '') return true;
  
  // Verificar valores por defecto que deberían considerarse como vacíos
  if (typeof value === 'string') {
    const lowerValue = value.toLowerCase().trim();
    const defaultValues = [
      'no se especifica', 
      '-- selecciona --',
      'no especificado',
      'no disponible',
      'no indicado',
      'desconocido',
      'sin especificar',
      'n/a',
      'na',
      'no aplica'
    ];
    
    if (defaultValues.includes(lowerValue)) return true;
  }
  
  return false;
};

// Componente completo con correcciones

const Chatbot = ({ 
  questions = [], 
  onUpdateFormData, 
  formData = {}, 
  onClose, 
  isVisible,
  sectionStatuses = {} // Añadir prop con valor por defecto
}) => {
  // Estado necesario
  const safeFormData = React.useMemo(() => formData || {}, [formData]);
  const safeSectionStatuses = React.useMemo(() => sectionStatuses || {}, [sectionStatuses]);
  const [autoCompletedFields, setAutoCompletedFields] = useState([]);
  const [chatHistory, setChatHistory] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionProgress, setExtractionProgress] = useState(0);
  
  const chatMessagesAreaRef = useRef(null);
  const typingTimerRef = useRef(null);
  const [inputValue, setInputValue] = useState(''); // Añadir este estado

  // CORREGIDO: Mover estas funciones dentro del componente
  const getPendingQuestionsBySectionId = React.useCallback((sectionId) => {
    // Verificar que tengamos un ID de sección válido
    if (!sectionId || typeof sectionId !== 'string') {
      return { section: null, pendingQuestions: [], totalQuestions: 0, completedQuestions: 0 };
    }
    
    // Buscar la sección por ID
    const section = formSections.find(s => s.id === sectionId);
    if (!section) {
      return { section: null, pendingQuestions: [], totalQuestions: 0, completedQuestions: 0 };
    }
    
    // Verificar si la sección está marcada como "no" - devolver vacío en ese caso
    if (safeSectionStatuses[sectionId] === 'no') {
      return { 
        section, 
        pendingQuestions: [], 
        totalQuestions: 0,  // Importante: contar 0 preguntas totales para secciones no aplicables
        completedQuestions: 0 
      };
    }
    
    // Si la sección es aplicable, continuar normalmente
    const sectionQuestions = questions.filter(q => {
      // Verificar que la pregunta tenga un orden
      if (!q || typeof q.Orden !== 'number') return false;
      
      // Verificar si el orden está dentro de alguno de los rangos de la sección
      return section.orderRanges.some(range => 
        q.Orden >= range.min && q.Orden <= range.max
      );
    });
    
    // Filtrar preguntas pendientes (no completadas)
    const pendingQuestions = sectionQuestions.filter(q => 
      q && q.IDQuestion && isFieldEmpty(safeFormData, q.IDQuestion)
    );
    
    return { 
      section, 
      pendingQuestions,
      totalQuestions: sectionQuestions.length,
      completedQuestions: sectionQuestions.length - pendingQuestions.length
    };
  }, [questions, safeFormData, safeSectionStatuses]);  // Añadir safeSectionStatuses como dependencia

  const getFormCompletionSummary = React.useCallback(() => {
    const sectionSummaries = formSections.map(section => {
      const { pendingQuestions, totalQuestions } = getPendingQuestionsBySectionId(section.id);
      const completedCount = totalQuestions - pendingQuestions.length;
      const percentComplete = totalQuestions > 0 ? 
        Math.round((completedCount / totalQuestions) * 100) : 0;
      
      return {
        id: section.id,
        title: section.title,
        percentComplete,
        pendingCount: pendingQuestions.length,
        totalCount: totalQuestions
      };
    }).filter(summary => summary.totalCount > 0); // Solo secciones con preguntas
    
    // Ordenar por porcentaje de completitud (menos completas primero)
    sectionSummaries.sort((a, b) => a.percentComplete - b.percentComplete);
    
    return sectionSummaries;
  }, [getPendingQuestionsBySectionId]);

  // Función para mostrar el indicador de escritura con duración mínima
  const setTypingWithMinDuration = React.useCallback((isTypingValue) => {
    if (isTypingValue) {
      setIsTyping(true);
      if (typingTimerRef.current) {
        clearTimeout(typingTimerRef.current);
        typingTimerRef.current = null;
      }
    } else {
      // Mantener isTyping en true por al menos 1.5 segundos antes de cambiarlo a false
      if (!typingTimerRef.current) {
        typingTimerRef.current = setTimeout(() => {
          setIsTyping(false);
          typingTimerRef.current = null;
        }, 1500); // 1.5 segundos de duración mínima
      }
    }
  }, []);

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

  // Añadir este efecto para asegurar que se vean los mensajes más recientes
  useEffect(() => {
    if (chatMessagesAreaRef.current) {
      chatMessagesAreaRef.current.scrollTop = chatMessagesAreaRef.current.scrollHeight;
    }
  }, [chatHistory, isTyping, isExtracting]); // Hacer scroll cuando cambian estos estados

  // Añadir este efecto para manejar la visibilidad
  useEffect(() => {
    // Scroll al fondo cuando el chat se hace visible
    if (isVisible && chatMessagesAreaRef.current) {
      chatMessagesAreaRef.current.scrollTop = chatMessagesAreaRef.current.scrollHeight;
    }
  }, [isVisible]);

  // Funciones de caché sin cambios
  const getCachedExtraction = React.useCallback((description) => {
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
    } catch (error) {
      console.error("Error al recuperar caché:", error);
      return null;
    }
  }, []); // No necesita dependencias ya que localStorage es estable

  const saveCachedExtraction = React.useCallback((description, extractedData) => {
    try {
      const cacheKey = `extraction_${description.substring(0, 50).replace(/[^a-z0-9]/gi, '_')}`;
      localStorage.setItem(cacheKey, JSON.stringify(extractedData));
    } catch (error) {
      console.error("Error al guardar caché:", error);
    }
  }, []); // Sin dependencias, ya que localStorage no cambia

  // Corregir dependencias
  const extractDataInBatches = React.useCallback(async (description, allQuestions) => {
    try {
      // Asegurarse que allQuestions sea un array
      const safeQuestions = Array.isArray(allQuestions) ? allQuestions : [];
      
      if (safeQuestions.length === 0) {
        console.warn("No hay preguntas para procesar");
        return { data: {}, autoCompletedFields: [] };
      }
      
      // Add logging to debug filtering
      console.log("Total questions before filtering:", safeQuestions.length);
      
      // Filtrar preguntas que pertenecen a secciones marcadas como "no"
      const filteredQuestions = safeQuestions.filter(question => {
        const shouldSkip = isSectionSkipped(question, safeSectionStatuses);
        return !shouldSkip;
      });
      
      console.log(`Sending ${filteredQuestions.length} questions to backend (filtered out ${safeQuestions.length - filteredQuestions.length} from No sections)`);
      
      const questionPrompts = filteredQuestions
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
  }, [safeSectionStatuses]); // Añadir safeSectionStatuses como dependencia

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

  // Modificar la dependencia del useCallback para processBatchesInBackground
  const processBatchesInBackground = React.useCallback(async (description, batches, existingData) => {
    // Garantizar que existingData sea un objeto
    let accumulatedData = {...(existingData || {})};
    let completedBatches = 0;
    
    // Iniciar con un progreso mínimo visible
    setExtractionProgress(5);
    setIsExtracting(true);
    
    // Definir el intervalo fuera del bloque try para que sea accesible en finally
    let progressInterval;
    
    try {
      // Verificar que batches sea un array
      if (!Array.isArray(batches) || batches.length === 0) {
        console.log("No hay lotes para procesar en segundo plano");
        return;
      }
      
      
      
      // Establecer un intervalo de actualización de progreso simulado
      progressInterval = setInterval(() => {
        setExtractionProgress(prev => {
          if (prev >= 95) return prev;
          return prev + 0.5;
        });
      }, 800);
      
      // Procesar los lotes sin añadir mensajes intermedios
      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        // Verificar que el lote sea un array válido
        if (!Array.isArray(batch) || batch.length === 0) continue;
        
        // Filtrar preguntas de secciones marcadas como "no" antes de procesar
        const filteredBatch = batch.filter(question => {
          const shouldSkip = isSectionSkipped(question, safeSectionStatuses);
          if (shouldSkip) {
            console.log(`Skipping question: ${question.Description} - belongs to a "No" section`);
          }
          return !shouldSkip;
        });
        
        // Solo procesar si hay preguntas después del filtrado
        if (filteredBatch.length === 0) {
          console.log(`Lote ${i+1}/${batches.length} omitido: todas las preguntas pertenecen a secciones marcadas como "no"`);
          completedBatches++;
          continue;
        }
        
        // Evitar bloquear la interfaz de usuario
        await new Promise(resolve => setTimeout(resolve, 100));
        
        try {
          // Usar el lote filtrado en lugar del original
          const result = await extractDataInBatches(description, filteredBatch);
          
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
          
        } catch (error) {
          console.error("Error procesando lote en segundo plano:", error);
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
      
      // UN SOLO mensaje de finalización con resultados
      const numFieldsCompleted = Object.keys(accumulatedData || {}).length;
      setChatHistory(prev => {
        // Buscar y reemplazar el mensaje anterior de análisis
        const newHistory = prev.filter(msg => 
          msg.questionId !== 'background-processing-single-message'
        );
        
        newHistory.push({
          sender: 'bot',
          text: numFieldsCompleted > 0 
            ? showCompletedFieldsSummary(accumulatedData)
            : 'He analizado tu proyecto, pero no he podido extraer información relevante automáticamente.',
          questionId: 'background-extraction-complete'
        });
        
        // Asegurar scroll al fondo
        setTimeout(() => {
          if (chatMessagesAreaRef.current) {
            chatMessagesAreaRef.current.scrollTop = chatMessagesAreaRef.current.scrollHeight;
          }
        }, 100);
        
        return newHistory;
      });
      
    } catch (error) {
      console.error("Error en la operación:", error);
    } finally {
      // Limpieza final
      if (progressInterval) {
        clearInterval(progressInterval);
      }
      setExtractionProgress(100);
      setIsExtracting(false);
    }
  }, [autoCompletedFields, extractDataInBatches, onUpdateFormData, questions, safeSectionStatuses, saveCachedExtraction, showCompletedFieldsSummary]);

  // Modificar la función handleSend para añadir la lógica de ayuda con secciones

  const handleSend = React.useCallback(async (answer) => {
    setChatHistory(prev => [...prev, { sender: 'user', text: answer }]);
    
    // Indicar que el bot está escribiendo
    setTypingWithMinDuration(true);
    
    try {
      const lowerAnswer = answer.toLowerCase().trim();
      
      // NUEVO: Detectar respuesta afirmativa a una pregunta previa sobre mostrar preguntas pendientes
      // Ver si el último mensaje del bot era una sugerencia para mostrar preguntas de una sección
      const isAffirmativeResponse = ['sí', 'si', 'yes', 'ok', 'vale', 'mostrar', 'muestra', 'quiero'].includes(lowerAnswer);
      
      if (isAffirmativeResponse && chatHistory.length > 0) {
        const lastBotMessage = [...chatHistory].reverse().find(msg => msg.sender === 'bot');
        
        // Buscar si el último mensaje del bot era una sugerencia sobre una sección
        if (lastBotMessage) {
          // Caso 1: Respuesta a una sugerencia específica de sección
          if (lastBotMessage.questionId === 'next-section-suggestion') {
            // Extraer la sección mencionada en el último mensaje
            const sectionMatch = lastBotMessage.text.match(/sección "([^"]+)"/);
            if (sectionMatch) {
              const sectionTitle = sectionMatch[1];
              
              // Buscar la sección por título
              const section = formSections.find(s => s.title === sectionTitle);
              if (section) {
                // Obtener preguntas pendientes para esa sección
                const { pendingQuestions, totalQuestions } = 
                  getPendingQuestionsBySectionId(section.id);
                
                if (pendingQuestions.length === 0) {
                  setChatHistory(prev => [...prev, {
                    sender: 'bot',
                    text: `La sección "${sectionTitle}" ya está completa.`,
                    questionId: 'section-already-complete'
                  }]);
                } else {
                  // Mostrar todas las preguntas pendientes
                  const pendingList = pendingQuestions.map(q => `• ${q.Description}`).join('\n');
                  
                  setChatHistory(prev => [...prev, {
                    sender: 'bot',
                    text: `Estas son las preguntas pendientes en la sección "${sectionTitle}" (${pendingQuestions.length} de ${totalQuestions}):\n\n${pendingList}`,
                    questionId: 'pending-questions-list'
                  }]);
                  
                  // Sugerir la primera pregunta para responder
                  setTimeout(() => {
                    const sortedQuestions = [...pendingQuestions].sort((a, b) => a.Orden - b.Orden);
                    const firstQuestion = sortedQuestions[0];
                    
                    if (firstQuestion) {
                      setChatHistory(prev => [...prev, {
                        sender: 'bot',
                        text: `¿Puedes proporcionarme información para "${firstQuestion.Description}"?`,
                        questionId: 'first-question-prompt'
                      }]);
                    }
                  }, 1800);
                }
                
                setTypingWithMinDuration(false);
                return;
              }
            }
          } 
          // Caso 2: Respuesta a una sugerencia de pregunta específica
          else if (lastBotMessage.questionId === 'next-question-suggestion') {
            const questionMatch = lastBotMessage.text.match(/completar "([^"]+)"/);
            if (questionMatch) {
              const questionDesc = questionMatch[1];
              
              // Buscar la pregunta por descripción
              const question = questions.find(q => q.Description === questionDesc);
              
              if (question) {
                setChatHistory(prev => [...prev, {
                  sender: 'bot',
                  text: `Para completar "${questionDesc}", necesito que me proporciones esta información. Puedes decirme los detalles relevantes y yo actualizaré el formulario.`,
                  questionId: 'question-guidance'
                }]);
                
                setTypingWithMinDuration(false);
                return;
              }
            }
          }
        }
      }
      
      // MEJORA: Detector de consultas de progreso general
      const isProgressQuery = lowerAnswer.match(/(?:c[oó]mo\s+(?:voy|estoy)|progreso|avance|qu[eé]\s+(?:me\s+)?falta|completar)/i);
      
      if (isProgressQuery) {
        // Obtener resumen de progreso del formulario
        const formSummary = getFormCompletionSummary();
        
        // Filtrar secciones aplicables (no marcadas como "no")
        const applicableSections = formSummary.filter(section => 
          safeSectionStatuses[section.id] !== 'no'
        );
        
        // Si no hay secciones aplicables después del filtrado
        if (applicableSections.length === 0) {
          setChatHistory(prev => [...prev, {
            sender: 'bot',
            text: "Todas las secciones están marcadas como no aplicables. No hay campos que completar.",
            questionId: 'no-applicable-sections'
          }]);
          setTypingWithMinDuration(false);
          return;
        }
        
        // Calcular progreso general
        const totalApplicableFields = applicableSections.reduce(
          (sum, section) => sum + section.totalCount, 0
        );
        
        const totalCompletedFields = applicableSections.reduce(
          (sum, section) => sum + (section.totalCount - section.pendingCount), 0
        );
        
        const overallPercentage = totalApplicableFields > 0 
          ? Math.round((totalCompletedFields / totalApplicableFields) * 100) 
          : 0;
        
        // Mensaje con progreso general
        setChatHistory(prev => [...prev, {
          sender: 'bot',
          text: `Tu progreso general es del ${overallPercentage}% (${totalCompletedFields} de ${totalApplicableFields} campos completados).`,
          questionId: 'progress-summary'
        }]);
        
        // Esperar un momento y mostrar recomendación personalizada
        setTimeout(() => {
          // Identificar la sección menos completa para sugerir
          const incompleteSections = applicableSections.filter(s => s.percentComplete < 100)
            .sort((a, b) => a.percentComplete - b.percentComplete);
          
          if (incompleteSections.length > 0) {
            const nextSection = incompleteSections[0];
            
            setChatHistory(prev => [...prev, {
              sender: 'bot',
              text: `Te sugiero enfocarte ahora en la sección "${nextSection.title}" que está al ${nextSection.percentComplete}%. ¿Quieres que te muestre qué preguntas faltan en esta sección?`,
              questionId: 'next-section-suggestion'
            }]);
          } else {
            setChatHistory(prev => [...prev, {
              sender: 'bot',
              text: `¡Felicidades! Has completado todas las secciones aplicables del formulario.`,
              questionId: 'all-complete-message'
            }]);
          }
        }, 1500);
        
        setTypingWithMinDuration(false);
        return;
      }
      
      // Continuar con el resto de la lógica existente para otras solicitudes de ayuda...
      // Comprobar si tenemos datos en caché
      const cachedResult = getCachedExtraction(answer);

      if (cachedResult && cachedResult.data && Object.keys(cachedResult.data).length > 0) {
        // Usar datos en caché
        console.log("Usando datos de caché:", cachedResult);
        
        // Actualizar formulario con datos en caché
        onUpdateFormData(cachedResult.data, cachedResult.autoCompletedFields || []);
        
        // Mostrar mensaje de éxito con campos completados
        setChatHistory(prev => [...prev, {
          sender: 'bot',
          text: showCompletedFieldsSummary(cachedResult.data),
          questionId: 'extraction-success'
        }]);
      } else {
        // No tenemos caché, procesar normalmente
        const pendingQuestions = questions.filter(q => 
          // Solo incluir preguntas que: 1) sean válidas, 2) no estén completadas, 3) no pertenezcan a secciones marcadas como "no"
          q && q.IDQuestion && 
          isFieldEmpty(safeFormData, q.IDQuestion) && 
          !isSectionSkipped(q, safeSectionStatuses)
        );
        
        if (pendingQuestions.length === 0) {
          setChatHistory(prev => [...prev, {
            sender: 'bot',
            text: "¡Genial! Ya has completado todos los campos del formulario.",
            questionId: 'all-complete'
          }]);
          setTypingWithMinDuration(false);
          return;
        }
        
        // Dividir las preguntas pendientes en lotes más pequeños
        const batchSize = 15;
        const questionBatches = [];
        
        for (let i = 0; i < pendingQuestions.length; i += batchSize) {
          questionBatches.push(pendingQuestions.slice(i, i + batchSize));
        }
        
        // Procesar el primer lote inmediatamente para mostrar resultados rápidos
        if (questionBatches.length > 0) {
          try {
            const firstBatchResult = await extractDataInBatches(answer, questionBatches[0]);
            
            if (firstBatchResult && firstBatchResult.data && Object.keys(firstBatchResult.data).length > 0) {
              // Actualizar formulario con datos extraídos
              onUpdateFormData(firstBatchResult.data, firstBatchResult.autoCompletedFields || []);
              
              // Mostrar mensaje de éxito
              setChatHistory(prev => [...prev, {
                sender: 'bot',
                text: showCompletedFieldsSummary(firstBatchResult.data),
                questionId: 'extraction-success'
              }]);
            }
            
            // Procesar el resto de lotes en segundo plano si hay más de uno
            if (questionBatches.length > 1) {
    
              processBatchesInBackground(
                answer, 
                questionBatches.slice(1), 
                firstBatchResult ? firstBatchResult.data : {}
              );
            }
            
          } catch (error) {
            console.error("Error en la extracción inicial:", error);
            setChatHistory(prev => [...prev, {
              sender: 'bot',
              text: "Lo siento, ha ocurrido un error al procesar tu información. Por favor, intenta de nuevo o proporciona los datos directamente en el formulario.",
              questionId: 'extraction-error'
            }]);
          }
        }
      }
    } catch (error) {
      console.error("Error en la operación:", error);
    } finally {
      setTypingWithMinDuration(false);
    }
  }, [setTypingWithMinDuration, chatHistory, getCachedExtraction, getPendingQuestionsBySectionId, questions, getFormCompletionSummary, safeSectionStatuses, onUpdateFormData, showCompletedFieldsSummary, safeFormData, extractDataInBatches, processBatchesInBackground]);

  // Manejar cambio de entrada - mover fuera del hook
  const handleChange = (e) => {
    setInputValue(e.target.value);
  };
  
  // Función para manejar el envío - mover fuera del hook
  const handleSubmit = React.useCallback(() => {
    if (inputValue.trim()) {
      handleSend(inputValue);
      setInputValue('');
    }
  }, [inputValue, handleSend]);
  
  // Calcular placeholder - mover fuera del hook
  const emptyFieldsCount = questions.filter(q => 
    q && q.IDQuestion && isFieldEmpty(safeFormData, q.IDQuestion)
  ).length;
  
  const placeholder = emptyFieldsCount > 0
    ? `Cuéntame sobre tu proyecto ...`
    : 'Cuéntame más sobre tu proyecto...';

  // ESTRUCTURA DE RENDERIZADO CORREGIDA
  try {
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
                        Analizando tu proyecto para extraer información relevante, por favor continua con el formulario mientras yo trabajo en segundo plano. Puedes Cerrar el chat y volver más tarde.
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
              <ChatInput
                value={inputValue}
                onChange={handleChange}
                onSubmit={handleSubmit}
                isTyping={isTyping}
                placeholder={placeholder}
              />
            </div>
          </div>
        </div>
      </div>
    );
  } catch (error) {
    console.error("Error en la operación:", error);
    return (
      <div className="chatbot-wrapper error-state">
        <div className="error-message">
          <p>Ha ocurrido un error al cargar el chat. Por favor, recarga la página.</p>
        </div>
      </div>
    );
  }
};

export default Chatbot;