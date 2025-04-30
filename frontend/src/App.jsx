import React, { useState, useEffect } from 'react';
import Chatbot from './components/ChatBot/ChatBot';
import FormularioManual from './components/FormularioManual/FormularioManual';
import { fetchPreguntas } from './services/api';
import './App.css';

function App() {
  const [questions, setQuestions] = useState([]);
  const [formData, setFormData]   = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError]         = useState(null);

  // Cargar preguntas al montar la app
  useEffect(() => {
    const loadQuestions = async () => {
      try {
        setIsLoading(true);
        const apiResponse = await fetchPreguntas();
        const arr = Array.isArray(apiResponse)
          ? apiResponse
          : Array.isArray(apiResponse.data)
            ? apiResponse.data
            : [];
        setQuestions(arr);
      } catch (err) {
        setError('Error al cargar preguntas: ' + err.message);
      } finally {
        setIsLoading(false);
      }
    };
    loadQuestions();
  }, []);

  // Actualiza formData desde cualquiera de los dos componentes
  const handleUpdateFormData = (newData) =>
    setFormData(prev => ({ ...prev, ...newData }));

  if (isLoading) {
    return <div className="text-center mt-5">Cargando preguntas…</div>;
  }
  if (error) {
    return <div className="alert alert-danger mt-5">{error}</div>;
  }

  return (
    <div className="container-fluid">
      <div className="row main-row mt-2">
        {/* ChatBot */}
        <div className="col-12 col-md-3 component-col">
          <div className="component-header"><h2>Asistente Virtual</h2></div>
          <div className="component-inner-scroll">
            <Chatbot
              questions={questions}
              formData={formData} 
              onUpdateFormData={handleUpdateFormData}
            />
          </div>
        </div>

        {/* Formulario Manual */}
        <div className="col-12 col-md-8 component-col">
          <div className="component-header"><h2>Formulario Manual</h2></div>
          <div className="component-inner-scroll">
            <FormularioManual
              questions={questions}
              formData={formData}
              onFormChange={handleUpdateFormData}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;