import React, { useState } from 'react';
import { Menu, X, FileText, FolderOpen, FolderTree } from 'lucide-react';
import Tooltip from '../Tooltip.jsx';

export default function Sidebar({ currentPage, onNavigate, isOpen, onToggle }) {
  const logo = '/score-favicon-white.png';
  const navItems = [
    {
      id: 'dashboard',
      label: 'APIs',
      icon: FolderOpen,
    },
    {
      id: 'collections',
      label: 'Colecciones',
      icon: FolderTree,
    },
    {
      id: 'test-logs',
      label: 'Registros de pruebas',
      icon: FileText,
    },
  ];

  return (
    <>
      {/* Mobile toggle button */}
      <button onClick={onToggle} className="sidebar-toggle" aria-label="Alternar barra lateral">
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Overlay for mobile */}
      {isOpen && <div className="sidebar-overlay" onClick={() => onToggle()} />}

      {/* Sidebar */}
      <aside className={`sidebar ${isOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
        {/* Logo section */}
        <div className="sidebar-header">
          <Tooltip text="Haz clic para contraer" placement="right">
            <button
              onClick={() => onToggle()}
              className="sidebar-logo-btn"
              aria-label="Alternar barra lateral"
            >
              <div className="sidebar-logo">
                <img src={logo} alt="Logo" className="sidebar-logo-img" />
              </div>
            </button>
          </Tooltip>
          {isOpen && <span className="sidebar-logo-text">API Showcase</span>}
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Tooltip key={item.id} text={item.label} placement="right">
                <button
                  onClick={() => {
                    onNavigate(item.id);
                    // Close sidebar on mobile after navigation
                    if (window.innerWidth < 768) {
                      onToggle();
                    }
                  }}
                  className={`sidebar-nav-item ${
                    currentPage === item.id ? 'sidebar-nav-item-active' : ''
                  }`}
                >
                  <Icon size={20} className="sidebar-nav-icon" />
                  <span className={`sidebar-nav-label ${!isOpen ? 'hidden' : ''}`}>{item.label}</span>
                </button>
              </Tooltip>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="sidebar-footer">
          <p className={`sidebar-version ${!isOpen ? 'hidden' : ''}`}>v1.0.0</p>
        </div>
      </aside>
    </>
  );
}
