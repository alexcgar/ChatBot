import React, { useState, useRef, useEffect } from 'react';
import './ChatInput.css';

const ChatInput = ({ question, onSend, isLoading }) => {
  const [inputValue, setInputValue] = useState('');
  const textareaRef = useRef(null);
  
  // Función para ajustar automáticamente la altura
  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    
    // Resetear altura para medir correctamente
    textarea.style.height = 'auto';
    // Establecer la altura basada en el contenido
    textarea.style.height = `${textarea.scrollHeight}px`;
  };
  
  // Ajustar altura cuando cambia el valor
  useEffect(() => {
    adjustTextareaHeight();
  }, [inputValue]);
  
  const handleSubmit = (e) => {
    e.preventDefault();
    if (inputValue.trim() === '') return;
    
    onSend(inputValue);
    setInputValue('');
    // Resetear altura después de enviar
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
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
              >
                {option.label}
              </button>
            ))}
          </div>
          <div className="input-container">
            <textarea
              ref={textareaRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={question.placeholder || "Escribe tu respuesta o selecciona una opción..."}
              rows="1"
              className="expandable-textarea"
            />
            <button type="submit" disabled={inputValue.trim() === ''}>
              {isLoading ? "Enviando..." : "Enviar"}
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
          <textarea
            ref={textareaRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={question.placeholder || "Escribe tu respuesta..."}
            rows="1"
            className="expandable-textarea"
          />
          <button type="submit" disabled={inputValue.trim() === ''}>
            {isLoading ? "Enviando..." : "Enviar"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ChatInput;