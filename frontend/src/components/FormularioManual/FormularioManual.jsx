import React, { useState, useEffect, useCallback, useMemo } from 'react';
import './FormularioManual.css';
import { fetchPreguntas, enviarRespuestas } from '../../services/api';
import FormSection from './FormSection';
import { formSections } from './sectionConfig';
// eslint-disable-next-line no-unused-vars
import { motion } from 'framer-motion';

function FormularioManual({ formData = {}, onFormChange }) {
  const [localFormData, setLocalFormData] = useState(formData);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSuccess, setIsSuccess] = useState(false);

  // Mover isFieldCompleted aquí, antes de ser utilizada en cualquier otro lugar
  const isFieldCompleted = (value) => {
    if (value === undefined || value === null) return false;
    if (value === '') return false;
    if (Array.isArray(value) && value.length === 0) return false;
    if (typeof value === 'object' && Object.keys(value).length === 0) return false;
    return true;
  };

  // Sincronizar con los datos externos cuando cambien
  useEffect(() => {
    setLocalFormData(formData);
  }, [formData]);

  useEffect(() => {
    const cargarPreguntas = async () => {
      try {
        setIsLoading(true);

        const apiResponse = await fetchPreguntas();
        console.log('Respuesta completa de la API:', apiResponse);

        let preguntasArray = [];
        if (Array.isArray(apiResponse)) {
          preguntasArray = apiResponse;
        } else if (apiResponse && Array.isArray(apiResponse.data)) {
          preguntasArray = apiResponse.data;
        }

        if (!preguntasArray.length) {
          throw new Error('No se recibieron preguntas');
        }

        const questionsData = preguntasArray.filter(item => 'IDQuestion' in item);
        console.log('Preguntas filtradas:', questionsData);

        const answersMap = {};

        preguntasArray.forEach(item => {
          if (item.Answers && Array.isArray(item.Answers) && item.Answers.length > 0) {
            answersMap[item.IDQuestion] = item.Answers;
          }

          if (item.answers && Array.isArray(item.answers) && item.answers.length > 0) {
            answersMap[item.IDQuestion] = item.answers;
          }
        });

        if (apiResponse && apiResponse.answers && typeof apiResponse.answers === 'object') {
          Object.keys(apiResponse.answers).forEach(questionId => {
            answersMap[questionId] = apiResponse.answers[questionId];
          });
        }

        console.log('Respuestas encontradas:', answersMap);
        console.log('Número de preguntas con respuestas:', Object.keys(answersMap).length);

        setQuestions(questionsData);
        setAnswers(answersMap);
        setIsLoading(false);
      } catch (err) {
        console.error('Error completo:', err);
        setError('Error al cargar las preguntas: ' + err.message);
        setIsLoading(false);
      }
    };

    cargarPreguntas();
  }, []);

  const handleInputChange = (questionId, value) => {
    const updatedData = {
      ...localFormData,
      [questionId]: value
    };

    setLocalFormData(updatedData);

    if (onFormChange) {
      onFormChange({ [questionId]: value });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const requiredQuestions = questions.filter(q => q.Required === true);
    const missingRequired = requiredQuestions.filter(q =>
      !localFormData[q.IDQuestion] || localFormData[q.IDQuestion] === ""
    );

    if (missingRequired.length > 0) {
      setError(`Por favor complete los siguientes campos obligatorios: ${missingRequired.map(q => q.Description).join(", ")}`);
      return;
    }

    try {
      setIsLoading(true);

      await enviarRespuestas(localFormData);

      setIsSuccess(true);
    } catch (err) {
      setError('Error al enviar el formulario: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    const emptyForm = {};
    setLocalFormData(emptyForm);

    if (onFormChange) {
      onFormChange(emptyForm);
    }

    setIsSuccess(false);
  };

  const shouldShowQuestion = useCallback((question) => {
    if (question.IDQuestion === "a3c6c678-3a65-495e-b36f-f345ca8e1af4") return true;
    if (question.IDQuestion === "1b580d4e-d2c2-4845-9ac3-7bdd643a4667") return true;
    if (question.IDQuestion === "c28fe531-847d-4160-9aeb-da32e0c81a09") return true;
    if (question.IDQuestion === "8aa4b5aa-b756-4990-9194-52262f38c2a5") return true;
    if (question.IDQuestion === "12ada762-d944-4faf-a148-b5bb6b62d149") return true;
    if (question.IDQuestion === "731c8a1a-b730-4902-903f-a7de15502244") return true;

    if (question.Orden >= 7 && question.Orden <= 58) {
      const modeloInvernadero = localFormData["a3c6c678-3a65-495e-b36f-f345ca8e1af4"];
      if (!modeloInvernadero) return false;
    }
    if (question.Orden >= 59 && question.Orden <= 67) {
      const tipoPantalla = localFormData["c28fe531-847d-4160-9aeb-da32e0c81a09"];
      if (!tipoPantalla) return false;
    }
    if (question.Orden >= 68 && question.Orden <= 98) {
      const tipoRiego = localFormData["1b580d4e-d2c2-4845-9ac3-7bdd643a4667"];
      if (!tipoRiego) return false;
    }
    if (question.Orden >= 100 && question.Orden <= 114) {
      const primeraPreguntaDrenajes = localFormData["9701d818-fe0d-4c39-9eb3-0d6ed70cb252"];
      if (!primeraPreguntaDrenajes) return false;
    }
    if (question.Orden >= 116 && question.Orden <= 122) {
      const primerDeposito = localFormData["8aa4b5aa-b756-4990-9194-52262f38c2a5"];
      if (!primerDeposito) return false;
    }
    if (question.Orden >= 123 && question.Orden <= 130) {
      const revestimientoEmbalse = localFormData["12ada762-d944-4faf-a148-b5bb6b62d149"];
      if (!revestimientoEmbalse) return false;
    }
    if (question.Orden >= 116 && question.Orden <= 131) {
      const primeraPreguntaAgua = localFormData["10ef21b9-162d-4e3e-b63a-c5756e48d0ea"];
      if (!primeraPreguntaAgua) return false;
    }
    if (question.Orden >= 131 && question.Orden <= 137) {
      const primerOsmosis = localFormData["731c8a1a-b730-4902-903f-a7de15502244"];
      if (!primerOsmosis) return false;
    }
    if (question.Orden >= 188 && question.Orden <= 190) {
      const primeraFitosanitarios = localFormData["ba3d6a21-2f5d-4d19-8400-eb0f1f95d6d5"];
      if (!primeraFitosanitarios) return false;
    }
    if (question.Orden >= 192 && question.Orden <= 205) {
      const primeraPreguntaNuevoBloque = localFormData["32095b26-8a0f-48e5-bf65-e85056548310"];
      if (!primeraPreguntaNuevoBloque) return false;
    }
    if (question.Orden >= 207 && question.Orden <= 214) {
      const primeraPreguntaSemillero = localFormData["0b39128b-0d61-428a-bb50-e6828b93cdda"];
      if (!primeraPreguntaSemillero) return false;
    }

    return true;
  }, [localFormData]);

  const questionsBySections = useMemo(() => {
    const sortedQuestions = [...questions].sort((a, b) => a.Orden - b.Orden);
    const sectionsWithQuestions = {};

    formSections.forEach(section => {
      sectionsWithQuestions[section.id] = sortedQuestions.filter(
        q => q.Orden >= section.minOrder && 
             q.Orden <= section.maxOrder && 
             shouldShowQuestion(q)
      );
    });

    return sectionsWithQuestions;
  }, [questions, shouldShowQuestion]);

  const formStats = useMemo(() => {
    const totalQuestions = questions.filter(q => shouldShowQuestion(q)).length;
    const answeredQuestions = questions.filter(
      q => shouldShowQuestion(q) && isFieldCompleted(localFormData[q.IDQuestion])
    ).length;

    return {
      total: totalQuestions,
      answered: answeredQuestions,
      percent: totalQuestions > 0 ? Math.round((answeredQuestions / totalQuestions) * 100) : 0
    };
  }, [questions, shouldShowQuestion, localFormData]);

  const renderField = (question) => {
    const { IDQuestion, Type, Description } = question;

    switch (Type) {
      case 0:
        return (
          <input
            type="text"
            id={`question-${IDQuestion}`}
            className="form-control"
            value={localFormData[IDQuestion] || ''}
            onChange={(e) => handleInputChange(IDQuestion, e.target.value)}
            required={question.Required === true}
            disabled={question.Disabled === true}
          />
        );

      case 1:
        return (
          <div className="si-no-options">
            <div className="form-check form-check-inline">
              <input
                type="radio"
                id={`question-${IDQuestion}-si`}
                name={`question-${IDQuestion}`}
                className="form-check-input"
                value="1"
                checked={localFormData[IDQuestion] === "1"}
                onChange={(e) => handleInputChange(IDQuestion, e.target.value)}
                required={question.Required === true}
                disabled={question.Disabled === true}
              />
              <label className="form-check-label" htmlFor={`question-${IDQuestion}-si`}>
                Sí
              </label>
            </div>
            <div className="form-check form-check-inline">
              <input
                type="radio"
                id={`question-${IDQuestion}-no`}
                name={`question-${IDQuestion}`}
                className="form-check-input"
                value="0"
                checked={localFormData[IDQuestion] === "0"}
                onChange={(e) => handleInputChange(IDQuestion, e.target.value)}
                required={question.Required === true}
                disabled={question.Disabled === true}
              />
              <label className="form-check-label" htmlFor={`question-${IDQuestion}-no`}>
                No
              </label>
            </div>
          </div>
        );

      case 3: {
        const questionAnswers = answers[IDQuestion] || [];
        const rawValueFromState = localFormData[IDQuestion];
        let valueForSelect = '';

        if (rawValueFromState !== undefined && rawValueFromState !== null) {
          const rawValueStr = String(rawValueFromState).trim();

          const optionMatchingDescription = questionAnswers.find(
            ans => ans.Description && String(ans.Description).trim().toLowerCase() === rawValueStr.toLowerCase()
          );

          if (optionMatchingDescription) {
            valueForSelect = String(optionMatchingDescription.CodAnswer);
          } else {
            const optionMatchingCodAnswer = questionAnswers.find(
              ans => String(ans.CodAnswer) === rawValueStr
            );
            if (optionMatchingCodAnswer) {
              valueForSelect = rawValueStr;
            }
          }
        }

        const selectedAnswer = questionAnswers.find(
          ans => String(ans.CodAnswer) === valueForSelect
        );

        return (
          <div>
            <select
              id={`question-${IDQuestion}`}
              className="form-control"
              value={valueForSelect}
              onChange={(e) => handleInputChange(IDQuestion, e.target.value)}
              required={question.Required === true}
              disabled={question.Disabled === true}
            >
              <option value="">
                {questionAnswers.length === 0
                  ? "No hay opciones disponibles"
                  : "Seleccione una opción"}
              </option>
              {questionAnswers.map((answer) => (
                <option
                  key={answer.IDAnswer}
                  value={String(answer.CodAnswer)}
                >
                  {answer.Description}
                </option>
              ))}
            </select>
            {selectedAnswer && selectedAnswer.Images && selectedAnswer.Images.length > 0 && (
              <div style={{ marginTop: 10 }}>
                <img
                  src={`data:image/png;base64,${selectedAnswer.Images[0]}`}
                  alt={selectedAnswer.Description}
                  style={{ width: 500, height: 200, objectFit: 'contain', border: '1px solid #eee', borderRadius: 8 }}
                />
              </div>
            )}
          </div>
        );
      }

      default:
        return <p className="text-muted">Tipo de campo no soportado: {Type}</p>;
    }
  };

  if (isLoading) {
    return (
      <div className="form-loading-container">
        <div className="loading-spinner"></div>
        <h3>Cargando formulario...</h3>
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
        <p>Gracias por completar el formulario. Su solicitud ha sido registrada.</p>
        <button onClick={resetForm} className="btn-primary">
          Completar otro formulario
        </button>
      </motion.div>
    );
  }

  return (
    <div className="formulario-manual-container">

      <form onSubmit={handleSubmit} className="form-with-sections">
        <div className="form-sections-container">
          {formSections.map(section => (
            <FormSection
              key={section.id}
              section={section}
              questions={questionsBySections[section.id] || []}
              formData={localFormData}
              handleInputChange={handleInputChange}
              answers={answers}
              renderField={renderField}
              isFieldCompleted={isFieldCompleted}
            />
          ))}
          
          <div className="form-actions">
            <button
              type="submit"
              className="btn-submit"
              disabled={isLoading || formStats.total === 0}
            >
              Enviar formulario
            </button>
            <button
              type="button"
              className="btn-reset"
              onClick={resetForm}
              disabled={isLoading}
            >
              Limpiar formulario
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

export default FormularioManual;