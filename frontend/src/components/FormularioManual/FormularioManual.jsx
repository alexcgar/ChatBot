import React, { useState, useEffect, useCallback, useMemo } from 'react';
import './FormularioManual.css';
import { fetchPreguntas, enviarRespuestas } from '../../services/api';

function FormularioManual({ formData = {}, onFormChange }) {
  const [localFormData, setLocalFormData] = useState(formData);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSuccess, setIsSuccess] = useState(false);

  // Sincronizar con los datos externos cuando cambien
  useEffect(() => {
    // --- DEBUGGING SYNC ---
    console.log('--- useEffect [formData] ---');
    console.log('Received formData prop:', JSON.stringify(formData));
    // Verifica si el ID de "Tipo De Oferta" está presente en las props
    const tipoOfertaValueInProp = formData['1bddb8b1-0012-48ad-ab88-6604550600bf'];
    console.log('Value for Tipo De Oferta in prop:', tipoOfertaValueInProp);
    // --- END DEBUGGING SYNC ---
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
    // --- RECOGIDA DE DRENAJES (99-114): solo si la primera está respondida ---
    if (question.Orden >= 100 && question.Orden <= 114) {
      const primeraPreguntaDrenajes = localFormData["9701d818-fe0d-4c39-9eb3-0d6ed70cb252"];
      if (!primeraPreguntaDrenajes) return false;
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

    // --- ALMACENAMIENTO/TRATAMIENTO AGUA (115-131): solo si la 115 está respondida ---
    if (question.Orden >= 116 && question.Orden <= 131) {
      const primeraPreguntaAgua = localFormData["10ef21b9-162d-4e3e-b63a-c5756e48d0ea"];
      if (!primeraPreguntaAgua) return false;
    }

    // --- DISEÑO PLANTA OSMOSIS: solo si la primera está respondida ---
    // Del 131 al 137, solo si la 131 tiene respuesta
    if (question.Orden >= 131 && question.Orden <= 137) {
      const primerOsmosis = localFormData["731c8a1a-b730-4902-903f-a7de15502244"];
      if (!primerOsmosis) return false;
    }

    // --- SISTEMAS FITOSANITARIOS: solo si la primera está respondida ---
    if (question.Orden >= 188 && question.Orden <= 190) {
      const primeraFitosanitarios = localFormData["ba3d6a21-2f5d-4d19-8400-eb0f1f95d6d5"];
      if (!primeraFitosanitarios) return false;
    }

    // --- CARROS DE TRABAJO (191-205): solo si la primera está respondida ---
    if (question.Orden >= 192 && question.Orden <= 205) {
      const primeraPreguntaNuevoBloque = localFormData["32095b26-8a0f-48e5-bf65-e85056548310"];
      if (!primeraPreguntaNuevoBloque) return false;
    }

    // --- PRESUPUESTAR COMPLEMENTOS SEMILLERO (206-214): solo si la primera está respondida ---
    if (question.Orden >= 207 && question.Orden <= 214) {
      const primeraPreguntaSemillero = localFormData["0b39128b-0d61-428a-bb50-e6828b93cdda"];
      if (!primeraPreguntaSemillero) return false;
    }

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
        const rawValueFromState = localFormData[IDQuestion];
        let valueForSelect = ''; // Valor que finalmente usaremos para el <select>

        // --- DEBUGGING LOGS ---
        console.log(`--- Debugging Select for Question ID: ${IDQuestion} (${Description}) ---`);
        console.log(`Raw value from localFormData:`, rawValueFromState, `(Type: ${typeof rawValueFromState})`);
        console.log(`Available options (questionAnswers):`, JSON.stringify(questionAnswers)); // Log como JSON para ver estructura clara
        // --- END DEBUGGING LOGS ---

        if (rawValueFromState !== undefined && rawValueFromState !== null) {
          // Convertir a string y quitar espacios al inicio/final
          const rawValueStr = String(rawValueFromState).trim();

          // --- DEBUGGING LOGS ---
          console.log(`Value as string (trimmed): "${rawValueStr}"`);
          // --- END DEBUGGING LOGS ---

          // 1. Intentar encontrar una opción cuya Descripción coincida (insensible a mayúsculas/minúsculas y espacios)
          const optionMatchingDescription = questionAnswers.find(
            ans => ans.Description && String(ans.Description).trim().toLowerCase() === rawValueStr.toLowerCase()
          );

          if (optionMatchingDescription) {
            valueForSelect = String(optionMatchingDescription.CodAnswer);
            // --- DEBUGGING LOGS ---
            console.log(`✅ Match found by Description: "${optionMatchingDescription.Description}". Setting valueForSelect to CodAnswer: "${valueForSelect}"`);
            // --- END DEBUGGING LOGS ---
          } else {
            // 2. Si no hay coincidencia por descripción, verificar si el valor guardado ya es un CodAnswer válido (como string)
            const optionMatchingCodAnswer = questionAnswers.find(
              ans => String(ans.CodAnswer) === rawValueStr
            );
            if (optionMatchingCodAnswer) {
              valueForSelect = rawValueStr;
              // --- DEBUGGING LOGS ---
              console.log(`✅ Match found by CodAnswer: "${rawValueStr}". Using this value for valueForSelect.`);
              // --- END DEBUGGING LOGS ---
            } else {
              // --- DEBUGGING LOGS ---
              console.log(`❌ No match found by Description or CodAnswer. valueForSelect remains empty.`);
              // --- END DEBUGGING LOGS ---
            }
          }
        } else {
            // --- DEBUGGING LOGS ---
            console.log(`ℹ️ Raw value is undefined or null. valueForSelect remains empty.`);
            // --- END DEBUGGING LOGS ---
        }

        // Encontrar la opción seleccionada para mostrar la imagen (si aplica)
        const selectedAnswer = questionAnswers.find(
          ans => String(ans.CodAnswer) === valueForSelect
        );

        // --- DEBUGGING LOGS ---
        console.log(`➡️ Final valueForSelect passed to <select>: "${valueForSelect}"`);
        console.log(`--- End Debugging Select ---`);
        // --- END DEBUGGING LOGS ---

        return (
          <div>
            <select
              id={`question-${IDQuestion}`}
              className="form-control"
              value={valueForSelect} // Usar el valor determinado
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
                  value={String(answer.CodAnswer)} // El valor de la opción siempre es el CodAnswer como string
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

  // Función auxiliar para verificar si un campo está realmente completado
  const isFieldCompleted = (value) => {
    if (value === undefined || value === null) return false;
    if (value === '') return false;
    if (Array.isArray(value) && value.length === 0) return false;
    if (typeof value === 'object' && Object.keys(value).length === 0) return false;
    return true;
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
                } else if (question.Orden >= 99 && question.Orden <= 114) {
                  conjuntoClass = 'recogida-drenajes-question';
                } else if (question.Orden === 115) { // <-- Añadir este bloque para la pregunta 115
                  conjuntoClass = 'almacenamiento-agua-trigger-question';
                } else if (question.Orden >= 116 && question.Orden <= 122) {
                  conjuntoClass = 'deposito-chapa-question';
                } else if (question.Orden >= 123 && question.Orden <= 130) {
                  conjuntoClass = 'revestimiento-embalse-question';
                } else if (question.Orden === 131) { // Asegúrate que este sea solo para 131 si es el final
                  conjuntoClass = 'osmosis-question';
                } else if (question.Orden >= 187 && question.Orden <= 190) {
                  conjuntoClass = 'sistemas-fitosanitarios-question';
                } else if (question.Orden >= 191 && question.Orden <= 205) {
                  conjuntoClass = 'nuevo-bloque-question';
                } else if (question.Orden >= 206 && question.Orden <= 214) {
                  conjuntoClass = 'presupuestar-semillero-question';
                }

                return (
                  <div 
                    key={question.IDQuestion} 
                    className={`form-question-card ${conjuntoClass} ${
                      question.Required ? 
                        (isFieldCompleted(localFormData[question.IDQuestion]) ? 'required-answered' : 'required-unanswered') 
                        : ''
                    }`}
                  >
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