import React, { useState } from 'react';
import { Menu, X, LayoutDashboard, FileText } from 'lucide-react';

export default function Sidebar({ currentPage, onNavigate, isOpen, onToggle }) {
  const logo = '/logoisa.svg';
  const navItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
    },
    {
      id: 'test-logs',
      label: 'Test Logs',
      icon: FileText,
    },
  ];

  return (
    <>
      {/* Mobile toggle button */}
      <button
        onClick={onToggle}
        className="sidebar-toggle"
        aria-label="Toggle sidebar"
      >
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => onToggle()}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`sidebar ${isOpen ? 'sidebar-open' : 'sidebar-closed'}`}
      >
        {/* Logo section */}
        <div className="sidebar-header">
          <button
            onClick={() => onToggle()}
            className="sidebar-logo-btn"
            aria-label="Toggle sidebar"
            title="Click to collapse"
          >
            <div className="sidebar-logo">
              <img src={logo} alt="Logo" className="sidebar-logo-img" />
            </div>
          </button>
          {isOpen && <span className="sidebar-logo-text">API Tester</span>}
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
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
                title={item.label}
              >
                <Icon size={20} className="sidebar-nav-icon" />
                <span className={`sidebar-nav-label ${!isOpen ? 'hidden' : ''}`}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="sidebar-footer">
          <p className={`sidebar-version ${!isOpen ? 'hidden' : ''}`}>
            v1.0.0
          </p>
        </div>
      </aside>
    </>
  );
}
