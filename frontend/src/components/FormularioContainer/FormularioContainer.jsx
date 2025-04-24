import React, { useState } from 'react';
import FormularioManual from '../FormularioManual/FormularioManual';
import Chatbot from '../ChatBot/ChatBot';
import './FormularioContainer.css';

const FormularioContainer = () => {
  const [formData, setFormData] = useState({});

  // Manejador para actualizar datos desde el formulario manual
  const handleFormChange = (updatedData) => {
    setFormData(prevData => ({
      ...prevData,
      ...updatedData
    }));
  };

  // Manejador para actualizar datos desde el chatbot
  const handleChatbotUpdate = (updatedData) => {
    setFormData(prevData => ({
      ...prevData,
      ...updatedData
    }));
  };

  return (
    <div className="formulario-container">
      <h2 className="text-center mb-4">Configuración de Invernadero</h2>
      
      {/* Contenedor principal - lado a lado siempre */}
      <div className="content-container row">
        {/* Formulario siempre visible y editable */}
        <div className="col-md-8">
          <FormularioManual 
            formData={formData}
            onFormChange={handleFormChange}
            readOnly={false}
          />
        </div>

        {/* Chatbot siempre visible */}
        <div className="col-md-4 chatbot-container">
          <Chatbot 
            onUpdateFormData={handleChatbotUpdate}
            currentFormData={formData}
            showSummary={false} // Ya no mostrar el resumen
          />
        </div>
      </div>
    </div>
  );
};

export default FormularioContainer;