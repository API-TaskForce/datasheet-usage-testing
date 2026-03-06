import React from 'react';
import { Clock, AlertTriangle, CheckCircle, Info } from 'lucide-react';

/**
 * Componente para mostrar información de rate limiting detectada automáticamente
 * de las respuestas de APIs
 * 
 * @param {Object} rateLimit - Información de rate limit del backend (resultado de detectRateLimitInfo)
 * @param {boolean} compact - Modo compacto (solo información esencial)
 */
export default function RateLimitInfo({ rateLimit, compact = false }) {
  if (!rateLimit || !rateLimit.detected) {
    return null;
  }

  // Determinar estado basado en remaining
  const getStatus = () => {
    if (rateLimit.retryAfter) return 'blocked';
    if (rateLimit.remaining === 0) return 'exhausted';
    if (rateLimit.remaining && rateLimit.limit) {
      const percentage = (rateLimit.remaining / rateLimit.limit) * 100;
      if (percentage <= 10) return 'critical';
      if (percentage <= 30) return 'warning';
      return 'ok';
    }
    return 'info';
  };

  const status = getStatus();

  // Colores según estado
  const statusColors = {
    ok: 'text-green-600 bg-green-50 border-green-200',
    warning: 'text-yellow-600 bg-yellow-50 border-yellow-200',
    critical: 'text-orange-600 bg-orange-50 border-orange-200',
    exhausted: 'text-red-600 bg-red-50 border-red-200',
    blocked: 'text-red-600 bg-red-50 border-red-200',
    info: 'text-blue-600 bg-blue-50 border-blue-200',
  };

  const statusIcons = {
    ok: <CheckCircle size={16} />,
    warning: <AlertTriangle size={16} />,
    critical: <AlertTriangle size={16} />,
    exhausted: <AlertTriangle size={16} />,
    blocked: <AlertTriangle size={16} />,
    info: <Info size={16} />,
  };

  // Formatear tiempo restante
  const formatTime = (seconds) => {
    if (!seconds) return null;
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
    return `${Math.floor(seconds / 86400)}d`;
  };

  // Modo compacto: solo una línea
  if (compact) {
    return (
      <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium border ${statusColors[status]}`}>
        {statusIcons[status]}
        {rateLimit.remaining !== null && rateLimit.limit !== null && (
          <span>{rateLimit.remaining}/{rateLimit.limit}</span>
        )}
        {rateLimit.retryAfter && (
          <span>⏳ {formatTime(rateLimit.retryAfter)}</span>
        )}
        {rateLimit.resetIn && !rateLimit.retryAfter && (
          <span>↻ {formatTime(rateLimit.resetIn)}</span>
        )}
      </div>
    );
  }

  // Modo completo: panel detallado
  return (
    <div className={`border rounded-lg p-4 ${statusColors[status]}`}>
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-1">
          {statusIcons[status]}
        </div>

        <div className="flex-1 space-y-2">
          {/* Título con estado */}
          <div className="font-bold text-sm">
            {status === 'blocked' && 'Rate Limit: Bloqueado'}
            {status === 'exhausted' && 'Rate Limit: Cuota Agotada'}
            {status === 'critical' && 'Rate Limit: Nivel Crítico'}
            {status === 'warning' && 'Rate Limit: Precaución'}
            {status === 'ok' && 'Rate Limit: Normal'}
            {status === 'info' && 'Rate Limit Info'}
          </div>

          {/* Información de peticiones */}
          {rateLimit.remaining !== null && rateLimit.limit !== null && (
            <div className="text-sm">
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium">Peticiones restantes:</span>
                <span className="font-bold">{rateLimit.remaining} / {rateLimit.limit}</span>
              </div>
              <div className="w-full bg-white/50 rounded-full h-2 overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${
                    status === 'ok' ? 'bg-green-500' :
                    status === 'warning' ? 'bg-yellow-500' :
                    status === 'critical' ? 'bg-orange-500' :
                    'bg-red-500'
                  }`}
                  style={{ width: `${(rateLimit.remaining / rateLimit.limit) * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* Peticiones usadas */}
          {rateLimit.used !== null && (
            <div className="text-xs">
              <span className="opacity-75">Usadas: </span>
              <span className="font-medium">{rateLimit.used}</span>
            </div>
          )}

          {/* Tiempo de retry (si está bloqueado) */}
          {rateLimit.retryAfter && (
            <div className="flex items-center gap-2 text-sm bg-white/30 rounded px-2 py-1">
              <Clock size={14} />
              <span className="font-medium">
                Reintentar en: {formatTime(rateLimit.retryAfter)}
              </span>
              {rateLimit.retryAfterDate && (
                <span className="text-xs opacity-75">
                  ({new Date(rateLimit.retryAfterDate).toLocaleTimeString()})
                </span>
              )}
            </div>
          )}

          {/* Tiempo hasta reset */}
          {rateLimit.resetIn && !rateLimit.retryAfter && (
            <div className="flex items-center gap-2 text-xs">
              <Clock size={12} />
              <span>
                Se resetea en: <span className="font-medium">{formatTime(rateLimit.resetIn)}</span>
              </span>
              {rateLimit.resetDate && (
                <span className="opacity-75">
                  ({new Date(rateLimit.resetDate).toLocaleTimeString()})
                </span>
              )}
            </div>
          )}

          {/* Ventana de tiempo */}
          {rateLimit.window && (
            <div className="text-xs opacity-75">
              Período: {formatTime(rateLimit.window)}
            </div>
          )}

          {/* Política */}
          {rateLimit.policy && (
            <div className="text-xs bg-white/30 rounded px-2 py-1">
              <span className="opacity-75">Política: </span>
              <span className="font-medium font-mono">{rateLimit.policy}</span>
            </div>
          )}

          {/* Scope */}
          {rateLimit.scope && (
            <div className="text-xs opacity-75">
              Ámbito: <span className="font-medium">{rateLimit.scope}</span>
            </div>
          )}

          {/* Recomendación según estado */}
          {status === 'critical' && (
            <div className="text-xs italic opacity-90">
              ⚠️ Recomendación: Reducir frecuencia de peticiones
            </div>
          )}
          {status === 'blocked' && (
            <div className="text-xs italic opacity-90">
              🚫 Bloqueado: Esperar antes de reintentar para evitar incremento del cooldown
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Variant compacto como badge inline
 */
export function RateLimitBadge({ rateLimit }) {
  return <RateLimitInfo rateLimit={rateLimit} compact={true} />;
}
