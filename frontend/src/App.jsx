import { useState, useEffect } from 'react';
import FormularioManual from './components/FormularioManual/FormularioManual';
import ChatBot from './components/Chatbot/ChatBot';
import { fetchPreguntas } from './services/api';
import { AnimatePresence} from 'framer-motion';
import { FaRobot, FaTimes } from 'react-icons/fa';
import './App.css';

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
    setIsChatOpen(prev => !prev);
    
    if (isMobile) {
      if (!isChatOpen) {
        document.body.style.overflow = 'hidden';
      } else {
        document.body.style.overflow = '';
      }
    }
  };

  if (isLoading && questions.length === 0) {
    return (
      <div className="app-loading">
        <div className="loading-spinner"></div>
        <p>Cargando aplicación...</p>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="app-error">
        <div className="error-icon">⚠️</div>
        <h3>Error en la aplicación</h3>
        <p>{error}</p>
        <button onClick={() => window.location.reload()} className="btn-retry">
          Intentar de nuevo
        </button>
      </div>
    );
  }

  return (
    <div className="app-root">
      <FormularioManual 
        formData={formData} 
        questions={questions}
        onFormChange={(newData) => setFormData({...formData, ...newData})}
        autocompletados={autoCompletedFields}
        onSectionStatusChange={setSectionStatuses}
      />
      
      <AnimatePresence>
        {isChatOpen && (
          <motion.div 
            className={`chatbot-container ${isMobile ? 'mobile' : ''}`}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.3 }}
          >
            <ChatBot 
              questions={questions}
              onUpdateFormData={(newData, autoCompleted) => {
                setFormData(prev => ({...prev, ...newData}));
                
                if (autoCompleted && autoCompleted.length > 0) {
                  setAutoCompletedFields(prev => {
                    const allFields = [...prev];
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
          </motion.div>
        )}
      </AnimatePresence>
      
      <ChatButton 
        onClick={toggleChat} 
        isOpen={isChatOpen} 
        className={isMobile ? 'mobile-button' : ''}
      />
    </div>
  );
}

export default App;
