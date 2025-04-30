import React, { useState } from 'react';
import './ChatInput.css';

const ChatInput = ({ question, onSend, isLoading }) => {
  const [inputValue, setInputValue] = useState('');
  
  const handleSubmit = (e) => {
    e.preventDefault();
    if (inputValue.trim() === '') return;
    
    onSend(inputValue);
    setInputValue('');
  };
  
  // Si es una pregunta con opciones de selección
  if (question.type === 'select' && question.options && question.options.length > 0) {
    return (
      <div className="chat-input-container">
        <form onSubmit={handleSubmit}>
          <div className="select-options">
            {question.options.map((option) => (
              <button
                key={option.value}
                type="button"
                className="option-button"
                onClick={() => {
                  onSend(option.label);
                }}
                disabled={isLoading}
              >
                {option.label}
              </button>
            ))}
          </div>
          <div className="input-container">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={question.placeholder || "Escribe tu respuesta o selecciona una opción..."}
              disabled={isLoading}
            />
            <button type="submit" disabled={inputValue.trim() === '' || isLoading}>
              {isLoading ? "..." : "Enviar"}
            </button>
          </div>
        </form>
      </div>
    );
  }

  // Input normal para texto
  return (
    <div className="chat-input-container">
      <form onSubmit={handleSubmit}>
        <div className="input-container">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={question.placeholder || "Escribe tu respuesta..."}
            disabled={isLoading}
          />
          <button type="submit" disabled={inputValue.trim() === '' || isLoading}>
            {isLoading ? "..." : "Enviar"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ChatInput;