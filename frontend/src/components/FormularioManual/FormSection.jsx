import React, { useState } from 'react';
// eslint-disable-next-line no-unused-vars
import { AnimatePresence, motion } from 'framer-motion';

const FormSection = ({ 
  section, 
  questions, 
  formData, 
  renderField,
  isFieldCompleted,
  autocompletados = [],
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
              {questions.map(question => {
                const isCompleted = isFieldCompleted(formData[question.IDQuestion]);
                const isRequired = question.Required === true;
                const isAutocompletado = autocompletados.includes(question.IDQuestion);
                
                // Determinar las clases a aplicar
                let questionClasses = [];
                
                if (isRequired) {
                  questionClasses.push(isCompleted ? 'required-answered' : 'required-unanswered');
                }
                
                if (isAutocompletado) {
                  questionClasses.push('autocompletado');
                }
                
                return (
                  <div 
                    key={question.IDQuestion} 
                    className={`question-card ${questionClasses.join(' ')}`}
                  >
                    <div className="question-content p-2">
                      <div className="form-group">
                        <label htmlFor={`question-${question.IDQuestion}`}>
                          {question.Description}
                          {isRequired && <span className="required-mark">*</span>}
                          {isAutocompletado && <span className="autocompletado-mark"> (Auto)</span>}
                        </label>
                        {question.Comment && (
                          <small className="form-text text-muted">{question.Comment}</small>
                        )}
                        {renderField(question)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default FormSection;