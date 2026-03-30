import React, { useEffect, useRef, useState } from 'react';
import {
  Play,
  Pencil,
  BookOpen,
  ChevronDown,
  Rocket,
  FlaskConical,
  SlidersHorizontal,
  FileText,
  Eye,
  EyeOff,
} from 'lucide-react';
import BaseButton from '../BaseButton.jsx';

export default function ApiDashboardActionBar({
  testMode,
  running,
  inCooldown,
  loadingDefaultConfig,
  loadingDatasheet,
  showDatasheet,
  onToggleMode,
  onToggleDatasheet,
  onRun,
  onConfigure,
  isDummyTemplate,
  simulationOnly,
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
          size="sm"
          onClick={onToggleMode}
          disabled={running || isDummyTemplate || simulationOnly}
          tooltip={
            isDummyTemplate
              ? 'Las APIs Dummy siempre usan modo simulado'
              : simulationOnly
                ? 'Modo simulado global activo: no se envian peticiones reales'
              : testMode === 'real'
                ? 'Cambiar a modo simulado (sin peticiones reales)'
                : 'Cambiar a modo real (envía peticiones a la API)'
          }
        >
          {testMode === 'real' ? <Rocket size={16} /> : <FlaskConical size={16} />}
          {isDummyTemplate
            ? 'Simulado (Dummy)'
            : simulationOnly
              ? 'Simulado (Global)'
            : testMode === 'real'
              ? 'Real'
              : 'Simulado'}
        </BaseButton>

        <BaseButton
          variant="primary"
          size="sm"
          onClick={() => {
            setOpenMenu(false);
            onRun();
          }}
          disabled={running || inCooldown}
          aria-haspopup="menu"
          aria-expanded={openMenu}
          tooltip={
            inCooldown
              ? 'Esperando fin del periodo de cooldown tras un error 4XX'
              : running
                ? 'Test en ejecución'
                : 'Lanzar un test manual con la configuración actual'
          }
        >
          <Play size={16} />
          {running
            ? 'Ejecutando...'
            : inCooldown
              ? 'Cooldown Activo'
              : 'Test Manual'}
        </BaseButton>

        <BaseButton
          variant="secondary"
          size="sm"
          onClick={() => {
            setOpenMenu(false);
            onConfigure();
          }}
          disabled={running}
          aria-haspopup="menu"
          aria-expanded={openMenu}
          tooltip="Ajustar parámetros del test manual (peticiones, pacing, rate control…)"
        >
          <SlidersHorizontal size={16} />
          {running ? 'Configurando...' : 'Configurar Test Manual'}
        </BaseButton>

        <BaseButton
          variant="secondary"
          size="sm"
          onClick={onToggleDatasheet}
          disabled={loadingDatasheet}
          tooltip={showDatasheet ? 'Ocultar la hoja de datos de la API' : 'Mostrar la hoja de datos con todos los endpoints y parámetros'}
        >
          {showDatasheet ? (
            <>
              <EyeOff size={16} /> Ocultar Datasheet
            </>
          ) : (
            <>
              <Eye size={16} /> Ver Datasheet
            </>
          )}
        </BaseButton>
      </div>
    </div>
  );
}
