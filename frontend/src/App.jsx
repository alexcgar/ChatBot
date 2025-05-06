import React, { useState, useEffect } from 'react';
import FormularioManual from './components/FormularioManual/FormularioManual';
import ChatBot from './components/ChatBot/ChatBot';
import { fetchPreguntas } from './services/api';
// eslint-disable-next-line no-unused-vars
import { AnimatePresence, motion } from 'framer-motion';
import { FaRobot, FaTimes } from 'react-icons/fa';
import './App.css';

// Componente para el botón de chat
const ChatButton = ({ onClick, isOpen }) => {
  return (
    <button 
      className="chat-button" 
      onClick={onClick}
      aria-label={isOpen ? "Cerrar asistente" : "Abrir asistente"}
      title={isOpen ? "Cerrar asistente" : "Abrir asistente"}
    >
      {isOpen ? <FaTimes /> : <FaRobot />}
    </button>
  );
};

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

  // Función para alternar el estado del chat con debug
  const toggleChat = () => {
    console.log("Toggling chat, current state:", isChatOpen);
    setIsChatOpen(prevState => !prevState);
  };

  // Efecto para verificar cambios en el estado del chat
  useEffect(() => {
    console.log("Chat open state changed to:", isChatOpen);
  }, [isChatOpen]);

  if (isLoading) {
    return <div className="text-center mt-5">Cargando preguntas…</div>;
  }
  if (error) {
    return <div className="alert alert-danger mt-5">{error}</div>;
  }

  return (
    <div className="app-container">
      <FormularioManual 
        formData={formData} 
        questions={questions}
        onFormChange={(newData) => setFormData({...formData, ...newData})}
      />
      
      {/* ChatBot siempre renderizado, pero con visibilidad controlada */}
      <div className={`chatbot-container ${isChatOpen ? 'visible' : 'hidden'}`}>
        <ChatBot 
          questions={questions}
          onUpdateFormData={(newData) => {
            console.log("Updating form data from ChatBot", newData);
            setFormData({...formData, ...newData});
          }}
          formData={formData}
          onClose={toggleChat}
          isVisible={isChatOpen} // Pasar el estado de visibilidad
        />
      </div>
      
      {/* Botón de chat mejorado */}
      <ChatButton 
        onClick={toggleChat} 
        isOpen={isChatOpen} 
      />
    </div>
  );
}

export default App;
