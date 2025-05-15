import React, { useState, useRef } from 'react';
import { FaArrowUp } from 'react-icons/fa';
import './FormularioManual.css';

const FormLayout = ({ sections, formData, activeSection, setActiveSection, children }) => {
  const contentRef = useRef(null);
  const [showScrollButton, setShowScrollButton] = useState(false);

  // Track scroll position to show/hide the scroll button
  const handleScroll = () => {
    if (contentRef.current) {
      setShowScrollButton(contentRef.current.scrollTop > 300);
    }
  };

  // Scroll to top function
  const scrollToTop = () => {
    if (contentRef.current) {
      contentRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div className="form-layout">
      <div className="form-sidebar">
        {sections.map(section => (
          <div 
            key={section.id}
            className={`sidebar-item ${activeSection === section.id ? 'active' : ''}`}
            onClick={() => setActiveSection(section.id)}
            style={{ borderLeft: `4px solid ${section.color}` }}
          >
            <div className="sidebar-icon" style={{ backgroundColor: section.color }}>
              <section.icon color="white" size={20} />
            </div>
            <div className="sidebar-text">
              <h4>{section.title}</h4>
            </div>
          </div>
        ))}
      </div>
      
      <div 
        className="form-content"
        ref={contentRef}
        onScroll={handleScroll}
      >
        {children}
        
        {showScrollButton && (
          <button 
            className="scroll-to-top-button"
            onClick={scrollToTop}
            aria-label="Volver arriba"
          >
            <FaArrowUp />
          </button>
        )}
      </div>
    </div>
  );
};

export default FormLayout;