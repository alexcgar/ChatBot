import React, { useState, useEffect, useCallback, useMemo } from 'react';
import './FormularioManual.css';
import { fetchPreguntas, enviarRespuestas } from '../../services/api';
import FormSection from '../FormSection/FormSection';
import { formSections } from './sectionConfig';
import { FaArrowUp, FaRegFilePdf } from 'react-icons/fa';
import { jsPDF } from 'jspdf';
import Navbar from '../Navbar/Navbar';
import Sidebar from '../Sidebar/Sidebar';

// Función de utilidad para formatear fechas sin dependencias externas
const formatDate = (date, formatType) => {
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');

  switch (formatType) {
    case 'full':
      return `${day}/${month}/${year} ${hours}:${minutes}`;
    case 'filename':
      return `${year}${month}${day}`;
    default:
      return `${day}/${month}/${year}`;
  }
};

function FormularioManual({ formData = {}, onFormChange, autocompletados = [], onSectionStatusChange }) {
  const [localFormData, setLocalFormData] = useState(formData);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [selectedSectionId, setSelectedSectionId] = useState(null);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [sectionStatuses, setSectionStatuses] = useState(() => {
    const initialStatuses = {};
    formSections.forEach(section => {
      initialStatuses[section.id] = section.id === 'datos-generales' ? 'yes' : 'no';
    });
    return initialStatuses;
  });
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };
  
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
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

  const handleSectionStatusChange = useCallback((sectionId, status) => {
    if (sectionId === 'datos-generales' && status === 'no') {
      return;
    }

    const normalizedStatus = status?.toLowerCase();
    console.log(`Section ${sectionId} status changed to: ${normalizedStatus}`);

    const newStatuses = {
      ...sectionStatuses,
      [sectionId]: normalizedStatus
    };
    setSectionStatuses(newStatuses);

    if (normalizedStatus === 'no') {
      console.log(`Clearing fields for section ${sectionId} marked as 'no'`);

      const sectionQuestions = questions.filter(q => {
        const section = formSections.find(s => s.id === sectionId);
        if (!section) return false;

        return section.orderRanges.some(range =>
          q.Orden >= range.min && q.Orden <= range.max
        );
      });

      const cleanedData = { ...localFormData };
      let fieldsRemoved = false;

      sectionQuestions.forEach(q => {
        if (q.IDQuestion && cleanedData[q.IDQuestion] !== undefined) {
          delete cleanedData[q.IDQuestion];
          fieldsRemoved = true;
        }
      });

      if (fieldsRemoved) {
        setLocalFormData(cleanedData);

        if (onFormChange) {
          const changes = {};
          sectionQuestions.forEach(q => {
            if (q.IDQuestion) changes[q.IDQuestion] = undefined;
          });
          onFormChange(changes);
        }
      }
    }

    if (onSectionStatusChange) {
      onSectionStatusChange(newStatuses);
    }
  }, [sectionStatuses, onSectionStatusChange, questions, localFormData, onFormChange]);

  const renderField = useCallback((question) => {
    const questionId = question.IDQuestion;
    const rawValue = localFormData[questionId] ?? '';

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
        value = '';
      }
    }

    const hasRealValue = isFieldCompleted(value);

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

  const generatePDF = useCallback(() => {
    // Crear instancia de jsPDF
    const doc = new jsPDF();

    // Configuración de estilo
    const titleFontSize = 18;
    const sectionFontSize = 14;
    const normalFontSize = 10;

    // Añadir título y fecha
    doc.setFontSize(titleFontSize);
    doc.setTextColor(44, 82, 130); // RGB equivalente a primaryColor
    doc.text('Resumen de Proyecto Agrícola', 14, 20);

    const currentDate = formatDate(new Date(), 'full');
    doc.setFontSize(normalFontSize);
    doc.setTextColor(100);
    doc.text(`Fecha de generación: ${currentDate}`, 14, 30);
    doc.text(`Cliente: ${localFormData['1'] || 'No especificado'}`, 14, 35);

    // Línea separadora
    doc.setDrawColor(220);
    doc.line(14, 40, 196, 40);

    let yPosition = 50;

    // Crear tabla de contenidos
    doc.setFontSize(sectionFontSize);
    doc.setTextColor(44, 82, 130);
    doc.text('Tabla de Contenidos', 14, yPosition);
    yPosition += 10;

    // Filtrar secciones aplicables
    const applicableSections = formSections.filter(section =>
      sectionStatuses[section.id] === 'yes' || sectionStatuses[section.id] !== 'no'
    );

    // Listar secciones en la tabla de contenidos
    applicableSections.forEach((section, index) => {
      doc.setFontSize(normalFontSize);
      doc.setTextColor(70);
      doc.text(`${index + 1}. ${section.title}`, 20, yPosition);
      yPosition += 7;

      if (yPosition > 270) {
        doc.addPage();
        yPosition = 20;
      }
    });

    yPosition += 10;

    // Para cada sección
    applicableSections.forEach((section, sectionIndex) => {
      if (yPosition > 250) {
        doc.addPage();
        yPosition = 20;
      }

      // Título de sección
      doc.setFontSize(sectionFontSize);
      doc.setTextColor(44, 82, 130);
      doc.text(`${sectionIndex + 1}. ${section.title}`, 14, yPosition);
      yPosition += 10;

      // Preguntas de esta sección
      const sectionQuestions = questions.filter(q => {
        return section.orderRanges.some(range =>
          q.Orden >= range.min && q.Orden <= range.max
        );
      });

      if (sectionQuestions.length === 0) {
        doc.setFontSize(normalFontSize);
        doc.setTextColor(100);
        doc.text('No hay preguntas en esta sección.', 20, yPosition);
        yPosition += 15;
        return;
      }

      // Dibujar encabezados de tabla manualmente
      doc.setFillColor(44, 82, 130);
      doc.rect(14, yPosition, 90, 8, 'F');
      doc.rect(104, yPosition, 90, 8, 'F');
      doc.setTextColor(255);
      doc.setFontSize(normalFontSize);
      doc.text('Pregunta', 16, yPosition + 5);
      doc.text('Respuesta', 106, yPosition + 5);
      yPosition += 8;

      // Variables para alternar colores de fila
      let isAlternateRow = false;

      // Listar preguntas y respuestas
      sectionQuestions.forEach(question => {
        const questionId = question.IDQuestion;
        let value = localFormData[questionId];

        // Omitir preguntas sin respuesta
        if (value === undefined || value === null || value === '') {
          return;
        }

        // Formatear respuestas
        if (question.Type === 3 && answers[questionId]) {
          const selectedOption = answers[questionId].find(
            ans => ans.CodAnswer.toString() === value.toString()
          );
          if (selectedOption) {
            value = selectedOption.Description;
          }
        } else if (question.Type === 10) {
          value = value === true ? 'Sí' : 'No';
        }

        // Indicador de autocompletado
        const isAutoCompleted = autocompletados.includes(questionId);
        const autoLabel = isAutoCompleted ? ' [Auto]' : '';

        // Dibujar celda con color alternado
        if (isAlternateRow) {
          doc.setFillColor(245, 247, 250);
          doc.rect(14, yPosition, 90, 8, 'F');
          doc.rect(104, yPosition, 90, 8, 'F');
        }

        // Texto de pregunta y respuesta
        doc.setTextColor(50);
        doc.text(`${question.Description}${question.Required ? ' *' : ''}${autoLabel}`, 16, yPosition + 5, {
          maxWidth: 85
        });
        doc.text(value.toString(), 106, yPosition + 5, {
          maxWidth: 85
        });

        yPosition += 8;
        isAlternateRow = !isAlternateRow;

        // Nueva página si es necesario
        if (yPosition > 270) {
          doc.addPage();
          yPosition = 20;

          // Repetir encabezados de tabla
          doc.setFillColor(44, 82, 130);
          doc.rect(14, yPosition, 90, 8, 'F');
          doc.rect(104, yPosition, 90, 8, 'F');
          doc.setTextColor(255);
          doc.text('Pregunta', 16, yPosition + 5);
          doc.text('Respuesta', 106, yPosition + 5);
          yPosition += 8;
          isAlternateRow = false;
        }
      });

      yPosition += 15;
    });

    // Añadir pie de página
    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(
        'Novagric - Resumen de Proyecto',
        14,
        doc.internal.pageSize.height - 10
      );
      doc.text(
        `Página ${i} de ${totalPages}`,
        doc.internal.pageSize.width - 25,
        doc.internal.pageSize.height - 10
      );
    }

    // Guardar PDF
    const pdfName = `Proyecto_${localFormData['1'] || 'Cliente'}_${formatDate(new Date(), 'filename')}.pdf`;
    doc.save(pdfName);

    return pdfName;
  }, [localFormData, questions, sectionStatuses, answers, autocompletados]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const missingRequiredFields = questions
      .filter(q => q.Required && shouldShowQuestion(q) &&
        !isFieldCompleted(localFormData[q.IDQuestion]))
      .map(q => q.Description);

    if (missingRequiredFields.length > 0) {
      setError(`Por favor complete los siguientes campos obligatorios: ${missingRequiredFields.join(', ')}`);
      return;
    }

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

      try {
        const pdfName = generatePDF();
        console.log(`PDF generado exitosamente: ${pdfName}`);
      } catch (pdfError) {
        console.error("Error generando el PDF:", pdfError);
      }

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
      <div className="app-loading">
        <div className="loading-spinner"></div>
        <p>Cargando formulario...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="app-error">
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
      <div className="app-success">
        <div className="success-icon">✓</div>
        <h2>¡Formulario enviado con éxito!</h2>
        <p>Gracias por completar el formulario.</p>
        <button onClick={resetForm} className="btn-primary">
          Completar otro formulario
        </button>
      </div>
    );
  }

  const mainContentStyle = {
    marginLeft: sidebarOpen ? '300px' : '60px',
    transition: 'margin-left 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    padding: '2rem',
  };

  return (
    <div className="app-container">
      <Navbar toggleSidebar={toggleSidebar} className="navbar-form" />
      
      <Sidebar 
        isOpen={sidebarOpen}
        toggleSidebar={toggleSidebar}
        selectedSectionId={selectedSectionId}
        setSelectedSectionId={setSelectedSectionId}
        sectionStatuses={sectionStatuses}
        handleSectionStatusChange={handleSectionStatusChange}
      />
      
      <main style={mainContentStyle} className="main-content">
        <div className="form-container">
          <form onSubmit={handleSubmit} className="form-with-sections">
            {selectedSectionId && questionsBySections[selectedSectionId] && questionsBySections[selectedSectionId].length > 0 ? (
              <>
                <div className="section-header">
                  <h2 className="section-title">
                    {formSections.find(s => s.id === selectedSectionId)?.title || 'Sección'}
                  </h2>
                  <p className="section-description">
                    {formSections.find(s => s.id === selectedSectionId)?.description || ''}
                  </p>
                </div>
                
                <FormSection
                  questions={questionsBySections[selectedSectionId]}
                  formData={localFormData}
                  renderField={renderField}
                  isFieldCompleted={isFieldCompleted}
                  autocompletados={autocompletados}
                />
              </>
            ) : (
              <div className="no-questions">
                {selectedSectionId ? 
                  'No hay preguntas disponibles para esta sección.' : 
                  'Por favor seleccione una sección del formulario.'}
              </div>
            )}

            <div className="form-actions">
              <button
                type="submit"
                className="btn-submit"
                disabled={isLoading}
              >
                {isLoading ? 'Enviando...' : 'Enviar Formulario'}
              </button>

              <button
                type="button"
                className="btn-outline"
                onClick={generatePDF}
                disabled={isLoading}
              >
                <FaRegFilePdf /> Generar PDF
              </button>
            </div>
          </form>
        </div>
      </main>

      {showBackToTop && (
        <button
          type="button"
          className="back-to-top"
          onClick={scrollToTop}
        >
          <FaArrowUp />
        </button>
      )}
    </div>
  );
}

export default FormularioManual;