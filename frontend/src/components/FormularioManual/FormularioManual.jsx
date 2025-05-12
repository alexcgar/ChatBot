import React, { useState, useEffect, useCallback, useMemo } from 'react';
import './FormularioManual.css';
import { fetchPreguntas, enviarRespuestas } from '../../services/api';
import FormSection from './FormSection';
import { formSections } from './sectionConfig';
// eslint-disable-next-line no-unused-vars
import { motion } from 'framer-motion';
import { FaArrowUp } from 'react-icons/fa';

function FormularioManual({ formData = {}, onFormChange, autocompletados = [] }) {
  const [localFormData, setLocalFormData] = useState(formData);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [selectedSectionId, setSelectedSectionId] = useState(null);
  const [showBackToTop, setShowBackToTop] = useState(false);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth' // Esto añade el efecto de scroll suave
    });
  };

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 300) {
        setShowBackToTop(true);
      } else {
        setShowBackToTop(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  useEffect(() => {
    console.log("FormularioManual recibió nueva formData:", formData);
    setLocalFormData(prevData => ({
      ...prevData,
      ...formData
    }));
  }, [formData]);

  useEffect(() => {
    console.log("localFormData actualizado:", localFormData);
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
    
    // Verificar valores por defecto que no deberían considerarse como completados
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
      
      if (defaultValues.includes(lowerValue)) return false;
    }
    
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

        const datosGeneralesId = 'datos-generales';
        const datosGeneralesSection = formSections.find(s => s.id === datosGeneralesId);
        
        const hasGeneralQuestions = datosGeneralesSection && 
          sortedQuestions.some(q => 
            datosGeneralesSection.orderRanges.some(range => 
              q.Orden >= range.min && q.Orden <= range.max) && 
            shouldShowQuestion(q)
          );
        
        if (hasGeneralQuestions) {
          setSelectedSectionId(datosGeneralesId);
        } else {
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
        newData[questionId] = value;
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
    const rawValue = localFormData[questionId] ?? '';
    
    // Limpiar valores no deseados
    let value = rawValue;
    if (typeof rawValue === 'string') {
      const lowerValue = rawValue.toLowerCase().trim();
      const defaultValues = [
        'no se especifica', 'no mencionado', 'no especificado',
        'no disponible', 'no indicado', 'desconocido',
        'sin especificar', 'n/a', 'na', 'no aplica'
      ];
      
      if (defaultValues.includes(lowerValue) || 
          lowerValue.includes('no mencionado') || 
          lowerValue.includes('no especificado')) {
        value = ''; // Reemplazar con string vacío
      }
    }
    
    // Determinar si el campo tiene un valor real
    const hasRealValue = isFieldCompleted(value);
    
    // Código para los campos tipo select
    if (question.Type === 3 && answers[questionId]) {
      const stringValue = value.toString();
      
      return (
        <select
          id={`question-${questionId}`}
          name={`question-${questionId}`}
          className={`form-control ${hasRealValue ? 'completed-field' : ''}`}
          value={stringValue}
          onChange={handleInputChange}
        >
          <option value="">-- Selecciona --</option>
          {answers[questionId].map(ans => (
            <option 
              key={ans.CodAnswer} 
              value={ans.CodAnswer.toString()}
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
        className={`form-control ${hasRealValue ? 'completed-field' : ''}`}
        value={value}
        onChange={handleInputChange}
        placeholder={question.Comment || ''}
      />
    );
  }, [localFormData, answers, handleInputChange, isFieldCompleted]);

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
        <div className="sidebar-header text-center">
          <h4>Secciones del Formulario</h4>
        </div>
        <ul>
          {formSections.map((section, index) => {
            const Icon = section.icon;
            const sectionQuestions = questionsBySections[section.id] || [];
            const hasQuestions = sectionQuestions.length > 0;
            
            // No mostrar secciones sin preguntas
            if (!hasQuestions) return null;
            
            // Agregar separadores entre grupos funcionales de secciones
            const shouldShowDivider = index > 0 && index % 3 === 0;
            
            return (
              <React.Fragment key={section.id}>
                {shouldShowDivider && <div className="sidebar-divider"></div>}
                <li
                  className={`sidebar-item ${selectedSectionId === section.id ? 'active' : ''}`}
                  onClick={() => setSelectedSectionId(section.id)}
                  title={section.description}
                >
                  <div className="sidebar-item-content">
                    {Icon && 
                      <div className="sidebar-icon-wrapper" style={{color: section.color}}>
                        <Icon className="sidebar-icon" />
                      </div>
                    }
                    <span className="sidebar-item-text">{section.title}</span>
                  </div>
                  {sectionQuestions.length > 0 && (
                    <span className="questions-count">{sectionQuestions.length}</span>
                  )}
                </li>
              </React.Fragment>
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

      {showBackToTop && (
        <button 
          type="button"
          className="floating-back-button"
          onClick={() => {
            const firstSection = formSections.find(s => 
              questionsBySections[s.id] && questionsBySections[s.id].length > 0
            );
            if (firstSection) {
              setSelectedSectionId(firstSection.id);
              scrollToTop();
            }
          }}
        >
          <FaArrowUp /> <span>Inicio</span>
        </button>
      )}
    </div>
  );
}

export default FormularioManual;