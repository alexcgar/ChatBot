import React, { useState } from 'react';
import './FormularioManual.css';

const FormSection = ({
  section,
  questions,
  formData,
  renderField,
  isFieldCompleted,
  autocompletados = [],
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  // Calcular cuántas preguntas están completadas
  const completedQuestions = questions.filter(q => {
    const value = formData[q.IDQuestion];
    return isFieldCompleted(value);
  }).length;

  return (
    <div className={`form-section ${isExpanded ? 'expanded' : 'collapsed'}`}>
      <div
        className="section-header"
        onClick={() => setIsExpanded(!isExpanded)}
        style={{ background: `linear-gradient(135deg, ${section.color}40, ${section.color}20)` }}
      >
        <div className="section-header-left">
          <div className="section-icon" style={{ backgroundColor: section.color }}>
            <section.icon color="white" size={24} />
          </div>
          <div className="section-title">
            <h3>{section.title}</h3>
            <p>{section.description}</p>
          </div>
        </div>
        <div className="section-info">
          <div className="completion-info">
            {completedQuestions} / {questions.length}
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className="form-section-content">
          {questions.map(question => {
            const questionId = question.IDQuestion;
            const value = formData[questionId];
            const isCompleted = isFieldCompleted(value);
            const isAutoCompleted = autocompletados.includes(questionId);

            return (
              <div
                key={questionId}
                className={`form-field-container ${isCompleted ? 'field-completed' : 'field-pending'}`}
              >
                <label
                  htmlFor={`question-${questionId}`}
                  className="form-label"
                >
                  {question.Description}
                  {isAutoCompleted && <span className="auto-badge">Auto</span>}
                </label>
                {renderField(question)}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default FormSection;