import { useState, useEffect } from 'react';
import FormularioManual from './components/FormularioManual/FormularioManual';
import ChatBot from './components/Chatbot/ChatBot';
import { fetchPreguntas } from './services/api';
// eslint-disable-next-line no-unused-vars
import { AnimatePresence, motion } from 'framer-motion';
import { FaRobot, FaTimes } from 'react-icons/fa';
// Import only the component-specific styles
import './components/ChatButton/ChatButton.css';

// Componente para el botón de chat
const ChatButton = ({ onClick, isOpen, className }) => {
  return (
    <button 
      className={`chat-button ${className}`} 
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
  const [sectionStatuses, setSectionStatuses] = useState({});
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 767);

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

    const handleResize = () => {
      setIsMobile(window.innerWidth <= 767);
    };
    window.addEventListener('resize', handleResize);
    
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleChat = () => {
    console.log("Toggling chat, current state:", isChatOpen);
    setIsChatOpen(prevState => !prevState);
    
    if (isMobile) {
      if (!isChatOpen) {
        document.body.style.overflow = 'hidden';
      } else {
        document.body.style.overflow = '';
      }
    }
  };

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
        onSectionStatusChange={setSectionStatuses}
        className={isMobile && isChatOpen ? 'hidden' : ''}
      />
      
      <div className={`chatbot-container ${isChatOpen ? 'visible' : 'hidden'} ${isMobile ? 'mobile-container' : ''}`}>
        <ChatBot 
          questions={questions}
          onUpdateFormData={(newData, autoCompleted) => {
            console.log("Actualizando formData desde ChatBot:", newData);
            setFormData(prevData => {
              const updatedData = { ...prevData, ...newData };
              console.log("Nuevo estado formData:", updatedData);
              return updatedData;
            });
            
            if (autoCompleted && autoCompleted.length > 0) {
              console.log(`Se autocompletaron ${autoCompleted.length} campos:`, autoCompleted);
              setAutoCompletedFields(prevFields => {
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
          sectionStatuses={sectionStatuses}
          isMobile={isMobile}
        />
      </div>
      
      <ChatButton 
        onClick={toggleChat} 
        isOpen={isChatOpen} 
        className={isMobile ? 'mobile-button' : ''}
      />
    </div>
  );
}

export default App;
