import React, { useState, useEffect } from 'react';
import './FormSection.css';
// eslint-disable-next-line no-unused-vars
import { motion } from 'framer-motion';
import { FaInfoCircle, FaCheckCircle, FaExclamationCircle, FaRegLightbulb } from 'react-icons/fa';

const FormSection = ({ questions, formData, renderField, isFieldCompleted, autocompletados }) => {
  const [showTooltip, setShowTooltip] = useState(null);
  const [completedCount, setCompletedCount] = useState(0);

  useEffect(() => {
    // Calculate completed fields
    let completed = 0;

    questions.forEach(question => {
      if (isFieldCompleted(formData[question.IDQuestion])) {
        completed++;
      }
    });

    setCompletedCount(completed);
  }, [questions, formData, isFieldCompleted]);

  // Calculate completion percentage
  const totalQuestions = questions.length;
  const completionPercentage = totalQuestions > 0 ? Math.round((completedCount / totalQuestions) * 100) : 0;

  // Variants for animations
  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { 
        duration: 0.5,
        when: "beforeChildren",
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: { 
      opacity: 1, 
      x: 0,
      transition: { duration: 0.3 }
    }
  };

  return (
    <motion.div 
      className="form-section-container"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      <div className="section-info">
        <div className="section-progress">
          <div className="progress-indicator">
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ width: `${completionPercentage}%` }}
              ></div>
            </div>
          </div>
        </div>
        
        {autocompletados.some(id => questions.some(q => q.IDQuestion === id)) && (
          <div className="autocompletados-badge">
            <FaRegLightbulb /> Algunos campos fueron autocompletados por el asistente
          </div>
        )}
      </div>

      <div className="question-fields">
        {questions.map((question) => {
          const questionId = question.IDQuestion;
          const isCompleted = isFieldCompleted(formData[questionId]);
          const isRequired = question.Required;
          const isAutoCompleted = autocompletados.includes(questionId);
          
          return (
            <motion.div 
              key={questionId}
              className={`question-card ${isCompleted ? 'completed' : ''} ${isRequired && !isCompleted ? 'required' : ''} ${isAutoCompleted ? 'autocompleted' : ''}`}
              variants={itemVariants}
            >
              <div className="question-header">
                <label htmlFor={`question-${questionId}`} className="question-label">
                  {question.Description}
                  {isRequired && <span className="required-mark">*</span>}
                  {isAutoCompleted && <span className="auto-badge">Auto</span>}
                </label>
                
                {question.Comment && (
                  <div className="question-tooltip-container">
                    <button 
                      type="button" 
                      className="tooltip-button"
                      onClick={() => setShowTooltip(showTooltip === questionId ? null : questionId)}
                      aria-label="Ver ayuda"
                    >
                      <FaInfoCircle />
                    </button>
                    
                    {showTooltip === questionId && (
                      <div className="question-tooltip">
                        {question.Comment}
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              <div className="question-input">
                {renderField(question)}
                
                {isCompleted && (
                  <div className="completion-indicator">
                    <FaCheckCircle />
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
};

export default FormSection; 