import React, { useState, useEffect } from 'react';
import FormularioManual from './components/FormularioManual/FormularioManual';
import ChatBot from './components/Chatbot/ChatBot';
import { fetchPreguntas } from './services/api';
// eslint-disable-next-line no-unused-vars
import { AnimatePresence, motion } from 'framer-motion';
import { FaRobot, FaTimes } from 'react-icons/fa';
// Import only the component-specific styles
import './components/ChatButton/ChatButton.css';

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
  const [autoCompletedFields, setAutoCompletedFields] = useState([]);

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
    return (
      <div className="text-center mt-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Cargando...</span>
        </div>
      </div>
    );
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
        autocompletados={autoCompletedFields}
      />
      
      {/* ChatBot siempre renderizado, pero con visibilidad controlada */}
      <div className={`chatbot-container ${isChatOpen ? 'visible' : 'hidden'}`}>
        <ChatBot 
          questions={questions}
          onUpdateFormData={(newData, autoCompleted) => {
            console.log("Actualizando formData desde ChatBot:", newData);
            // Usar una función de actualización para evitar problemas de estados antiguos
            setFormData(prevData => {
              const updatedData = { ...prevData, ...newData };
              console.log("Nuevo estado formData:", updatedData);
              return updatedData;
            });
            
            // Actualizar campos autocompletados
            if (autoCompleted && autoCompleted.length > 0) {
              console.log(`Se autocompletaron ${autoCompleted.length} campos:`, autoCompleted);
              // Actualizar la lista de campos autocompletados
              setAutoCompletedFields(prevFields => {
                // Combinar los campos existentes con los nuevos, evitando duplicados
                const allFields = [...prevFields];
                autoCompleted.forEach(field => {
                  if (!allFields.includes(field)) {
                    allFields.push(field);
                  }
                });
                return allFields;
              });
            }
          }}
          formData={formData}
          onClose={toggleChat}
          isVisible={isChatOpen}
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
