import React, { useEffect, useRef, useState } from 'react';
import { Play, Pencil, BookOpen, ChevronDown, Rocket, FlaskConical, SlidersHorizontal, FileText, Eye, EyeOff } from 'lucide-react';
import BaseButton from '../BaseButton.jsx';

export default function ApiDashboardActionBar({
  testMode,
  running,
  loadingDefaultConfig,
  loadingDatasheet,
  showDatasheet,
  onToggleMode,
  onToggleDatasheet,
  onRun,
  onConfigure,
}) {
  const [openMenu, setOpenMenu] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpenMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="action-bar">
      <div className="flex flex-wrap gap-2">
        <BaseButton
          variant={testMode === 'simulated' ? 'background' : 'primary'}
          size="md"
          onClick={onToggleMode}
          disabled={running}
        >
          {testMode === 'real' ? <Rocket size={16} /> : <FlaskConical size={16} />}
          {testMode === 'real' ? 'Modo Real' : 'Modo Simulado'}
        </BaseButton>

        <div className="relative" ref={menuRef}>
          <BaseButton
            variant="primary"
            size="md"
            onClick={() => setOpenMenu((prev) => !prev)}
            disabled={running}
            aria-haspopup="menu"
            aria-expanded={openMenu}
          >
            <Play size={16} />
            {running ? 'Ejecutando...' : 'Test Manual'}
            <ChevronDown size={14} />
          </BaseButton>

          {openMenu && (
            <div className="absolute right-0 z-30 mt-2 w-56 rounded-lg border border-secondary-lighter bg-primary shadow-lg">
              <button
                type="button"
                onClick={() => {
                  setOpenMenu(false);
                  onRun();
                }}
                className="w-full px-3 py-2 text-left text-sm text-text hover:bg-secondary/20 disabled:opacity-50"
                disabled={running || loadingDefaultConfig}
              >
                <span className="inline-flex items-center gap-2">
                  <Play size={14} />
                  Test Rapido
                </span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setOpenMenu(false);
                  onConfigure();
                }}
                className="w-full px-3 py-2 text-left text-sm text-text hover:bg-secondary/20"
                disabled={running}
              >
                <span className="inline-flex items-center gap-2">
                  <SlidersHorizontal size={14} />
                  Configurar Test
                </span>
              </button>
            </div>
          )}
        </div>

        <BaseButton
          variant="secondary"
          size="md"
          onClick={onToggleDatasheet}
          disabled={loadingDatasheet}
        >
          
          {showDatasheet ? <><EyeOff size={16} /> Ocultar Datasheet</> : <><Eye size={16} /> Ver Datasheet</>}
        </BaseButton>

      </div>
    </div>
  );
}
