import React, { useState, useEffect, useCallback, useMemo } from 'react';
import './FormularioManual.css';
import { fetchPreguntas, enviarRespuestas } from '../../services/api';

// // --- BLOQUE DE REGLAS DE DEPENDENCIA (puedes añadir más conjuntos aquí) ---
// const dependencyRules = {
//   // Invernaderos
//   "a3c6c678-3a65-495e-b36f-f345ca8e1af4": {
//     "*": { showQuestions: { fromOrder: 7, toOrder: 57 } }
//   },
//   // Tipos de riego
//   "1b580d4e-d2c2-4845-9ac3-7bdd643a4667": {
//     "*": { showQuestions: { fromOrder: 67, toOrder: 97 } }
//   }
// };

function FormularioManual({ formData = {}, onFormChange }) {
  const [localFormData, setLocalFormData] = useState(formData);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSuccess, setIsSuccess] = useState(false);

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

        // Extraer el array de preguntas
        let preguntasArray = [];
        if (Array.isArray(apiResponse)) {
          preguntasArray = apiResponse;
        } else if (apiResponse && Array.isArray(apiResponse.data)) {
          preguntasArray = apiResponse.data;
        }

        if (!preguntasArray.length) {
          throw new Error('No se recibieron preguntas');
        }

        // Procesar las preguntas - extraer las que tienen IDQuestion
        const questionsData = preguntasArray.filter(item => 'IDQuestion' in item);
        console.log('Preguntas filtradas:', questionsData);

        // Extraer las respuestas y organizarlas por IDQuestion
        const answersMap = {};

        // Primero buscar respuestas en la propiedad "Answers" de cada pregunta
        preguntasArray.forEach(item => {
          if (item.Answers && Array.isArray(item.Answers) && item.Answers.length > 0) {
            answersMap[item.IDQuestion] = item.Answers;
          }

          // También buscar en el campo "answers" (minúsculas)
          if (item.answers && Array.isArray(item.answers) && item.answers.length > 0) {
            answersMap[item.IDQuestion] = item.answers;
          }
        });

        // Buscar respuestas en un campo posible de respuestas en el objeto principal
        if (apiResponse && apiResponse.answers && typeof apiResponse.answers === 'object') {
          // Si las respuestas están en un objeto con IDs de preguntas como claves
          Object.keys(apiResponse.answers).forEach(questionId => {
            answersMap[questionId] = apiResponse.answers[questionId];
          });
        }

        // Imprimir las respuestas encontradas para depuración
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

    // Propagar el cambio al componente padre
    if (onFormChange) {
      onFormChange({ [questionId]: value });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Verificar que todos los campos requeridos estén completos
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

      // Enviar datos al servidor
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

  // --- BLOQUE QUE GESTIONA CUÁNDO APARECEN LAS PREGUNTAS DE CADA CONJUNTO ---
  const shouldShowQuestion = useCallback((question) => {
    // --- Mostrar siempre la primera pregunta de cada conjunto ---
    if (question.IDQuestion === "a3c6c678-3a65-495e-b36f-f345ca8e1af4") return true; // Invernaderos
    if (question.IDQuestion === "1b580d4e-d2c2-4845-9ac3-7bdd643a4667") return true; // Riego
    if (question.IDQuestion === "c28fe531-847d-4160-9aeb-da32e0c81a09") return true; // Pantallas
    if (question.IDQuestion === "8aa4b5aa-b756-4990-9194-52262f38c2a5") return true; // Depósitos de chapa
    if (question.IDQuestion === "12ada762-d944-4faf-a148-b5bb6b62d149") return true; // Revestimiento embalse
    if (question.IDQuestion === "731c8a1a-b730-4902-903f-a7de15502244") return true; // Osmosis

    // --- INVERNADEROS: solo si la primera está respondida ---
    if (question.Orden >= 7 && question.Orden <= 58) {
      const modeloInvernadero = localFormData["a3c6c678-3a65-495e-b36f-f345ca8e1af4"];
      if (!modeloInvernadero) return false;
    }
    // --- PANTALLAS: solo si la primera está respondida ---
    if (question.Orden >= 59 && question.Orden <= 67) {
      const tipoPantalla = localFormData["c28fe531-847d-4160-9aeb-da32e0c81a09"];
      if (!tipoPantalla) return false;
    }
    // --- RIEGO: solo si la primera está respondida ---
    if (question.Orden >= 68 && question.Orden <= 98) {
      const tipoRiego = localFormData["1b580d4e-d2c2-4845-9ac3-7bdd643a4667"];
      if (!tipoRiego) return false;
    }
    // --- DEPÓSITOS DE CHAPA: solo si la primera está respondida ---
    // Del 115 al 121, solo si la 115 tiene respuesta
    if (question.Orden >= 116 && question.Orden <= 122) {
      const primerDeposito = localFormData["8aa4b5aa-b756-4990-9194-52262f38c2a5"];
      if (!primerDeposito) return false;
    }
    // --- REVESTIMIENTO EMBALSE: solo si la primera está respondida ---
    // Del 123 al 130, solo si la 123 tiene respuesta
    if (question.Orden >= 123 && question.Orden <= 130) {
      const revestimientoEmbalse = localFormData["12ada762-d944-4faf-a148-b5bb6b62d149"];
      if (!revestimientoEmbalse) return false;
    }

    // --- DISEÑO PLANTA OSMOSIS: solo si la primera está respondida ---
    // Del 131 al 137, solo si la 131 tiene respuesta
    if (question.Orden >= 131 && question.Orden <= 137) {
      const primerOsmosis = localFormData["731c8a1a-b730-4902-903f-a7de15502244"];
      if (!primerOsmosis) return false;
    }

    // ...resto de tu lógica de dependencias...
    return true;
  }, [localFormData]);

  // Ordenar preguntas por el campo Orden y filtrar según reglas
  const sortedAndFilteredQuestions = useMemo(() => {
    return [...questions]
      .sort((a, b) => a.Orden - b.Orden)
      .filter(question => shouldShowQuestion(question));
  }, [questions, shouldShowQuestion]);

  // Renderizar un campo según su tipo
  const renderField = (question) => {
    const { IDQuestion, Type, Description } = question;

    switch (Type) {
      case 0: // String
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

      case 1: // Boolean (Sí / No)
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

      case 3: { // SingleSelection
        const questionAnswers = answers[IDQuestion] || [];
        const selectedAnswer = questionAnswers.find(
          ans => String(ans.CodAnswer) === String(localFormData[IDQuestion])
        );
        return (
          <div>
            <select
              id={`question-${IDQuestion}`}
              className="form-control"
              value={localFormData[IDQuestion] || ''}
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
                  value={answer.CodAnswer}
                >
                  {answer.Description}
                </option>
              ))}
            </select>
            {/* Mostrar imagen si la opción seleccionada tiene imagen */}
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

      // Puedes añadir más tipos según tus necesidades (por ejemplo, MultipleSelection, Entity, etc.)
      default:
        return <p className="text-muted">Tipo de campo no soportado: {Type}</p>;
    }
  };

  // Renderizar el componente según el estado
  if (isLoading) {
    return <div className="loading">Cargando preguntas...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  if (isSuccess) {
    return (
      <div className="success-message">
        <h2>¡Formulario enviado con éxito!</h2>
        <p>Gracias por completar el formulario.</p>
        <button onClick={resetForm} className="btn btn-primary">Completar otro formulario</button>
      </div>
    );
  }

  // --- BLOQUE QUE GESTIONA EL COLOR DE BORDE SEGÚN EL CONJUNTO ---
  return (
    <div className="formulario-manual">
      <form onSubmit={handleSubmit}>
        <div className="form-container">
          {sortedAndFilteredQuestions.length > 0 ? (
            <div className="form-grid">
              {sortedAndFilteredQuestions.map((question) => {
                let conjuntoClass = '';
                // --- INVERNADEROS: del 7 al 58 (borde verde) ---
                if (question.Orden >= 7 && question.Orden <= 58) {
                  conjuntoClass = 'invernadero-question';
                } else if (question.Orden >= 58 && question.Orden <= 66) {
                  conjuntoClass = 'pantalla-question';
                } else if (question.Orden >= 67 && question.Orden <= 98) {
                  conjuntoClass = 'riego-question';
                } else if (question.Orden >= 116 && question.Orden <= 122) {
                  conjuntoClass = 'deposito-chapa-question';
                } else if (question.Orden >= 123 && question.Orden <= 130) {
                  conjuntoClass = 'revestimiento-embalse-question';
                } else if (question.Orden >= 131 && question.Orden <= 137) {
                  conjuntoClass = 'osmosis-question';
                }

                return (
                  <div key={question.IDQuestion} className={`form-question-card ${conjuntoClass}`}>
                    <div className="form-question-content">
                      <div className="form-group">
                        <label htmlFor={`question-${question.IDQuestion}`}>
                          {question.Description}
                          {question.Required && <span className="required-mark">*</span>}
                        </label>
                        {question.Comment && (
                          <small className="form-text text-muted">{question.Comment}</small>
                        )}
                        {renderField(question)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="no-questions">
              <h3>No hay preguntas disponibles</h3>
              <p>En este momento no hay preguntas configuradas para este formulario.</p>
            </div>
          )}

          <div className="submit-container">
            <button
              type="submit"
              className="btn-primary"
              disabled={sortedAndFilteredQuestions.length === 0 || isLoading}
            >
              Enviar respuestas
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

export default FormularioManual;