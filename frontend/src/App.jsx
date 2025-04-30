import React, { useState, useEffect } from 'react';
import Chatbot from './components/ChatBot/ChatBot';
import FormularioManual from './components/FormularioManual/FormularioManual';
import { fetchPreguntas } from './services/api';
import { FaComments, FaTimes } from 'react-icons/fa';
import './App.css';

function App() {
  const [questions, setQuestions] = useState([]);
  const [formData, setFormData] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isChatOpen, setIsChatOpen] = useState(false);

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

  const handleUpdateFormData = (newData) => {
    setFormData(prev => ({ ...prev, ...newData }));
  };

  if (isLoading) {
    return <div className="text-center mt-5">Cargando preguntas…</div>;
  }
  if (error) {
    return <div className="alert alert-danger mt-5">{error}</div>;
  }

  return (
    <div className="container-fluid">
      <FormularioManual
        questions={questions}
        formData={formData}
        onFormChange={handleUpdateFormData}
      />

      {/* Burbuja flotante del chat */}
      <div className={`chat-bubble ${isChatOpen ? 'open' : 'closed'}`}>
        {/* Botón siempre visible cuando está cerrado */}
        <div className={`chat-bubble-button ${isChatOpen ? 'hidden' : ''}`} onClick={() => setIsChatOpen(true)}>
          <FaComments />
        </div>

        {/* Contenedor del chat siempre montado, visibilidad controlada por CSS */}
        <div className={`chat-bubble-container ${isChatOpen ? '' : 'hidden'}`}>
          <div className="chat-bubble-header">
            <h3>Asistente Virtual</h3>
            <button className="chat-close-button" onClick={() => setIsChatOpen(false)}>
              <FaTimes />
            </button>
          </div>
          <div className="chat-bubble-content">
            <Chatbot
              questions={questions}
              formData={formData}
              onUpdateFormData={handleUpdateFormData}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
