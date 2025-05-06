import React from 'react';
import { FaPaperPlane } from 'react-icons/fa';
import './ChatInput.css';

// Modificar el componente ChatInput para aceptar placeholder como prop
const ChatInput = ({ value = '', onChange, onSubmit, isTyping, placeholder = 'Escribe tu consulta aquí...' }) => (
  <div className="chat-input-container">
    <input
      type="text"
      className="chat-input"
      value={value}
      onChange={onChange}
      placeholder={placeholder} // Usar el placeholder dinámico en lugar del texto estático
      disabled={isTyping}
    />
    <button 
      className="send-button" 
      onClick={onSubmit}
      disabled={(!value || !value.trim()) || isTyping}
    >
      <FaPaperPlane size={16} />
    </button>
  </div>
);

export default ChatInput;