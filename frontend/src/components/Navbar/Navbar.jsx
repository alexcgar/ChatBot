import React, { useState, useEffect } from 'react';
import './Navbar.css';
import logo from '../../assets/novaLogo.png';
import { FaBars, FaUserCircle, FaQuestion, FaBell } from 'react-icons/fa';

const Navbar = ({ toggleSidebar, className = '' }) => {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timeInterval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute

    return () => {
      clearInterval(timeInterval);
    };
  }, []);

  const formatTime = (date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (date) => {
    return date.toLocaleDateString([], { 
      weekday: 'long', 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    });
  };

  return (
    <nav className={`navbar ${className}`}>
      <div className="navbar-container">
        <div className="navbar-left">
          <button className="sidebar-toggle" onClick={toggleSidebar} aria-label="Toggle Sidebar">
            <FaBars />
          </button>
          <div className="logo-container">
            <img src={logo} alt="Novagric" className="navbar-logo" />
          </div>
        </div>
        
        <div className="navbar-center">
          <div className="navbar-title"></div>
          <div className="navbar-subtitle">
            <div className="navbar-date">{formatDate(currentTime)}</div>
            <div className="navbar-time">{formatTime(currentTime)}</div>
          </div>
        </div>

        <div className="navbar-right">
          <button className="navbar-icon-button" aria-label="Help">
            <FaQuestion />
          </button>
          <button className="navbar-icon-button" aria-label="Notifications">
            <FaBell />
            <span className="notification-badge">2</span>
          </button>
          <div className="navbar-user">
            <FaUserCircle className="user-avatar" />
            <span className="user-name">Usuario</span>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar; 