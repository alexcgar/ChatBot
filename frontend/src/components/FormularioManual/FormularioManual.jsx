import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../../config';
import './FormularioManual.css'; // Import CSS for styling

// Modificar el componente para aceptar props
const FormularioManual = ({ formData = {}, onFormChange, readOnly = false }) => {
  // Estado local para manejar los datos del formulario
  const [localFormData, setLocalFormData] = useState(formData);
  const [questions, setQuestions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitted, setSubmitted] = useState(false);

  // Sincronizar cuando cambien las props de formData
  useEffect(() => {
    setLocalFormData(formData);
  }, [formData]);

  // Cargar las preguntas al iniciar
  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/questions`);
        if (!response.ok) {
          throw new Error('No se pudieron cargar las preguntas');
        }
        const data = await response.json();
        setQuestions(data.questions);
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchQuestions();
  }, []);

  // Función para manejar cambios en los campos
  const handleChange = (fieldId, value) => {
    // Actualizar estado local
    const updatedData = {
      ...localFormData,
      [fieldId]: value
    };
    setLocalFormData(updatedData);

    // Notificar al componente padre
    if (onFormChange) {
      onFormChange({ [fieldId]: value });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const response = await fetch(`${API_BASE_URL}/submit-form`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ formData: localFormData })
      });

      if (!response.ok) {
        throw new Error('Error al enviar el formulario');
      }

      setSubmitted(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading && questions.length === 0) {
    return <div className="loading">Cargando formulario...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  if (submitted) {
    return (
      <div className="success-message">
        <h2>¡Formulario enviado con éxito!</h2>
        <p>Gracias por completar el formulario. Nos pondremos en contacto contigo pronto.</p>
        <button onClick={() => setSubmitted(false)}>Completar otro formulario</button>
      </div>
    );
  }

  // En el render, utilizar el readOnly prop para deshabilitar los campos cuando sea necesario
  return (
    <div className="formulario-manual container">
      <h2>Formulario de Configuración de Invernadero</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-sections row g-4"> {/* Usamos 'g-4' para añadir espacio (gutter) entre las columnas */}
          {/* Información General */}
          <div className="col-md-6"> {/* Solo usar 'col-md-6' sin otras clases de margen */}
            <div className="form-section h-100"> {/* Añadir h-100 para que todos los cuadrados tengan la misma altura */}
              <h3>Información General</h3>
              <RenderField 
                question={questions.find(q => q.id === "nueva_oferta")}
                value={localFormData["nueva_oferta"]}
                onChange={handleChange}
                disabled={readOnly}
              />
              <RenderField 
                question={questions.find(q => q.id === "oportunidad")}
                value={localFormData["oportunidad"]}
                onChange={handleChange}
                disabled={readOnly}
              />
              <RenderField 
                question={questions.find(q => q.id === "tipo_oferta")}
                value={localFormData["tipo_oferta"]}
                onChange={handleChange}
                disabled={readOnly}
              />
            </div>
          </div>
          
          {/* Ubicación */}
          <div className="col-md-6">
            <div className="form-section h-100">
              <h3>Ubicación</h3>
              <RenderField 
                question={questions.find(q => q.id === "provincia_cercana")}
                value={localFormData["provincia_cercana"]}
                onChange={handleChange}
                disabled={readOnly}
              />
              <RenderField 
                question={questions.find(q => q.id === "coordenadas_finca")}
                value={localFormData["coordenadas_finca"]}
                onChange={handleChange}
                disabled={readOnly}
              />
            </div>
          </div>
          
          {/* Tipo de Instalación */}
          <div className="col-md-6">
            <div className="form-section h-100">
              <h3>Tipo de Instalación</h3>
              <RenderField 
                question={questions.find(q => q.id === "tipo_instalacion")}
                value={localFormData["tipo_instalacion"]}
                onChange={handleChange}
                disabled={readOnly}
              />
            </div>
          </div>

          {/* Secciones condicionales de Invernadero */}
          {localFormData["tipo_instalacion"] === "Invernadero" && (
            <>
              {/* Estructura */}
              <div className="col-md-6">
                <div className="form-section h-100">
                  <h4>Estructura</h4>
                  <RenderField 
                    question={questions.find(q => q.id === "tipo_arco")}
                    value={localFormData["tipo_arco"]}
                    onChange={handleChange}
                    disabled={readOnly}
                  />
                  <RenderField 
                    question={questions.find(q => q.id === "largo_invernadero")}
                    value={localFormData["largo_invernadero"]}
                    onChange={handleChange}
                    disabled={readOnly}
                  />
                  <RenderField 
                    question={questions.find(q => q.id === "numero_capillas")}
                    value={localFormData["numero_capillas"]}
                    onChange={handleChange}
                    disabled={readOnly}
                  />
                  <RenderField 
                    question={questions.find(q => q.id === "altura_canal")}
                    value={localFormData["altura_canal"]}
                    onChange={handleChange}
                    disabled={readOnly}
                  />
                </div>
              </div>

              {/* Cimentación y Pilares */}
              <div className="col-md-6">
                <div className="form-section h-100">
                  <h4>Cimentación y Pilares</h4>
                  <RenderField 
                    question={questions.find(q => q.id === "cimentacion")}
                    value={localFormData["cimentacion"]}
                    onChange={handleChange}
                    disabled={readOnly}
                  />
                  <RenderField 
                    question={questions.find(q => q.id === "pilares_frontales")}
                    value={localFormData["pilares_frontales"]}
                    onChange={handleChange}
                    disabled={readOnly}
                  />
                  <RenderField 
                    question={questions.find(q => q.id === "pilares_laterales")}
                    value={localFormData["pilares_laterales"]}
                    onChange={handleChange}
                    disabled={readOnly}
                  />
                  <RenderField 
                    question={questions.find(q => q.id === "pilares_centrales")}
                    value={localFormData["pilares_centrales"]}
                    onChange={handleChange}
                    disabled={readOnly}
                  />
                  <RenderField 
                    question={questions.find(q => q.id === "galvanizado_pilares")}
                    value={localFormData["galvanizado_pilares"]}
                    onChange={handleChange}
                    disabled={readOnly}
                  />
                  <RenderField 
                    question={questions.find(q => q.id === "observaciones_pilares")}
                    value={localFormData["observaciones_pilares"]}
                    onChange={handleChange}
                    disabled={readOnly}
                  />
                </div>
              </div>

              {/* Canales */}
              <div className="col-md-6">
                <div className="form-section h-100">
                  <h4>Canales</h4>
                  <RenderField 
                    question={questions.find(q => q.id === "galvanizado_canales")}
                    value={localFormData["galvanizado_canales"]}
                    onChange={handleChange}
                    disabled={readOnly}
                  />
                  <RenderField 
                    question={questions.find(q => q.id === "tratamiento_anticaidas_laterales")}
                    value={localFormData["tratamiento_anticaidas_laterales"]}
                    onChange={handleChange}
                    disabled={readOnly}
                  />
                  <RenderField 
                    question={questions.find(q => q.id === "lineas_vida_canales")}
                    value={localFormData["lineas_vida_canales"]}
                    onChange={handleChange}
                    disabled={readOnly}
                  />
                  <RenderField 
                    question={questions.find(q => q.id === "opciones_canales")}
                    value={localFormData["opciones_canales"]}
                    onChange={handleChange}
                    disabled={readOnly}
                  />
                  <RenderField 
                    question={questions.find(q => q.id === "pendiente_invernadero")}
                    value={localFormData["pendiente_invernadero"]}
                    onChange={handleChange}
                    disabled={readOnly}
                  />
                </div>
              </div>

              {/* Estructura Superior */}
              <div className="col-md-6">
                <div className="form-section h-100">
                  <h4>Estructura Superior</h4>
                  <RenderField 
                    question={questions.find(q => q.id === "emparrillado")}
                    value={localFormData["emparrillado"]}
                    onChange={handleChange}
                    disabled={readOnly}
                  />
                  <RenderField 
                    question={questions.find(q => q.id === "espaciado_lineas")}
                    value={localFormData["espaciado_lineas"]}
                    onChange={handleChange}
                    disabled={readOnly}
                  />
                  <RenderField 
                    question={questions.find(q => q.id === "tipo_correa")}
                    value={localFormData["tipo_correa"]}
                    onChange={handleChange}
                    disabled={readOnly}
                  />
                  <RenderField 
                    question={questions.find(q => q.id === "calidad_cumbrera")}
                    value={localFormData["calidad_cumbrera"]}
                    onChange={handleChange}
                    disabled={readOnly}
                  />
                  <RenderField 
                    question={questions.find(q => q.id === "calidad_lateral")}
                    value={localFormData["calidad_lateral"]}
                    onChange={handleChange}
                    disabled={readOnly}
                  />
                  <RenderField 
                    question={questions.find(q => q.id === "calidad_frontal")}
                    value={localFormData["calidad_frontal"]}
                    onChange={handleChange}
                    disabled={readOnly}
                  />
                  <RenderField 
                    question={questions.find(q => q.id === "calidad_canales")}
                    value={localFormData["calidad_canales"]}
                    onChange={handleChange}
                    disabled={readOnly}
                  />
                  <RenderField 
                    question={questions.find(q => q.id === "calidad_ventana_cenital")}
                    value={localFormData["calidad_ventana_cenital"]}
                    onChange={handleChange}
                    disabled={readOnly}
                  />
                  <RenderField 
                    question={questions.find(q => q.id === "observaciones_correas")}
                    value={localFormData["observaciones_correas"]}
                    onChange={handleChange}
                    disabled={readOnly}
                  />
                </div>
              </div>
            </>
          )}

          {/* Sección de Nave (Condicional) */}
          {localFormData["tipo_instalacion"] === "Nave" && (
            <div className="col-md-6">
              <div className="form-section h-100">
                <h3>Detalles de la Nave</h3>
                {/* Renderizar campos específicos para naves */}
              </div>
            </div>
          )}
        </div>
        
        <div className="form-actions mt-4">
          <button type="submit" disabled={isLoading || readOnly}>
            {isLoading ? 'Enviando...' : 'Enviar Formulario'}
          </button>
          <button type="reset" onClick={() => setLocalFormData({})} disabled={readOnly}>
            Limpiar Formulario
          </button>
        </div>
      </form>
    </div>
  );
};

// Componente auxiliar para renderizar cada campo según su tipo
const RenderField = ({ question, value, onChange, disabled = false }) => {
  if (!question) return null;
  
  // Manejador general para cualquier cambio
  const handleChange = (newValue) => {
    if (!disabled && onChange) {
      onChange(question.id, newValue);
    }
  };
  
  // Renderizado según tipo de pregunta
  switch(question.type) {
    case 'select':
      return (
        <div className="form-group">
          <label htmlFor={question.id}>{question.text}</label>
          <select
            id={question.id}
            className="form-control"
            value={value || ''}
            onChange={(e) => handleChange(e.target.value)}
            disabled={disabled}
          >
            <option value="">Seleccionar...</option>
            {question.options.map(option => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </div>
      );
    
    // Otros tipos de campos (text, textarea, etc.)
    // ...con la misma lógica de disabled
    
    default:
      return (
        <div className="form-group">
          <label htmlFor={question.id}>{question.text}</label>
          <input
            type="text"
            id={question.id}
            className="form-control"
            value={value || ''}
            onChange={(e) => handleChange(e.target.value)}
            placeholder={question.placeholder || ''}
            disabled={disabled}
          />
        </div>
      );
  }
};

export default FormularioManual;