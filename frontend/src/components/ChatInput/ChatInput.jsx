import React, { useState, useEffect } from 'react';

const ChatInput = ({ question, onSend, isLoading }) => {
  const [inputValue, setInputValue] = useState('');
  // State to track if the 'Other' option input is active
  const [isOtherInputVisible, setIsOtherInputVisible] = useState(false);

  // Reset input and 'Other' state when question changes
  useEffect(() => {
    setInputValue('');
    setIsOtherInputVisible(false); // Reset 'Other' state on new question
  }, [question]);

  const handleInputChange = (event) => {
    setInputValue(event.target.value);
  };

  // Handles sending for text, number, and custom 'Other' input
  const handleSendClick = () => {
    if (inputValue.trim()) {
      onSend(inputValue.trim());
      setInputValue('');
      setIsOtherInputVisible(false); // Hide 'Other' input after sending
    }
  };

  // Handles clicking predefined options
  const handleOptionClick = (option) => {
    setIsOtherInputVisible(false); // Ensure 'Other' input is hidden
    onSend(option);
  };

  // Handles clicking the 'Other' button
  const handleOtherClick = () => {
    setIsOtherInputVisible(true); // Show the text input
  };

  const handleKeyPress = (event) => {
    // Allow Enter to send for text, number, and the 'Other' input
    if (event.key === 'Enter' && !isLoading && inputValue.trim()) {
       if (question.type === 'text' || question.type === 'number' || isOtherInputVisible) {
           handleSendClick();
       }
    }
  };

  // Render different input types
  const renderInput = () => {
    switch (question.type) {
      case 'text':
      case 'number': // Combine text and number rendering logic
        return (
          <input
            // Use 'number' type specifically for question.type === 'number'
            type={question.type === 'number' ? 'number' : 'text'}
            className="form-control"
            value={inputValue}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
            placeholder={question.type === 'number' ? 'Introduce un número...' : 'Escribe tu respuesta...'}
            disabled={isLoading}
            aria-label={`User input ${question.type}`}
            autoFocus // Focus input on render
          />
        );

      case 'input':
        return (
          <input
            // Use question.inputType if available, otherwise default to 'text'
            type={question.inputType || 'text'}
            className="form-control"
            value={inputValue}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
            // Use question.placeholder if available
            placeholder={question.placeholder || 'Escribe tu respuesta...'}
            disabled={isLoading}
            aria-label={`User input ${question.inputType || 'text'}`}
            autoFocus // Focus input on render
          />
        );

      case 'select':
        // If 'Other' input is visible, show text input and send button
        if (isOtherInputVisible) {
          return (
            <div className="d-flex gap-2">
              <input
                type="text"
                className="form-control"
                value={inputValue}
                onChange={handleInputChange}
                onKeyPress={handleKeyPress}
                placeholder="Especifica tu respuesta..."
                disabled={isLoading}
                aria-label="User custom input"
                autoFocus
              />
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSendClick}
                disabled={isLoading || !inputValue.trim()}
              >
                {isLoading ? (
                  <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                ) : (
                  'Enviar'
                )}
              </button>
            </div>
          );
        }
        // Otherwise, show predefined options and the 'Other' button
        return (
          <div className="d-flex flex-wrap gap-2">
            {/* --- MODIFICAR ESTE MAP PARA MANEJAR STRINGS Y OBJETOS --- */}
            {question.options.map((option, index) => {
              // Check if the option is an object with label/value or just a string
              // Use Object.prototype.hasOwnProperty.call for safety
              const isObjectOption = typeof option === 'object' && option !== null &&
                                     Object.prototype.hasOwnProperty.call(option, 'value') &&
                                     Object.prototype.hasOwnProperty.call(option, 'label');

              // Determine the value to display on the button
              const displayValue = isObjectOption ? option.label : option;
              // Determine the value to send when clicked
              const sendValue = isObjectOption ? option.value : option;
              // Determine a unique key for the button
              const key = isObjectOption ? option.value : option;

              return (
                <button
                  // Use the determined key, fallback to index if needed
                  key={key || index}
                  type="button"
                  className="btn btn-outline-primary"
                  // Send the correct value (string or object's value)
                  onClick={() => handleOptionClick(sendValue)}
                  disabled={isLoading}
                >
                  {/* Display the correct value (string or object's label) */}
                  {displayValue}
                </button>
              );
            })}
            {/* --- FIN DE LA MODIFICACIÓN --- */}

            {/* Botón 'Otro...' (sin cambios) */}
            <button
              key="other"
              type="button"
              className="btn btn-outline-secondary"
              onClick={handleOtherClick}
              disabled={isLoading}
            >
              Otro...
            </button>
          </div>
        );

      case 'info':
        return (
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => handleOptionClick("Continuar")}
            disabled={isLoading}
          >
            Entendido
          </button>
        );

      default:
        // Now this should only show for truly unsupported types
        return <p>Tipo de pregunta no soportado: {question.type}</p>;
    }
  };

  return (
    <div className="d-flex gap-2 align-items-start"> {/* Use align-items-start */}
      <div className="flex-grow-1">
        {renderInput()}
      </div>
      {/* Show main Send button for text, number, AND input types (not when 'Other' is active) */}
      {(question.type === 'text' || question.type === 'number' || question.type === 'input') && !isOtherInputVisible && (
        <button
          type="button"
          className="btn btn-primary"
          onClick={handleSendClick}
          disabled={isLoading || !inputValue.trim()}
        >
          {isLoading ? (
            <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
          ) : (
            'Enviar'
          )}
        </button>
      )}
    </div>
  );
};

export default ChatInput;