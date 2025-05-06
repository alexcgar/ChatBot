import React, { useState } from 'react';
// eslint-disable-next-line no-unused-vars
import { AnimatePresence, motion } from 'framer-motion';

const FormSection = ({ 
  section, 
  questions, 
  formData, 
  renderField,
  isFieldCompleted,
}) => {
  const [isExpanded, setIsExpanded] = useState(section.expanded);
  
 
   
  
  // Si la sección no tiene preguntas, no mostrarla
  if (questions.length === 0) return null;
  
  const Icon = section.icon;
  
  return (
    <div className="form-section" style={{ borderColor: section.color }}>
      <div 
        className="section-header" 
        onClick={() => setIsExpanded(!isExpanded)}
        style={{ background: `linear-gradient(135deg, ${section.color}40, ${section.color}20)` }}
      >
        <div className="section-header-left">
          <div className="section-icon" style={{ backgroundColor: section.color }}>
            <Icon color="white" size={24} />
          </div>
          <div className="section-title">
            <h3>{section.title}</h3>
            <p>{section.description}</p>
          </div>
        </div>
        
        
      </div>
      
      <AnimatePresence>
        {isExpanded && (
          <motion.div 
            className="section-content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="questions-grid p-2">
              {questions.map(question => (
                <div 
                  key={question.IDQuestion} 
                  className={`question-card ${
                    question.Required ? 
                      (isFieldCompleted(formData[question.IDQuestion]) ? 'required-answered' : 'required-unanswered') 
                      : ''
                  }`}
                >
                  <div className="question-content p-2">
                    <div className="form-group">
                      <label htmlFor={`question-${question.IDQuestion}`}>
                        {question.Description}
                        {question.Required && <span className="required-mark">*</span>}
                      </label>
                      {question.Comment && (
                        <small className="form-text text-muted">{question.Comment}</small>
                      )}
                      {renderField(question)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default FormSection;