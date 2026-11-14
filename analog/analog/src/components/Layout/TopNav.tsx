import React from 'react';
import { NavLink } from 'react-router-dom';

export const TopNav: React.FC = () => (
  <header className="top-nav">
    <a href="#main-content" className="skip-link">Skip to main content</a>
    <div className="top-nav-inner">
      <NavLink to="/" className="brand-link" aria-label="Astraterra Analog, overview">
        <span className="brand-mark" aria-hidden="true"><span /></span>
        <span>ASTRATERRA <strong>ANALOG</strong></span>
      </NavLink>
      <nav className="nav-links" aria-label="Primary navigation">
        <NavLink to="/" end className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>Overview</NavLink>
        <NavLink to="/explore" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>Explore</NavLink>
        <NavLink to="/research" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>Research</NavLink>
        <NavLink to="/learn" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>Learn</NavLink>
      </nav>
    </div>
  </header>
);
