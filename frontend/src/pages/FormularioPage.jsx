import React, { useState, useEffect } from 'react';
import FormularioManual from '../components/FormularioManual/FormularioManual';
import ChatBot from '../components/ChatBot/ChatBot';
import { fetchPreguntas } from '../services/api';

function FormularioPage() {
  const [formData, setFormData] = useState({});
  const [questions, setQuestions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [chatMode, setChatMode] = useState(false); // Para alternar entre formulario y chat

  // Cargar preguntas una vez y compartirlas
  useEffect(() => {
    const loadQuestions = async () => {
      try {
        setIsLoading(true);
        const apiResponse = await fetchPreguntas();
        
        // Extraer el array de preguntas
        let preguntasArray = [];
        if (Array.isArray(apiResponse)) {
          preguntasArray = apiResponse;
        } else if (apiResponse && Array.isArray(apiResponse.data)) {
          preguntasArray = apiResponse.data;
        }
        
        setQuestions(preguntasArray);
      } catch (err) {
        setError('Error al cargar las preguntas: ' + err.message);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadQuestions();
  }, []);

  // Función para actualizar los datos del formulario
  const handleFormChange = (newData) => {
    setFormData(prevData => ({
      ...prevData,
      ...newData
    }));
  };

  return (
    <div className="container my-4">
      <div className="row mb-4">
        <div className="col-12">
          <div className="form-toggle">
            <button 
              className={`btn ${!chatMode ? 'btn-primary' : 'btn-outline-primary'}`}
              onClick={() => setChatMode(false)}
            >
              Formulario Manual
            </button>
            <button 
              className={`btn ${chatMode ? 'btn-primary' : 'btn-outline-primary'}`}
              onClick={() => setChatMode(true)}
            >
              Asistente Conversacional
            </button>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center">Cargando preguntas...</div>
      ) : error ? (
        <div className="alert alert-danger">{error}</div>
      ) : (
        <div className="row">
          {chatMode ? (
            <ChatBot 
              questions={questions} 
              onUpdateFormData={handleFormChange} 
              currentFormData={formData}
            />
          ) : (
            <FormularioManual 
              questions={questions} 
              formData={formData} 
              onFormChange={handleFormChange} 
            />
          )}
        </div>
      )}
    </div>
  );
}

export default FormularioPage;