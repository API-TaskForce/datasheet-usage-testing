import React from 'react';
import BaseCard from '../BaseCard.jsx';
import BasicButton from '../BaseButton.jsx';
import BaseButton from '../BaseButton.jsx';

export default function DummyApiControlPanel({
  values,
  onChange,
  disabled,
  onApplyPreset,
  onSave,
  saving,
}) {
  if (!values) {
    return null;
  }

  const change =
    (key, parser = (v) => v) =>
    (e) => {
      onChange?.(key, parser(e.target.value));
    };

  const toInt = (v) => {
    const n = parseInt(v, 10);
    return Number.isFinite(n) ? n : 0;
  };

  return (
    <BaseCard className="mb-4">
      <div className="p-2">
        <div className="flex flex-col items-start gap-1 mb-4 py-2 border-b border-border">
          <h3 className="text-sm font-bold">Panel de Control</h3>
          <span className="text-sm text-muted">Solo disponible para APIs Dummy</span>
        </div>
        <p className="text-xs text-muted">
          Configura limites y comportamiento de ventana del mock en tiempo real para validar tests y
          graficas.
        </p>
      </div>
      <div className="flex flex-row justify-between items-center p-2">
        <p className="text-text font-bold">Controles principales</p>
        <div className="flex flex-row items-center gap-2">
          <BaseButton
            variant="secondary"
            size="sm"
            onClick={() => onApplyPreset?.('normal')}
            disabled={disabled}
          >
            Normal
          </BaseButton>
          <BaseButton
            variant="secondary"
            size="sm"
            onClick={() => onApplyPreset?.('stress')}
            disabled={disabled}
          >
            Stress
          </BaseButton>
          <BaseButton
            variant="secondary"
            size="sm"
            onClick={() => onApplyPreset?.('recovery')}
            disabled={disabled}
          >
            Recovery
          </BaseButton>
        </div>
      </div>
      <div className="expandible-content">
        <div className="p-2 grid grid-cols-1 md:grid-cols-3 gap-3">
          <label className="flex flex-col gap-1 text-xs">
            <span>Limite rate (rpm)</span>
            <input
              type="number"
              min="1"
              value={values.rateMax}
              onChange={change('rateMax', toInt)}
              disabled={disabled}
              className="form-input"
            />
          </label>

          <label className="flex flex-col gap-1 text-xs">
            <span>Limite quota</span>
            <input
              type="number"
              min="1"
              value={values.quotaMax}
              onChange={change('quotaMax', toInt)}
              disabled={disabled}
              className="form-input"
            />
          </label>

          <label className="flex flex-col gap-1 text-xs">
            <span>Tipo de ventana</span>
            <select
              value={values.windowModel}
              onChange={change('windowModel')}
              disabled={disabled}
              className="form-select"
            >
              <option value="FIXED_WINDOW">FIXED_WINDOW</option>
              <option value="SLIDING_WINDOW">SLIDING_WINDOW</option>
            </select>
          </label>
        </div>

        <div className="flex flex-row justify-between items-center p-2">
          <p className="text-text font-bold">Parametros extra</p>
        </div>

        <div className="px-2 pb-2 grid grid-cols-1 md:grid-cols-3 gap-3">
          <label className="flex flex-col gap-1 text-xs">
            <span>Cooldown (s)</span>
            <input
              type="number"
              min="1"
              value={values.cooldownSeconds}
              onChange={change('cooldownSeconds', toInt)}
              disabled={disabled}
              className="form-input"
            />
          </label>

          <label className="flex flex-col gap-1 text-xs">
            <span>Ventana (s)</span>
            <input
              type="number"
              min="1"
              value={values.windowSeconds}
              onChange={change('windowSeconds', toInt)}
              disabled={disabled}
              className="form-input"
            />
          </label>

          <label className="flex flex-col gap-1 text-xs">
            <span>Total requests por test</span>
            <input
              type="number"
              min="1"
              value={values.totalRequests}
              onChange={change('totalRequests', toInt)}
              disabled={disabled}
              className="form-input"
            />
          </label>
        </div>
      </div>

      <div className="mt-2 p-2 flex justify-end">
        <BaseButton
          type="button"
          variant="primary"
          size="sm"
          disabled={disabled || saving}
          onClick={() => onSave?.()}
        >
          {saving ? 'Guardando...' : 'Aplicar'}
        </BaseButton>
      </div>
    </BaseCard>
  );
}
