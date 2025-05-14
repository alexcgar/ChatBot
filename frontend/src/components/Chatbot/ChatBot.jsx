import React, { useState, useEffect, useRef } from 'react';
import { FaRobot, FaPaperPlane, FaTimes, FaMicrophone, FaStop, FaAcquisitionsIncorporated, FaLeaf, FaCanadianMapleLeaf } from 'react-icons/fa';
import './ChatBot.css';
import { LOCAL_API_URL } from '../../services/api';
import { formSections } from '../FormularioManual/sectionConfig';// Header del chat - make sure header is always visible

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

// Reemplazar el componente OptionsDisplay por esta versión mejorada:

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
  const [activeQuestion, setActiveQuestion] = useState(null);
  const [activeSection, setActiveSection] = useState(null);
  const [missingSectionQuestions, setMissingSectionQuestions] = useState([]);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [isAnsweringQuestions, setIsAnsweringQuestions] = useState(false);

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

  // This function is kept for future use when we implement the form completion progress feature
  // eslint-disable-next-line no-unused-vars
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
    }).filter(summary => summary.totalCount > 0);

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
    if (!completedData || Object.keys(completedData).length === 0) {
      return "No he podido extraer información automáticamente. Vamos a completar el formulario paso a paso.";
    }

    // No mention of field counts
    return `¡Genial! He extraído automáticamente información de tu proyecto (marcados con 'Auto'). Continuemos con los campos restantes.`;
  }, []);

  // Modificar la dependencia del useCallback para processBatchesInBackground
  const processBatchesInBackground = React.useCallback(async (description, batches, existingData) => {
    // Garantizar que existingData sea un objeto
    let accumulatedData = { ...(existingData || {}) };
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
          console.log(`Lote ${i + 1}/${batches.length} omitido: todas las preguntas pertenecen a secciones marcadas como "no"`);
          completedBatches++;
          continue;
        }

        // Evitar bloquear la interfaz de usuario
        await new Promise(resolve => setTimeout(resolve, 100));

        try {
          // Usar el lote filtrado en lugar del original
          const result = await extractDataInBatches(description, filteredBatch);

          // Añadir este debug:
          console.log(`Lote ${i + 1}/${batches.length} procesado:`,
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

      // Solo mostrar mensaje de finalización cuando se han completado TODOS los lotes
      const numFieldsCompleted = Object.keys(accumulatedData || {}).length;

      // Esperamos un momento para mostrar el mensaje final (permite que la barra llegue al 100%)
      setTimeout(() => {
        setChatHistory(prev => {
          // Filtrar mensajes de procesamiento previos
          const newHistory = prev.filter(msg =>
            msg.questionId !== 'background-processing-single-message' &&
            msg.questionId !== 'extraction-success'
          );

          // Agregar mensaje final según el resultado
          if (numFieldsCompleted > 0) {
            newHistory.push({
              sender: 'bot',
              text: `¡Genial! He extraído y completado información automáticamente en tu proyecto (marcados con 'Auto'). Continuemos con los campos restantes.`,
              questionId: 'background-extraction-complete'
            });
          } else {
            newHistory.push({
              sender: 'bot',
              text: 'He analizado tu proyecto, pero no he podido extraer información relevante automáticamente.',
              questionId: 'background-extraction-complete'
            });
          }

          return newHistory;
        });

        // Desactivar el estado de extracción
        setIsExtracting(false);
      }, 500);

    } catch (error) {
      console.error("Error en la operación:", error);
    } finally {
      // Limpieza final
      if (progressInterval) {
        clearInterval(progressInterval);
      }
      setExtractionProgress(100);
    }
  }, [autoCompletedFields, extractDataInBatches, onUpdateFormData, questions, safeSectionStatuses, saveCachedExtraction]);

  // Add this function to check for missing required fields
  const getMissingRequiredFields = React.useCallback(() => {
    // Filter for active sections that aren't marked as "No"
    const activeQuestions = questions.filter(q => !isSectionSkipped(q, safeSectionStatuses));

    // Find required fields that aren't completed
    return activeQuestions.filter(q =>
      q.Required && isFieldEmpty(safeFormData, q.IDQuestion)
    );
  }, [questions, safeSectionStatuses, safeFormData]);

  // Nueva función para obtener preguntas faltantes obligatorias de una sección específica
  const getMissingMandatoryQuestionsBySection = React.useCallback((sectionId) => {
    // Verificar si la sección existe y está activa (no marcada como "no")
    if (!sectionId || safeSectionStatuses[sectionId] === 'no') {
      return [];
    }

    // Buscar sección por ID
    const section = formSections.find(s => s.id === sectionId);
    if (!section) {
      return [];
    }

    // Filtrar preguntas que pertenecen a esta sección
    const sectionQuestions = questions.filter(q => {
      if (!q || typeof q.Orden !== 'number') return false;

      return section.orderRanges.some(range =>
        q.Orden >= range.min && q.Orden <= range.max
      );
    });

    // Filtrar las preguntas obligatorias que no están completadas
    return sectionQuestions.filter(q =>
      q.Required &&
      isFieldEmpty(safeFormData, q.IDQuestion)
    );
  }, [questions, safeSectionStatuses, safeFormData]);

  // Función para identificar y manejar consultas sobre secciones específicas
  const handleSectionQuery = React.useCallback((message) => {
    const lowerMessage = message.toLowerCase();

    // Detectar consultas sobre preguntas faltantes en una sección
    // Mejorar la detección de secciones considerando variaciones y palabras clave
    let matchedSection = null;

    // Buscar coincidencia exacta o parcial con cualquier sección
    for (const section of formSections) {
      // Comprobar coincidencia con ID
      if (lowerMessage.includes(section.id.toLowerCase())) {
        matchedSection = section;
        break;
      }

      // Comprobar coincidencia con título
      if (lowerMessage.includes(section.title.toLowerCase())) {
        matchedSection = section;
        break;
      }

      // Comprobar coincidencia con palabras clave específicas de cada categoría
      // Esto permite detectar frases como "pregunta sobre invernadero" o "datos del invernadero"
      const sectionKeywords = {
        'invernaderos': ['invernadero', 'invernader', 'greenhouse'],
        'pantallas': ['pantalla', 'screen', 'sombra', 'sombreo'],
        'riego': ['riego', 'irrigation', 'agua', 'irrigación'],
        'drenajes': ['drenaje', 'drainage', 'drenado'],
        'depositos': ['deposito', 'depósito', 'tank', 'tanque', 'chapa'],
        'embalse': ['embalse', 'revestimiento', 'reservoir', 'balsa'],
        'osmosis': ['osmosi', 'ósmosis', 'osmotic', 'agua tratada'],
        'fitosanitarios': ['fitosanitario', 'phytosanitary', 'treatment', 'tratamiento'],
        'carros': ['carro', 'cart', 'equipo', 'trabajo'],
        'semillero': ['semillero', 'seedbed', 'seedling', 'semilla', 'complemento'],
        'hojas': ['hoja', 'cultivo', 'crop', 'sheet', 'cultivation'],
        'datos-generales': ['general', 'básico', 'basic', 'cliente', 'cliente', 'principal']
      };

      // Verificar si hay palabras clave definidas para esta sección
      const keywords = sectionKeywords[section.id];
      if (keywords && keywords.some(keyword => lowerMessage.includes(keyword))) {
        matchedSection = section;
        break;
      }
    }

    // Manejar consulta general sobre categorías/secciones
    if (!matchedSection &&
      (lowerMessage.includes('categoría') ||
        lowerMessage.includes('categoria') ||
        lowerMessage.includes('secciones') ||
        lowerMessage.includes('sections') ||
        lowerMessage.includes('catálogo') ||
        (lowerMessage.includes('que') && lowerMessage.includes('hay')))) {

      // Listar todas las categorías disponibles
      const categoriesList = formSections
        .map(section => `- ${section.title}: ${section.description}`)
        .join('\n');

      setChatHistory(prev => [...prev, {
        sender: 'bot',
        text: `El formulario está organizado en las siguientes categorías:\n\n${categoriesList}\n\n¿Sobre qué categoría necesitas información?`,
        questionId: 'categories-list'
      }]);

      return true;
    }

    // Si encontramos una sección mencionada en el mensaje
    if (matchedSection) {
      // Caso 1: Preguntar específicamente por preguntas faltantes/pendientes/obligatorias
      const isAskingForMissingQuestions =
        lowerMessage.includes('falta') ||
        lowerMessage.includes('pendiente') ||
        lowerMessage.includes('obligator') ||
        lowerMessage.includes('importante');

      // Caso 2: Solicitar ayuda general con una sección
      const isAskingForSectionHelp =
        (lowerMessage.includes('ayuda') ||
          lowerMessage.includes('ayúda') ||
          lowerMessage.includes('ayudame') ||
          lowerMessage.includes('ayudame por favor') ||
          lowerMessage.includes('ayúdame') ||
          lowerMessage.includes('dime') ||
          lowerMessage.includes('mostrar') ||
          lowerMessage.includes('ver') ||
          lowerMessage.includes('cuáles') ||
          lowerMessage.includes('cuales')) &&
        (lowerMessage.includes('pregunta') ||
          lowerMessage.includes('campo') ||
          lowerMessage.includes('información') ||
          lowerMessage.includes('datos'));

      // Caso 3: Solicitar completar una sección
      const isAskingToCompleteSection =
        (lowerMessage.includes('complet') ||
          lowerMessage.includes('rellenar') ||
          lowerMessage.includes('llenar') ||
          lowerMessage.includes('terminar')) &&
        (lowerMessage.includes('sección') ||
          lowerMessage.includes('seccion') ||
          lowerMessage.includes(matchedSection.id) ||
          lowerMessage.includes(matchedSection.title.toLowerCase()));

      // Caso 4: Solicitar información general sobre la sección
      const isAskingAboutSectionInfo =
        (lowerMessage.includes('qué es') ||
          lowerMessage.includes('que es') ||
          lowerMessage.includes('información sobre') ||
          lowerMessage.includes('informacion sobre') ||
          lowerMessage.includes('explica')) &&
        (lowerMessage.includes(matchedSection.id) ||
          lowerMessage.includes(matchedSection.title.toLowerCase()));

      // Caso 5: Preguntar por el total de preguntas en una sección
      const isAskingAboutQuestionCount =
        (lowerMessage.includes('cuántas') ||
          lowerMessage.includes('cuantas') ||
          lowerMessage.includes('total') ||
          lowerMessage.includes('número') ||
          lowerMessage.includes('numero') ||
          lowerMessage.includes('cantidad') ||
          lowerMessage.includes('que necesito')) &&
        (lowerMessage.includes('pregunta') ||
          lowerMessage.includes('campos') ||
          lowerMessage.includes('responder'));

      if (isAskingAboutQuestionCount) {
        // Obtener estadísticas de la sección
        const { totalQuestions, completedQuestions, pendingQuestions } =
          getPendingQuestionsBySectionId(matchedSection.id);

        const requiredQuestions = questions.filter(q => {
          if (!q || !q.Required || typeof q.Orden !== 'number') return false;

          return matchedSection.orderRanges.some(range =>
            q.Orden >= range.min && q.Orden <= range.max
          );
        }).filter(q => !isSectionSkipped(q, safeSectionStatuses));

        const requiredPending = requiredQuestions.filter(q =>
          isFieldEmpty(safeFormData, q.IDQuestion)
        ).length;

        setChatHistory(prev => [...prev, {
          sender: 'bot',
          text: `En la sección "${matchedSection.title}" hay un total de ${totalQuestions} preguntas, de las cuales ${completedQuestions} están completadas y ${pendingQuestions.length} están pendientes. De estas, ${requiredQuestions.length} son obligatorias y ${requiredPending} obligatorias están pendientes.`,
          questionId: 'section-question-count'
        }]);

        return true;
      }

      // Si es cualquiera de los casos anteriores, o simplemente menciona "ayuda" + [nombre de sección]
      if (isAskingForMissingQuestions ||
        isAskingForSectionHelp ||
        isAskingToCompleteSection ||
        (lowerMessage.includes('ayuda') && lowerMessage.includes(matchedSection.title.toLowerCase()))) {

        // Obtener preguntas obligatorias pendientes para esta sección
        const missingQuestions = getMissingMandatoryQuestionsBySection(matchedSection.id);

        // Modificación: Obtener TODAS las preguntas de la sección, no solo obligatorias
        const allSectionQuestions = questions.filter(q => {
          if (!q || typeof q.Orden !== 'number') return false;

          return matchedSection.orderRanges.some(range =>
            q.Orden >= range.min && q.Orden <= range.max
          );
        }).filter(q => !isSectionSkipped(q, safeSectionStatuses));

        if (missingQuestions.length === 0) {
          // Si no hay preguntas obligatorias pendientes pero hay otras preguntas
          if (allSectionQuestions.length > 0) {
            // Obtener la primera pregunta de la sección
            const firstQuestion = allSectionQuestions[0];

            // Configurar para mostrar esta pregunta
            setMissingSectionQuestions([firstQuestion]);
            setActiveSection(matchedSection);
            setQuestionIndex(0);

            // Mensaje modificado que recomienda responder la primera pregunta
            setChatHistory(prev => [...prev, {
              sender: 'bot',
              text: `No hay preguntas obligatorias pendientes en la sección ${matchedSection.title}, pero puedo ayudarte a completar otras preguntas. ¿Te gustaría responder la pregunta "${firstQuestion.Description}"?`,
              questionId: 'suggest-first-question'
            }]);
            return true;
          } else {
            // Solo si realmente no hay preguntas en absoluto
            setChatHistory(prev => [...prev, {
              sender: 'bot',
              text: `No hay preguntas disponibles en la sección ${matchedSection.title}.`,
              questionId: 'section-complete'
            }]);
            return true;
          }
        }

        // Guardar las preguntas faltantes y la sección activa
        setMissingSectionQuestions(missingQuestions);
        setActiveSection(matchedSection);
        setQuestionIndex(0);

        // Mostrar mensaje con las preguntas faltantes
        const questionList = missingQuestions
          .slice(0, 5) // Limitar para no saturar
          .map((q, idx) => `${idx + 1}. ${q.Description}${q.Required ? ' *' : ''}`)
          .join('\n');

        const moreQuestionsText = missingQuestions.length > 5
          ? `\n...y ${missingQuestions.length - 5} más.`
          : '';

        setChatHistory(prev => [...prev, {
          sender: 'bot',
          text: `En la sección ${matchedSection.title} faltan las siguientes preguntas obligatorias:\n\n${questionList}${moreQuestionsText}\n\n¿Quieres que te ayude a responderlas?`,
          questionId: 'missing-questions'
        }]);

        return true;
      }

      // Si solo está preguntando información sobre la sección
      if (isAskingAboutSectionInfo) {
        // Obtener el total de preguntas para esta sección
        const sectionQuestions = questions.filter(q => {
          if (!q || typeof q.Orden !== 'number') return false;

          return matchedSection.orderRanges.some(range =>
            q.Orden >= range.min && q.Orden <= range.max
          );
        });

        const requiredCount = sectionQuestions.filter(q => q.Required).length;

        setChatHistory(prev => [...prev, {
          sender: 'bot',
          text: `La sección "${matchedSection.title}" se refiere a ${matchedSection.description}. Contiene ${sectionQuestions.length} preguntas en total, de las cuales ${requiredCount} son obligatorias. ¿Quieres que te muestre las preguntas pendientes?`,
          questionId: 'section-info'
        }]);

        return true;
      }
    }

    // NUEVO: Detectar si el mensaje coincide con alguna pregunta de la lista de pendientes
    if (missingSectionQuestions.length > 0) {
      // Buscar coincidencia con el nombre de la pregunta
      const questionMatch = missingSectionQuestions.find(q =>
        lowerMessage.includes(q.Description.toLowerCase())
      );

      if (questionMatch) {
        // Encontrar el índice de esta pregunta en la lista
        const questionIdx = missingSectionQuestions.findIndex(q => q.IDQuestion === questionMatch.IDQuestion);

        if (questionIdx >= 0) {
          // Actualizar el estado para mostrar esta pregunta específica
          setQuestionIndex(questionIdx);
          setActiveQuestion(questionMatch);
          setIsAnsweringQuestions(true);

          // Mostrar la pregunta con sus opciones
          let message = `📝 ${questionMatch.Description}${questionMatch.Required ? ' *' : ''}`;

          setChatHistory(prev => [...prev, {
            sender: 'bot',
            text: message,
            questionId: questionMatch.IDQuestion,
            options: questionMatch.Type === 3 ? questionMatch.Answers : null
          }]);

          return true;
        }
      }
    }

    // Detectar solicitudes generales de ayuda con el formulario
    if (lowerMessage.includes('ayuda') &&
      (lowerMessage.includes('formulario') ||
        lowerMessage.includes('preguntas') ||
        lowerMessage.includes('obligatorias'))) {

      // Listar todas las secciones con preguntas obligatorias pendientes
      const sectionsWithMissingRequired = formSections
        .filter(section => {
          const missingQuestions = getMissingMandatoryQuestionsBySection(section.id);
          return missingQuestions.length > 0;
        })
        .map(section => {
          const missingQuestions = getMissingMandatoryQuestionsBySection(section.id);
          return {
            section,
            missingCount: missingQuestions.length
          };
        });

      if (sectionsWithMissingRequired.length === 0) {
        setChatHistory(prev => [...prev, {
          sender: 'bot',
          text: '¡Genial! No hay preguntas obligatorias pendientes en el formulario. Todas las secciones obligatorias están completas.',
          questionId: 'all-sections-complete'
        }]);
        return true;
      }

      // Mostrar secciones con preguntas pendientes
      const sectionsList = sectionsWithMissingRequired
        .map(item => `- ${item.section.title}: ${item.missingCount} preguntas obligatorias pendientes`)
        .join('\n');

      setChatHistory(prev => [...prev, {
        sender: 'bot',
        text: `Las siguientes secciones tienen preguntas obligatorias pendientes:\n\n${sectionsList}\n\n¿Sobre qué sección quieres que te ayude?`,
        questionId: 'sections-with-missing'
      }]);

      return true;
    }

    return false;
  }, [getMissingMandatoryQuestionsBySection, getPendingQuestionsBySectionId, missingSectionQuestions, questions, safeFormData, safeSectionStatuses]);

  // Función para manejar la respuesta de querer contestar preguntas
  const handleStartAnsweringQuestions = React.useCallback(() => {
    if (missingSectionQuestions.length === 0 || !activeSection) return;

    setIsAnsweringQuestions(true);
    setActiveQuestion(missingSectionQuestions[0]);

    // Mostrar la primera pregunta
    const question = missingSectionQuestions[0];
    let message = `📝 ${question.Description}${question.Required ? ' *' : ''}`;

    setChatHistory(prev => [...prev, {
      sender: 'bot',
      text: message,
      questionId: question.IDQuestion,
      options: question.Type === 3 ? question.Answers : null
    }]);

  }, [missingSectionQuestions, activeSection]);

  // Función para procesar la respuesta a una pregunta activa
  const handleQuestionAnswer = React.useCallback((answer) => {
    if (!activeQuestion || !isAnsweringQuestions) return false;

    const questionId = activeQuestion.IDQuestion;
    let validAnswer = answer;

    // Para preguntas tipo select, buscar la opción que coincide con la respuesta
    if (activeQuestion.Type === 3 && activeQuestion.Answers) {
      const lowerAnswer = answer.toLowerCase();
      const matchedOption = activeQuestion.Answers.find(option =>
        option.Description.toLowerCase().includes(lowerAnswer) ||
        lowerAnswer.includes(option.Description.toLowerCase())
      );

      if (matchedOption) {
        validAnswer = matchedOption.CodAnswer.toString();
      }
    }

    // Actualizar el formulario con esta respuesta
    const updateData = {
      [questionId]: validAnswer
    };

    onUpdateFormData(updateData, []);

    // Añadir mensaje de confirmación
    setChatHistory(prev => [...prev, {
      sender: 'bot',
      text: `✅ Respuesta guardada para "${activeQuestion.Description}"`,
      questionId: `confirmation-${questionId}`
    }]);

    // Mover a la siguiente pregunta
    const nextIndex = questionIndex + 1;
    if (nextIndex < missingSectionQuestions.length) {
      setQuestionIndex(nextIndex);
      setActiveQuestion(missingSectionQuestions[nextIndex]);

      // Mostrar la siguiente pregunta después de una breve pausa
      setTimeout(() => {
        const nextQuestion = missingSectionQuestions[nextIndex];
        let message = `📝 ${nextQuestion.Description}${nextQuestion.Required ? ' *' : ''}`;

        setChatHistory(prev => [...prev, {
          sender: 'bot',
          text: message,
          questionId: nextQuestion.IDQuestion,
          options: nextQuestion.Type === 3 ? nextQuestion.Answers : null
        }]);
      }, 1000);
    } else {
      // Hemos terminado con todas las preguntas
      setIsAnsweringQuestions(false);
      setActiveQuestion(null);
      setMissingSectionQuestions([]);

      setTimeout(() => {
        setChatHistory(prev => [...prev, {
          sender: 'bot',
          text: `¡Excelente! Has completado todas las preguntas obligatorias pendientes de la sección ${activeSection.title}. ¿Hay algo más en lo que pueda ayudarte?`,
          questionId: 'questions-completed'
        }]);
        setActiveSection(null);
      }, 1000);
    }

    return true;
  }, [activeQuestion, isAnsweringQuestions, questionIndex, missingSectionQuestions, activeSection, onUpdateFormData]);

  // Modificar handleSend para incluir las nuevas funcionalidades
  const handleSend = React.useCallback(async (answer) => {
    // Add the user's message to chat history
    setChatHistory(prev => [...prev, { sender: 'user', text: answer }]);
    setTypingWithMinDuration(true);

    try {
      const lowerAnswer = answer.toLowerCase().trim();

      // 1. Verificar si estamos en medio de responder preguntas secuenciales
      if (isAnsweringQuestions && activeQuestion) {
        const wasHandled = handleQuestionAnswer(answer);
        if (wasHandled) {
          setTypingWithMinDuration(false);
          return;
        }
      }

      // 2. Verificar si hay una intención de responder preguntas ofrecidas
      if (missingSectionQuestions.length > 0) {
        // Caso afirmativo - el usuario quiere ayuda con las preguntas
        if (lowerAnswer.includes('sí') ||
          lowerAnswer.includes('si') ||
          lowerAnswer.includes('ok') ||
          lowerAnswer.includes('vale') ||
          lowerAnswer.includes('claro')) {
          handleStartAnsweringQuestions();
          setTypingWithMinDuration(false);
          return;
        }
        // Caso negativo - el usuario no quiere ayuda con las preguntas
        else if (lowerAnswer === 'no' ||
          lowerAnswer.includes('no quiero') ||
          lowerAnswer.includes('negativo') ||
          lowerAnswer.includes('ahora no')) {
          // Limpiar estado de las preguntas de sección
          setMissingSectionQuestions([]);
          setActiveSection(null);

          // Responder indicando que puede continuar normalmente
          setChatHistory(prev => [...prev, {
            sender: 'bot',
            text: 'Entendido. Puedes continuar contándome sobre tu proyecto y extraeré la información relevante, o preguntarme sobre otras secciones del formulario.',
            questionId: 'declined-section-help'
          }]);

          setTypingWithMinDuration(false);
          return;
        }
      }

      // 3. Detectar consultas sobre secciones específicas y coincidencias de nombres de preguntas
      const wasSectionQuery = handleSectionQuery(answer);
      if (wasSectionQuery) {
        setTypingWithMinDuration(false);
        return;
      }

      // Resto del código original para intención de envío, estado de progreso, etc.
      // Check for submission intent keywords
      const isSubmitIntent = lowerAnswer.match(/(?:enviar|submit|finalizar|terminar|listo|completado)/i);

      if (isSubmitIntent) {
        // Check for missing required fields
        const missingRequiredFields = getMissingRequiredFields();

        if (missingRequiredFields.length > 0) {
          // Show warning about missing required fields
          const fieldList = missingRequiredFields
            .slice(0, 3)
            .map(q => `• ${q.Description}`)
            .join('\n');

          const moreFields = missingRequiredFields.length > 3
            ? `\n... y ${missingRequiredFields.length - 3} más`
            : '';

          setChatHistory(prev => [...prev, {
            sender: 'bot',
            text: `Antes de enviar el formulario, debes completar los siguientes campos obligatorios (marcados con *):\n\n${fieldList}${moreFields}`,
            questionId: 'required-fields-reminder'
          }]);

          setTypingWithMinDuration(false);
          return;
        }
      }

      // Rest of your existing handleSend implementation
      const isProgressQuery = lowerAnswer.match(/(?:c[oó]mo\s+(?:voy|estoy)|progreso|avance|qu[eé]\s+(?:me\s+)?falta|completar)/i);

      if (isProgressQuery) {
        // Existing progress query code...

        // Add information about required fields
        const missingRequiredFields = getMissingRequiredFields();
        if (missingRequiredFields.length > 0) {
          setTimeout(() => {
            setChatHistory(prev => [...prev, {
              sender: 'bot',
              text: `Recuerda que hay ${missingRequiredFields.length} campos obligatorios pendientes marcados con * que debes completar antes de enviar el formulario.`,
              questionId: 'required-fields-notice'
            }]);
          }, 1800);
        }
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

              // NO mostrar mensaje de éxito todavía si hay más lotes por procesar
              if (questionBatches.length === 1) {
                // Solo si este es el único lote, mostrar mensaje de éxito inmediatamente
                setChatHistory(prev => [...prev, {
                  sender: 'bot',
                  text: showCompletedFieldsSummary(firstBatchResult.data),
                  questionId: 'extraction-success'
                }]);
              }
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
  }, [setTypingWithMinDuration, getCachedExtraction, questions, safeSectionStatuses, onUpdateFormData, showCompletedFieldsSummary, safeFormData, extractDataInBatches, processBatchesInBackground, getMissingRequiredFields, isAnsweringQuestions, activeQuestion, missingSectionQuestions, handleQuestionAnswer, handleStartAnsweringQuestions, handleSectionQuery]);

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
                      {/* Mostrar el texto del mensaje solo si no hay opciones o si no es un mensaje tipo pregunta/opción */}
                      {(!message.options || !message.text.includes('Opciones:')) && (
                        <div className="message-text">{message.text}</div>
                      )}

                      {/* Si hay opciones, mostrar solo el título de la pregunta sin las opciones */}
                      {message.options && message.text.includes('Opciones:') && (
                        <div className="message-text">
                          {message.text.split('\n\nOpciones:')[0]}
                        </div>
                      )}

                      {message.options && (
                        <OptionsDisplay
                          options={message.options}
                          onSelect={(option) => {
                            // No necesitamos actualizar el inputValue ya que enviaremos directamente
                            // setInputValue(option); - Ya no es necesario

                            // Agregar la selección del usuario al historial
                            setChatHistory(prev => [...prev, {
                              sender: 'user',
                              text: option
                            }]);

                            // Procesar la respuesta directamente
                            handleQuestionAnswer(option);
                          }}
                        />
                      )}
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