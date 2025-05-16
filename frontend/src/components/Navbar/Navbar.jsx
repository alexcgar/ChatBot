import React, { useState, useEffect } from 'react';
import './Navbar.css';
import logo from '../../assets/logo.svg';
import { FaBars, FaUserCircle, FaQuestion, FaBell } from 'react-icons/fa';

const Navbar = ({ toggleSidebar }) => {
  const [scrolled, setScrolled] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 10) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };

    const timeInterval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute

    window.addEventListener('scroll', handleScroll);
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
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
    <nav className={`navbar ${scrolled ? 'navbar-scrolled' : ''}`}>
      <div className="navbar-container ">
        <div className="navbar-left ">
          <button className="sidebar-toggle" onClick={toggleSidebar} aria-label="Toggle Sidebar">
            <FaBars />
          </button>
          <div className="logo-container">
            <img src={logo} alt="Novagric" className="navbar-logo" />
          </div>
        </div>
        
        <div className="navbar-center">
          <div className="navbar-title">Hoja de Toma de Datos</div>
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