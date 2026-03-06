import React from 'react';
import { CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';

export function RealTimePanel({ liveResults }) {
  return (
    <div className="space-y-2 max-h-96 overflow-auto">
      {liveResults.length === 0 && (
        <p className="text-sm text-slate-400">No hay datos en tiempo real.</p>
      )}
      {liveResults
        .slice()
        .reverse()
        .map((r, idx) => (
          <div
            key={`${r.timestamp}-${idx}`}
            className="flex flex-col p-2 border-b border-secondary-lighter flex justify-between items-start gap-2"
          >
            <div className="flex flex-row justify-start justify-center items-center gap-6">
              <p
                className={`font-bold uppercase ${
                  r.status === 'ok'
                    ? 'text-emerald-500'
                    : r.status === 'rate_limited'
                      ? 'text-amber-500'
                      : 'text-rose-500'
                }`}
              >
                {r.statusCode} {r.status}
              </p>
              <p className="font-mono text-xs text-text">
                Fecha de Ejecucion: {new Date(r.timestamp).toLocaleTimeString()}
              </p>
              <p className="text-xs text-muted">{r.durationMs}ms</p>
            </div>

            <div className="flex w-full flex-row items-center align-center gap-4">
              <p className="badge badge-bg">{r.request?.method || r.method || 'GET'}</p>
              <p className="text-muted font-mono tex-xs">{r.request?.url || r.url || ''}</p>
            </div>
            <div className="flex flex-col gap-1 w-full">
              <div className="flex flex-col gap-1 w-full">
                <p className="text-text font-bold">Respuesta</p>
                <p className="code-block">
                  {r.response && r.response.body
                    ? typeof r.response.body === 'string'
                      ? r.response.body.slice(0, 200)
                      : JSON.stringify(r.response.body).slice(0, 200)
                    : ''}
                </p>
              </div>
            </div>
          </div>
        ))}
    </div>
  );
}

export function SimpleRealTimePanel({ liveResults }) {
  return (
    <div className="space-y-3 max-h-96 overflow-auto">
      {liveResults.length === 0 && (
        <div className="text-center py-12">
          <p className="text-sm text-slate-400">No hay datos en tiempo real.</p>
          <p className="text-xs text-slate-500 mt-2">Ejecuta un test para ver las peticiones</p>
        </div>
      )}
      {liveResults
        .slice()
        .reverse()
        .map((r, idx) => {
          const isSuccess = r.status === 'ok';
          const isRateLimited = r.status === 'rate_limited';
          const isError = r.status === 'error';

          return (
            <div
              key={`${r.timestamp}-${idx}`}
              className="p-3 border border-border shadow-md rounded-lg flex items-center justify-between gap-3 transition-colors hover:bg-secondary/10"
            >
              <div className="flex items-center gap-3 flex-1">
                {isSuccess && <CheckCircle2 size={24} className="text-emerald-500 flex-shrink-0" />}
                {isRateLimited && (
                  <AlertTriangle size={24} className="text-amber-500 flex-shrink-0" />
                )}
                {isError && <XCircle size={24} className="text-rose-500 flex-shrink-0" />}
                <p
                  className={`uppercase text-lg font-bold ${
                    isSuccess
                      ? 'text-emerald-500'
                      : isRateLimited
                        ? 'text-amber-500'
                        : 'text-rose-500'
                  }`}
                >
                  {isSuccess ? 'OK' : isRateLimited ? 'Rate Limit' : 'Error'}
                </p>
                <div className="flex-1">
                  <p className="text-xs text-slate-400">
                    {new Date(r.timestamp).toLocaleTimeString('es-ES', {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    })}
                  </p>
                  <p className="text-sm font-semibold text-text">
                    {r.request?.method || r.method || 'GET'} · {r.durationMs}ms
                  </p>
                </div>
              </div>
            </div>
          );
        })}
    </div>
  );
}
