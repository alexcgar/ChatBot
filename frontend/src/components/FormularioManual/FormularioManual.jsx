import React, { useState, useEffect, useCallback, useMemo } from 'react';
import './FormularioManual.css';
import { fetchPreguntas, enviarRespuestas } from '../../services/api';
import FormSection from './FormSection';
import { formSections } from './sectionConfig';
// eslint-disable-next-line no-unused-vars
import { motion } from 'framer-motion';

function FormularioManual({ formData = {}, onFormChange, autocompletados = [] }) {
  const [localFormData, setLocalFormData] = useState(formData);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [selectedSectionId, setSelectedSectionId] = useState(null);

  useEffect(() => {
    console.log("FormularioManual recibió nueva formData:", formData);
    // Combinar con el estado local para preservar cambios locales
    setLocalFormData(prevData => ({
      ...prevData,
      ...formData
    }));
  }, [formData]);

  useEffect(() => {
    console.log("localFormData actualizado:", localFormData);
    // Verificar si hay diferencias con formData
    const differences = Object.entries(formData).filter(
      ([key, value]) => localFormData[key] !== value
    );
    if (differences.length > 0) {
      console.log("Diferencias detectadas con formData:", differences);
    }
  }, [localFormData, formData]);

  const isFieldCompleted = useCallback((value) => {
    if (value === undefined || value === null) return false;
    if (value === '') return false;
    if (Array.isArray(value) && value.length === 0) return false;
    return true;
  }, []);

  const shouldShowQuestion = useCallback(() => {
    return true;
  }, []);

  useEffect(() => {
    const cargarPreguntas = async () => {
      try {
        setIsLoading(true);
        const apiResponse = await fetchPreguntas();
        let preguntasArray = [];
        if (Array.isArray(apiResponse)) {
          preguntasArray = apiResponse;
        } else if (apiResponse && Array.isArray(apiResponse.data)) {
          preguntasArray = apiResponse.data;
        }
        const sortedQuestions = preguntasArray
          .filter(item => item && typeof item === 'object' && 'IDQuestion' in item && typeof item.Orden === 'number')
          .sort((a, b) => a.Orden - b.Orden);

        setQuestions(sortedQuestions);

        // Siempre intentar iniciar con "datos-generales"
        const datosGeneralesId = 'datos-generales';
        const datosGeneralesSection = formSections.find(s => s.id === datosGeneralesId);
        
        // Verificar primero si "datos-generales" tiene preguntas
        const hasGeneralQuestions = datosGeneralesSection && 
          sortedQuestions.some(q => 
            datosGeneralesSection.orderRanges.some(range => 
              q.Orden >= range.min && q.Orden <= range.max) && 
            shouldShowQuestion(q)
          );
        
        // Si tiene preguntas, seleccionarla; de lo contrario usar la lógica anterior
        if (hasGeneralQuestions) {
          setSelectedSectionId(datosGeneralesId);
        } else {
          // Lógica original para buscar la primera sección con preguntas
          let firstSectionWithQuestionsId = null;
          for (const section of formSections) {
            const sectionQuestions = sortedQuestions.filter(q =>
              section.orderRanges.some(range => q.Orden >= range.min && q.Orden <= range.max) &&
              shouldShowQuestion(q)
            );
            if (sectionQuestions.length > 0) {
              firstSectionWithQuestionsId = section.id;
              break;
            }
          }
          setSelectedSectionId(firstSectionWithQuestionsId);
        }

        const answersMap = {};
        sortedQuestions.forEach(item => {
          if (item.Answers && Array.isArray(item.Answers)) {
            answersMap[item.IDQuestion] = item.Answers;
          }
        });
        setAnswers(answersMap);
      } catch (err) {
        console.error("Error al cargar preguntas:", err);
        setError(err.message || 'Error cargando las preguntas del formulario.');
      } finally {
        setIsLoading(false);
      }
    };
    cargarPreguntas();
  }, [shouldShowQuestion]);

  const questionsBySections = useMemo(() => {
    const sectionsMap = {};
    formSections.forEach(section => {
      sectionsMap[section.id] = questions.filter(
        q =>
          section.orderRanges.some(range => q.Orden >= range.min && q.Orden <= range.max) &&
          shouldShowQuestion(q)
      );
    });
    return sectionsMap;
  }, [questions, shouldShowQuestion]);

  const handleInputChange = useCallback((e) => {
    const { name, value, type, checked } = e.target;
    const questionId = name.replace('question-', '');

    setLocalFormData(prevData => {
      const newData = { ...prevData };
      if (type === 'checkbox') {
        newData[questionId] = checked;
      } else if (type === 'radio') {
        newData[questionId] = value === 'true';
      } else if (type === 'select-one') {
        // Asegurarse de que el valor del select se procese correctamente
        newData[questionId] = value;
        
        // Debug para ver qué valor se está guardando
        console.log(`Select value for ${questionId}:`, value);
      } else {
        newData[questionId] = value;
      }
      if (onFormChange) {
        onFormChange({ [questionId]: newData[questionId] });
      }
      return newData;
    });
  }, [onFormChange]);

  const renderField = useCallback((question) => {
    const questionId = question.IDQuestion;
    const value = localFormData[questionId] ?? '';
    
    // Añade esto para debug
    if (question.Type === 3) {
      console.log(`Rendering select field ${questionId}:`, {
        selectedValue: value,
        availableOptions: answers[questionId]?.map(a => ({desc: a.Description, value: a.CodAnswer})) || []
      });
    }

    // Añadir más logs de debug para valores de selects y otros campos
    if (question.Type === 3) {
      console.log(`Renderizando select ${questionId}:`, {
        valorActual: value,
        tipoValor: typeof value,
        opcionesDisponibles: answers[questionId]?.map(a => ({
          desc: a.Description, 
          valor: a.CodAnswer,
          tipoValor: typeof a.CodAnswer
        })) || []
      });
      
      // Verificar si hay coincidencia
      if (answers[questionId]) {
        const coincide = answers[questionId].some(
          a => String(a.CodAnswer) === String(value)
        );
        console.log(`¿El valor ${value} coincide con alguna opción? ${coincide}`);
      }
    }

    if (question.Type === 3 && answers[questionId]) {
      // Convertir value a string para comparación consistente
      const stringValue = value.toString();
      
      return (
        <select
          id={`question-${questionId}`}
          name={`question-${questionId}`}
          className="form-control"
          value={stringValue}
          onChange={handleInputChange}
        >
          <option value="">-- Selecciona --</option>
          {answers[questionId].map(ans => (
            <option 
              key={ans.CodAnswer} 
              value={ans.CodAnswer.toString()} // Asegurar que sea string
            >
              {ans.Description}
            </option>
          ))}
        </select>
      );
    } else if (question.Type === 10) {
      return (
        <div className="si-no-options">
          <div className="form-check form-check-inline">
            <input
              className="form-check-input" type="radio"
              name={`question-${questionId}`} id={`question-${questionId}-si`}
              value="true" checked={value === true} onChange={handleInputChange}
            />
            <label className="form-check-label" htmlFor={`question-${questionId}-si`}>Sí</label>
          </div>
          <div className="form-check form-check-inline">
            <input
              className="form-check-input" type="radio"
              name={`question-${questionId}`} id={`question-${questionId}-no`}
              value="false" checked={value === false} onChange={handleInputChange}
            />
            <label className="form-check-label" htmlFor={`question-${questionId}-no`}>No</label>
          </div>
        </div>
      );
    }
    return (
      <input
        type="text"
        id={`question-${questionId}`}
        name={`question-${questionId}`}
        className="form-control"
        value={value}
        onChange={handleInputChange}
        placeholder={question.Comment || ''}
      />
    );
  }, [localFormData, answers, handleInputChange]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const dataToSend = {};
      questions.forEach(q => {
        if (shouldShowQuestion(q) && localFormData[q.IDQuestion] !== undefined) {
          dataToSend[q.IDQuestion] = localFormData[q.IDQuestion];
        }
      });

      console.log("Enviando datos:", dataToSend);
      await enviarRespuestas(dataToSend);
      setIsSuccess(true);
    } catch (err) {
      console.error("Error al enviar formulario:", err);
      setError(err.message || 'Error al enviar las respuestas.');
      setIsSuccess(false);
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setLocalFormData({});
    setIsSuccess(false);
    setError(null);
    let firstSectionWithQuestionsId = null;
    for (const section of formSections) {
        const sectionQuestions = questions.filter(q =>
            section.orderRanges.some(range => q.Orden >= range.min && q.Orden <= range.max) &&
            shouldShowQuestion(q)
        );
        if (sectionQuestions.length > 0) {
            firstSectionWithQuestionsId = section.id;
            break;
        }
    }
    setSelectedSectionId(firstSectionWithQuestionsId);

    if (onFormChange) {
      onFormChange({});
    }
  };

  if (isLoading && questions.length === 0) {
    return (
      <div className="form-loading-container">
        <div className="loading-spinner blue-spinner"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="form-error-container">
        <div className="error-icon">⚠️</div>
        <h3>Error en el formulario</h3>
        <p>{error}</p>
        <button onClick={() => window.location.reload()} className="btn-retry">
          Intentar de nuevo
        </button>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <motion.div
        className="form-success-container"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div className="success-icon">✓</div>
        <h2>¡Formulario enviado con éxito!</h2>
        <p>Gracias por completar el formulario.</p>
        <button onClick={resetForm} className="btn-primary">
          Completar otro formulario
        </button>
      </motion.div>
    );
  }

  return (
    <div className="formulario-manual-container">
      <div className="form-sidebar">
        <div className="sidebar-header">
          <h4>Secciones del Formulario</h4>
        </div>
        <ul>
          {formSections.map(section => {
            const Icon = section.icon;
            const sectionQuestions = questionsBySections[section.id] || [];
            const hasQuestions = sectionQuestions.length > 0;

            if (!hasQuestions) return null;

            return (
              <li
                key={section.id}
                className={selectedSectionId === section.id ? 'active' : ''}
                onClick={() => setSelectedSectionId(section.id)}
                title={section.description}
              >
                {Icon && <Icon className="sidebar-icon" />}
                {section.title}
              </li>
            );
          })}
        </ul>
      </div>

      <div className="form-main-content">
        <form onSubmit={handleSubmit} className="form-with-sections">
          {autocompletados.length > 0 && (
            <div className="autocompletados-resumen">
              <span>✓ {autocompletados.length} campos han sido completados automáticamente</span>
            </div>
          )}

          <div className="form-sections-container">
            {formSections
              .filter(section => section.id === selectedSectionId)
              .map(section => {
                const sectionQuestions = questionsBySections[section.id] || [];
                if (sectionQuestions.length === 0) return null;

                return (
                  <FormSection
                    key={section.id}
                    section={section}
                    questions={sectionQuestions}
                    formData={localFormData}
                    renderField={renderField}
                    isFieldCompleted={isFieldCompleted}
                    autocompletados={autocompletados}
                  />
                );
              })}

            {selectedSectionId && (questionsBySections[selectedSectionId] || []).length === 0 && (
              <div className="no-questions">
                No hay preguntas visibles para la sección seleccionada.
              </div>
            )}
            {!selectedSectionId && !isLoading && (
              <div className="no-questions">
                No hay secciones con preguntas disponibles.
              </div>
            )}
          </div>

          <div className="form-actions">
           
            <button
              type="submit"
              className="btn-submit"
              disabled={isLoading || !selectedSectionId || (questionsBySections[selectedSectionId] || []).length === 0}
            >
              {isLoading ? 'Enviando...' : 'Enviar Formulario'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default FormularioManual;