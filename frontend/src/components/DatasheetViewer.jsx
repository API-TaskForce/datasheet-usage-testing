import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Code, Shield, Zap, Clock, AlertCircle, FileText } from 'lucide-react';
import BaseCard from './BaseCard.jsx';

export default function DatasheetViewer({ datasheet, templateName, templateUri }) {
  const [expandedSections, setExpandedSections] = useState({
    info: true,
    capacity: true,
    rateLimit: true,
    overview: true,
    authentication: true,
    parameters: false,
    headers: false,
    endpoints: false,
    rawData: false,
    coolingPeriod: false,
    segmentation: false,
  });

  const toggleSection = (section) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  console.log('[DatasheetViewer] Datasheet prop:', datasheet);

  if (!datasheet) {
    return (
      <BaseCard className="p-6">
        <p className="text-text text-sm">No hay información de datasheet disponible</p>
      </BaseCard>
    );
  }

  // Handle case where datasheet might be a string
  let parsedDatasheet = datasheet;
  if (typeof datasheet === 'string') {
    try {
      parsedDatasheet = JSON.parse(datasheet);
      console.log('[DatasheetViewer] Parsed datasheet successfully:', Object.keys(parsedDatasheet));
    } catch (e) {
      console.error('[DatasheetViewer] Failed to parse datasheet:', e);
      return (
        <BaseCard className="p-6 border border-accent rounded-lg">
          <p className="text-red-400 text-sm mb-3">Error al parsear el datasheet</p>
          <pre className="text-xs text-red-400 p-4 bg-slate-900/50 rounded overflow-auto max-h-64">{datasheet}</pre>
        </BaseCard>
      );
    }
  }

  // Detect which structure we have
  const hasStandardStructure = !!(parsedDatasheet?.overview || parsedDatasheet?.authentication || parsedDatasheet?.rateLimit);
  const hasCustomStructure = !!(parsedDatasheet?.associatedSaaS || parsedDatasheet?.capacity || parsedDatasheet?.maxPower);

  return (
    <div className="space-y-4 bg-bg p-2">
      {/* Render based on structure type */}
      {hasCustomStructure && (
        renderCustomStructure(parsedDatasheet, expandedSections, toggleSection)
      )}

      {hasStandardStructure && (
        renderStandardStructure(parsedDatasheet, expandedSections, toggleSection)
      )}

      {!hasStandardStructure && !hasCustomStructure && (
        <RawDataSection
          data={parsedDatasheet}
          isOpen={expandedSections.rawData}
          onToggle={() => toggleSection('rawData')}
        />
      )}
    </div>
  );
}

function renderCustomStructure(data, expandedSections, toggleSection) {
  return (
    <>
      {/* API Metadata Section */}
      {(data.associatedSaaS || data.url) && (
        <Section
          title="Información de la API"
          isOpen={expandedSections.info}
          onToggle={() => toggleSection('info')}
        >
          <BaseCard className="space-y-3">
            {data.associatedSaaS && <InfoRow label="SaaS Asociado" value={data.associatedSaaS} />}
            {data.url && (
              <InfoRow
                label="Información de Precios"
                value={
                  <a href={data.url} target="_blank" rel="noopener noreferrer" className="text-accent hover:text-accent-light underline text-sm">
                    {data.url}
                  </a>
                }
              />
            )}
            {data.planReference && <InfoRow label="Plan de Referencia" value={data.planReference} />}
            {data.type && <InfoRow label="Tipo de API" value={data.type} />}
          </BaseCard>
        </Section>
      )}

      {/* Capacity/Quota Section */}
      {data.capacity && (
        <Section
          title="Capacidad y Cuota"
          isOpen={expandedSections.capacity}
          onToggle={() => toggleSection('capacity')}
        >
          <div className="space-y-2">
            {Array.isArray(data.capacity)
              ? data.capacity.map((item, idx) => (
                  <div key={idx} className="card-section text-sm">
                    {item.type && <div className="font-bold text-text mb-1">{item.type}</div>}
                    {item.value && <p className="text-text">{item.value}</p>}
                    {item.windowType && <p className="text-xs text-muted mt-1">Período: {item.windowType}</p>}
                    {item.autoRecharge && <p className="text-xs text-muted">Recarga: {item.autoRecharge}</p>}
                    {item.description && <p className="text-xs text-muted mt-2">{item.description}</p>}
                    {item.extraCharge && <p className="text-xs text-muted">Costo adicional: {item.extraCharge}</p>}
                  </div>
                ))
              : <InfoRow label="Capacidad" value={String(data.capacity)} />}
          </div>
        </Section>
      )}

      {/* Rate Limit / Max Power Section */}
      {data.maxPower && (
        <Section
          title="Límite de Velocidad (Rate Limit)"
          isOpen={expandedSections.rateLimit}
          onToggle={() => toggleSection('rateLimit')}
        >
          <div className="card-section space-y-3">
            {typeof data.maxPower === 'object' ? (
              <>
                {data.maxPower.value && <InfoRow label="Límite" value={data.maxPower.value} highlight />}
                {data.maxPower.type && <InfoRow label="Tipo" value={data.maxPower.type} />}
                {data.maxPower.description && <InfoRow label="Descripción" value={data.maxPower.description} />}
              </>
            ) : (
              <InfoRow label="Rate Limit" value={String(data.maxPower)} />
            )}
          </div>
        </Section>
      )}

      {/* Cooling Period Section */}
      {data.coolingPeriod && (
        <Section
          title="Período de Enfriamiento"
          isOpen={expandedSections.coolingPeriod}
          onToggle={() => toggleSection('coolingPeriod')}
        >
          <div className="card-section">
            <InfoRow label="Cooling Period" value={data.coolingPeriod} />
          </div>
        </Section>
      )}

      {/* Segmentation Section */}
      {data.segmentation && (
        <Section
          title="Segmentación"
          isOpen={expandedSections.segmentation}
          onToggle={() => toggleSection('segmentation')}
        >
          {Array.isArray(data.segmentation) ? (
            <ul className="space-y-2">
              {data.segmentation.map((item, idx) => (
                <li key={idx} className="text-sm text-slate-300 flex gap-2">
                  <span className="text-accent">•</span>
                  {renderSegmentationItem(item)}
                </li>
              ))}
            </ul>
          ) : (
            <div>{renderSegmentationItem(data.segmentation)}</div>
          )}
        </Section>
      )}
    </>
  );
}

function renderStandardStructure(data, expandedSections, toggleSection) {
  return (
    <>
      {/* Overview Section */}
      {data.overview && (
        <Section
          title="Overview"
          icon={<Code size={18} />}
          isOpen={expandedSections.overview}
          onToggle={() => toggleSection('overview')}
        >
          <div className="space-y-3">
            {data.overview.name && <InfoRow label="API Name" value={data.overview.name} />}
            {data.overview.description && <InfoRow label="Description" value={data.overview.description} />}
            {data.overview.baseUrl && <InfoRow label="Base URL" value={data.overview.baseUrl} />}
            {data.overview.version && <InfoRow label="Version" value={data.overview.version} />}
            {data.overview.documentation && (
              <InfoRow
                label="Documentation"
                value={
                  <a
                    href={data.overview.documentation}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent hover:text-accent-light underline text-sm"
                  >
                    {data.overview.documentation}
                  </a>
                }
              />
            )}
          </div>
        </Section>
      )}

      {/* Authentication Section */}
      {data.authentication && (
        <Section
          title="Authentication"
          icon={<Shield size={18} />}
          isOpen={expandedSections.authentication}
          onToggle={() => toggleSection('authentication')}
        >
          <div className="space-y-3">
            {data.authentication.type && <InfoRow label="Type" value={data.authentication.type} />}
            {data.authentication.headerName && (
              <InfoRow label="Header Name" value={data.authentication.headerName} />
            )}
            {data.authentication.paramName && (
              <InfoRow label="Parameter Name" value={data.authentication.paramName} />
            )}
            {data.authentication.description && (
              <InfoRow label="Details" value={data.authentication.description} />
            )}
          </div>
        </Section>
      )}

      {/* Rate Limiting Section */}
      {data.rateLimit && (
        <Section
          title="Rate Limiting & Quota"
          icon={<Zap size={18} />}
          isOpen={expandedSections.rateLimit}
          onToggle={() => toggleSection('rateLimit')}
        >
          <div className="space-y-3">
            {data.rateLimit.requestsPerSecond !== undefined && (
              <InfoRow
                label="Requests per Second"
                value={data.rateLimit.requestsPerSecond}
                highlight
              />
            )}
            {data.rateLimit.requestsPerMinute !== undefined && (
              <InfoRow
                label="Requests per Minute"
                value={data.rateLimit.requestsPerMinute}
                highlight
              />
            )}
            {data.rateLimit.requestsPerDay !== undefined && (
              <InfoRow
                label="Daily Quota"
                value={data.rateLimit.requestsPerDay}
                highlight
              />
            )}
            {data.rateLimit.burstLimit !== undefined && (
              <InfoRow
                label="Burst Limit"
                value={data.rateLimit.burstLimit}
              />
            )}
            {data.rateLimit.description && (
              <InfoRow label="Details" value={data.rateLimit.description} />
            )}
          </div>
        </Section>
      )}

      {/* Parameters Section */}
      {data.parameters && Object.keys(data.parameters).length > 0 && (
        <Section
          title="Parameters"
          icon={<Clock size={18} />}
          isOpen={expandedSections.parameters}
          onToggle={() => toggleSection('parameters')}
        >
          <div className="space-y-2">
            {Object.entries(data.parameters).map(([name, param]) => (
              <ParameterItem key={name} name={name} param={param} />
            ))}
          </div>
        </Section>
      )}

      {/* Required Headers Section */}
      {data.headers && Object.keys(data.headers).length > 0 && (
        <Section
          title="Required Headers"
          icon={<AlertCircle size={18} />}
          isOpen={expandedSections.headers}
          onToggle={() => toggleSection('headers')}
        >
          <div className="space-y-2">
            {Object.entries(data.headers).map(([name, value]) => (
              <div key={name} className="text-sm">
                <div className="flex items-center gap-2 mb-1">
                  <code className="text-accent">{name}</code>
                  {value.required && <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded">Required</span>}
                </div>
                {value.description && <p className="text-xs text-slate-400 ml-2">{value.description}</p>}
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Endpoints Section */}
      {data.endpoints && Array.isArray(data.endpoints) && data.endpoints.length > 0 && (
        <Section
          title="Available Endpoints"
          icon={<Code size={18} />}
          isOpen={expandedSections.endpoints}
          onToggle={() => toggleSection('endpoints')}
        >
          <div className="space-y-2">
            {data.endpoints.map((endpoint, idx) => (
              <EndpointItem key={idx} endpoint={endpoint} />
            ))}
          </div>
        </Section>
      )}
    </>
  );
}

function RawDataSection({ data, isOpen, onToggle }) {
  return (
    <Section
      title="Raw Datasheet Data"
      icon={<Code size={18} />}
      isOpen={isOpen}
      onToggle={onToggle}
    >
      <div className="space-y-3">
        <p className="text-sm text-slate-400">
          Estructura no reconocida. Mostrando datos crudos:
        </p>
        <pre className="text-xs text-text p-4 rounded overflow-auto max-h-96 border border-slate-600">
          {JSON.stringify(data, null, 2)}
        </pre>
      </div>
    </Section>
  );
}

function Section({ title, icon, isOpen, onToggle, children }) {
  return (
    <BaseCard className='p-2'>
      <button
        onClick={onToggle}
        className="expandible-header"
      >
        <div className="text-accent">{icon}</div>
        <h3 className="text-lg font-bold text-text flex-1">{title}</h3>
        {isOpen ? (
          <ChevronDown size={20} className="text-slate-400" />
        ) : (
          <ChevronRight size={20} className="text-slate-400" />
        )}
      </button>

      {isOpen && <div className="mt-2 pt-2 border-t border-border">{children}</div>}
    </BaseCard>
  );
}

function InfoRow({ label, value, highlight = false }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-sm">
      <span className="text-slate-400 font-medium min-w-32">{label}:</span>
      <span className={`${highlight ? 'text-accent font-semibold' : 'text-text'}`}>
        {value || <span className="text-muted italic">Not specified</span>}
      </span>
    </div>
  );
}

function ParameterItem({ name, param }) {
  return (
    <div className="bg-slate-900/30 rounded-lg p-3 text-sm border border-slate-600">
      <div className="flex items-center gap-2 mb-1">
        <code className="text-accent font-mono">{name}</code>
        {param.required && <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded">Required</span>}
        {param.type && <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded">{param.type}</span>}
      </div>
      {param.description && <p className="text-slate-400">{param.description}</p>}
      {param.default !== undefined && (
        <p className="text-xs text-slate-500 mt-1">
          Default: <code className="text-slate-400">{String(param.default)}</code>
        </p>
      )}
    </div>
  );
}

function EndpointItem({ endpoint }) {
  const methodColors = {
    GET: 'bg-blue-500/20 text-blue-400',
    POST: 'bg-green-500/20 text-green-400',
    PUT: 'bg-orange-500/20 text-orange-400',
    DELETE: 'bg-red-500/20 text-red-400',
    PATCH: 'bg-purple-500/20 text-purple-400',
  };

  const method = endpoint.method || 'GET';
  const color = methodColors[method] || 'bg-slate-500/20 text-slate-400';

  return (
    <div className="bg-slate-900/30 rounded-lg p-3 text-sm border border-slate-600">
      <div className="flex items-start gap-2 mb-2">
        <span className={`px-2 py-1 rounded text-xs font-bold ${color}`}>{method}</span>
        <code className="text-cyan-300 font-mono flex-1">{endpoint.path || endpoint.url}</code>
      </div>
      {endpoint.description && <p className="text-slate-400 mb-2">{endpoint.description}</p>}
      {endpoint.parameters && (
        <div className="text-xs text-slate-500">
          <span className="font-semibold">Params:</span> {typeof endpoint.parameters === 'object' ? Object.keys(endpoint.parameters).join(', ') : endpoint.parameters}
        </div>
      )}
    </div>
  );
}

function renderSegmentationItem(item) {
  if (typeof item === 'string') {
    return <span>{item}</span>;
  }

  if (typeof item === 'object' && item !== null) {
    // Handle objects with properties
    if (item.name && item.description) {
      return (
        <div className="flex-1">
          <div className="font-semibold text-muted">{item.name}</div>
          <div className="text-xs text-muted mt-1">{item.description}</div>
        </div>
      );
    } else if (item.name) {
      return <span className="font-semibold text-muted">{item.name}</span>;
    } else if (item.description) {
      return <span className="text-muted">{item.description}</span>;
    } else {
      // For objects with other properties, display them cleanly without braces
      const entries = Object.entries(item);
      if (entries.length === 1) {
        const [key, value] = entries[0];
        return (
          <span className="text-text text-sm">
            <span className="font-semibold text-text">{key}:</span> {String(value)}
          </span>
        );
      } else {
        return (
          <div className="flex-1 space-y-1">
            {entries.map(([key, value]) => (
              <div key={key} className="text-muted text-sm">
                <span className="font-semibold text-text">{key}:</span> {String(value)}
              </div>
            ))}
          </div>
        );
      }
    }
  }

  // Fallback for any other type
  return <span>{String(item)}</span>;
}
