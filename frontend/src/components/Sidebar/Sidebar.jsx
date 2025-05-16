import React, { useState, useEffect } from 'react';
import './Sidebar.css';
import { 
  FaTelegram, FaWarehouse, FaShieldAlt, FaWater, FaTint, FaArchway, FaWind, 
  FaFilter, FaFlask, FaTractor, FaSeedling, FaLeaf, FaChevronLeft, FaChevronRight
} from 'react-icons/fa';
import { formSections } from '../FormularioManual/sectionConfig';

const Sidebar = ({ 
  isOpen, 
  toggleSidebar, 
  selectedSectionId, 
  setSelectedSectionId, 
  sectionStatuses, 
  handleSectionStatusChange 
}) => {
  const [hoverSection, setHoverSection] = useState(null);
  
  // Effect for animations when sidebar state changes
  useEffect(() => {
    const sidebar = document.querySelector('.sidebar');
    
    if (sidebar) {
      if (isOpen) {
        sidebar.classList.add('sidebar-entering');
        setTimeout(() => {
          sidebar.classList.remove('sidebar-entering');
        }, 300);
      } else {
        sidebar.classList.add('sidebar-exiting');
        setTimeout(() => {
          sidebar.classList.remove('sidebar-exiting');
        }, 300);
      }
    }
  }, [isOpen]);

  // Get section completion status
  const getSectionStatus = (sectionId) => {
    const status = sectionStatuses[sectionId];
    if (status === 'yes') return 'completed';
    if (status === 'no') return 'skipped';
    return 'pending';
  };

  return (
    <>
      <div className={`sidebar-overlay ${isOpen ? 'active' : ''}`} onClick={toggleSidebar}></div>
      
      <aside className={`sidebar ${isOpen ? 'expanded' : 'collapsed'}`}>
        <div className="sidebar-header">
          <h3>Secciones del Formulario</h3>
          <button className="collapse-button" onClick={toggleSidebar} aria-label="Toggle Sidebar">
            {isOpen ? <FaChevronLeft /> : <FaChevronRight />}
          </button>
        </div>
        
        <div className="sidebar-content">
          <ul className="sidebar-menu">
            {formSections.map((section) => {
              const Icon = section.icon;
              const status = getSectionStatus(section.id);
              
              return (
                <li 
                  key={section.id}
                  className={`sidebar-item ${selectedSectionId === section.id ? 'active' : ''} status-${status}`}
                  onClick={() => setSelectedSectionId(section.id)}
                  onMouseEnter={() => setHoverSection(section.id)}
                  onMouseLeave={() => setHoverSection(null)}
                >
                  <div className="sidebar-item-content">
                    <span className="sidebar-icon">
                      <Icon />
                    </span>
                    <span className="sidebar-label">{section.title}</span>
                  </div>
                  
                  {(isOpen || hoverSection === section.id) && (
                    <div className="sidebar-actions">
                      <button 
                        className={`action-btn ${status === 'completed' ? 'active' : ''}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSectionStatusChange(section.id, 'yes');
                        }}
                        disabled={false}
                      >
                        Sí
                      </button>
                      <button 
                        className={`action-btn ${status === 'skipped' ? 'active' : ''}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSectionStatusChange(section.id, 'no');
                        }}
                        disabled={section.id === 'datos-generales'}
                      >
                        No
                      </button>
                    </div>
                  )}
                  
                  <div className={`status-indicator ${status}`}></div>
                </li>
              );
            })}
          </ul>
        </div>
        
        <div className="sidebar-footer">
          <div className="completion-status">
            <div className="completion-progress">
              <div className="progress-bar">
                <div 
                  className="progress-fill" 
                  style={{ 
                    width: `${Object.values(sectionStatuses).filter(status => status === 'yes' || status === 'no').length / formSections.length * 100}%` 
                  }}
                ></div>
              </div>
              <div className="progress-text">
                {Math.round(Object.values(sectionStatuses).filter(status => status === 'yes' || status === 'no').length / formSections.length * 100)}% Completado
              </div>
            </div>
          </div>
        </div>
      </aside>
      
      {!isOpen && (
        <div className="mini-sidebar">
          <ul className="mini-sidebar-menu">
            {formSections.map((section) => {
              const Icon = section.icon;
              const status = getSectionStatus(section.id);
              
              return (
                <li 
                  key={section.id}
                  className={`mini-sidebar-item ${selectedSectionId === section.id ? 'active' : ''} status-${status}`}
                  onClick={() => setSelectedSectionId(section.id)}
                  title={section.title}
                >
                  <span className="mini-sidebar-icon">
                    <Icon />
                  </span>
                  <div className={`status-dot ${status}`}></div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </>
  );
};

export default Sidebar; 