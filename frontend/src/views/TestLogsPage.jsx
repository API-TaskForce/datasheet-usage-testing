import React, { useEffect, useMemo, useState } from 'react';
import {
  getTestLogs,
  deleteTestLog,
  deleteAllTestLogs,
  getTemplates,
} from '../services/apiTemplateService.js';
import { useToast } from '../stores/toastStore.jsx';
import BaseButton from '../components/BaseButton.jsx';
import BaseCard from '../components/BaseCard.jsx';
import TestLogDetailModal from '../components/TestLogDetailModal.jsx';
import { RefreshCw, Trash2, Filter, X, CheckSquare, Square, ChevronRight, ChevronDown } from 'lucide-react';

export default function TestLogsPage() {
  const [logs, setLogs] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedLog, setSelectedLog] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedLogIds, setSelectedLogIds] = useState([]);
  const [bulkMode, setBulkMode] = useState(false);
  const [expandedGroupKeys, setExpandedGroupKeys] = useState([]);
  const toast = useToast();

  const loadLogs = async () => {
    setLoading(true);
    setError(null);
    setSelectedLogIds([]);
    try {
      const [logsData, templatesData] = await Promise.all([getTestLogs(), getTemplates()]);
      // Sort by createdAt descending (newest first)
      const sorted = (logsData || []).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setLogs(sorted);
      setTemplates(templatesData || []);
      if (sorted.length === 0) {
        toast.info('No se encontraron registros de pruebas');
      } else {
        toast.success(`Se cargaron ${sorted.length} registros de pruebas`);
      }
    } catch (err) {
      setError(err.message);
      toast.error(`No se pudieron cargar los registros de pruebas: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const handleDeleteLog = async (logId) => {
    try {
      await deleteTestLog(logId);
      toast.success('Registro de prueba eliminado correctamente');
      loadLogs();
    } catch (err) {
      toast.error(`No se pudo eliminar el registro de prueba: ${err.message}`);
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedLogIds.length === 0) return;

    try {
      await Promise.all(selectedLogIds.map((id) => deleteTestLog(id)));
      toast.success(`${selectedLogIds.length} registros de pruebas eliminados correctamente`);
      setBulkMode(false);
      loadLogs();
    } catch (err) {
      toast.error(`No se pudieron eliminar los registros de pruebas: ${err.message}`);
    }
  };

  const handleDeleteAll = async () => {
    try {
      const result = await deleteAllTestLogs();
      toast.success(`${result.count} registros de pruebas eliminados correctamente`);
      setShowDeleteConfirm(false);
      loadLogs();
    } catch (err) {
      toast.error(`No se pudieron eliminar todos los registros de pruebas: ${err.message}`);
    }
  };

  const toggleLogSelection = (logId) => {
    setSelectedLogIds((prev) =>
      prev.includes(logId) ? prev.filter((id) => id !== logId) : [...prev, logId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedLogIds.length === filteredLogs.length) {
      setSelectedLogIds([]);
    } else {
      setSelectedLogIds(filteredLogs.map((log) => log.id));
    }
  };

  const toggleGroup = (groupKey) => {
    setExpandedGroupKeys((prev) =>
      prev.includes(groupKey) ? prev.filter((key) => key !== groupKey) : [...prev, groupKey]
    );
  };

  const filteredLogs = logs.filter((log) => {
    if (filterStatus === 'all') return true;
    return log.status === filterStatus;
  });

  const normalizeUri = (value) => {
    const raw = String(value || '').trim();
    if (!raw) return '';

    try {
      const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
      const parsed = new URL(withProtocol);
      const normalizedHost = String(parsed.host || '').trim().toLowerCase();
      const normalizedPath = String(parsed.pathname || '/').replace(/\/+$/, '').toLowerCase();
      const safePath = normalizedPath && normalizedPath !== '/' ? normalizedPath : '';
      return `${normalizedHost}${safePath}`;
    } catch {
      return raw.toLowerCase().replace(/\/$/, '');
    }
  };

  const templateUriMatchers = useMemo(() => {
    const matchers = (templates || [])
      .map((template) => ({
        template,
        baseUri: normalizeUri(template?.apiUri),
      }))
      .filter((item) => item.baseUri)
      .sort((a, b) => b.baseUri.length - a.baseUri.length);

    return matchers;
  }, [templates]);

  const templateIdIndex = useMemo(() => {
    const index = new Map();
    (templates || []).forEach((template) => {
      if (template?.id) index.set(String(template.id), template);
    });
    return index;
  }, [templates]);

  const groupedLogs = useMemo(() => {
    const groups = new Map();

    const getGroupFromLog = (log) => {
      const directTemplateId =
        log?.templateId ||
        log?.config?.templateId ||
        log?.config?.apiTemplateId ||
        log?.config?.template?.id;

      if (directTemplateId) {
        const matchedTemplate = templateIdIndex.get(String(directTemplateId));
        if (matchedTemplate) {
          return {
            key: `template:${matchedTemplate.id}`,
            label: matchedTemplate.name || 'Template sin nombre',
          };
        }
      }

      const testUri = normalizeUri(log?.config?.endpoint);
      if (testUri) {
        const matched = templateUriMatchers.find(({ baseUri }) => {
          return testUri === baseUri || testUri.startsWith(`${baseUri}/`);
        });
        const matchedTemplate = matched?.template;
        if (matchedTemplate) {
          return {
            key: `template:${matchedTemplate.id}`,
            label: matchedTemplate.name || 'Template sin nombre',
          };
        }
      }

      return {
        key: 'template:unknown',
        label: 'Sin template identificado',
      };
    };

    filteredLogs.forEach((log) => {
      const group = getGroupFromLog(log);
      if (!groups.has(group.key)) {
        groups.set(group.key, {
          key: group.key,
          label: group.label,
          logs: [],
        });
      }
      groups.get(group.key).logs.push(log);
    });

    return Array.from(groups.values()).sort((a, b) => {
      const aCreatedAt = a.logs?.[0]?.createdAt ? new Date(a.logs[0].createdAt).getTime() : 0;
      const bCreatedAt = b.logs?.[0]?.createdAt ? new Date(b.logs[0].createdAt).getTime() : 0;
      return bCreatedAt - aCreatedAt;
    });
  }, [filteredLogs, templateUriMatchers, templateIdIndex]);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'completed':
        return 'badge badge-success';
      case 'failed':
        return 'badge badge-error';
      case 'queued':
        return 'badge badge-warning';
      case 'running':
        return 'badge badge-info';
      case 'rate_limited':
        return 'badge badge-warning';
      default:
        return 'badge badge-secondary';
    }
  };

  const getResultStats = (results) => {
    if (!results || results.length === 0) return null;

    const stats = {
      total: results.length,
      success: 0,
      rateLimited: 0,
      error: 0,
    };

    results.forEach((r) => {
      if (r.statusCode >= 200 && r.statusCode < 300) stats.success++;
      else if (r.statusCode === 429) stats.rateLimited++;
      else stats.error++;
    });

    return stats;
  };

  const statusOptions = [
    { value: 'all', label: 'Todos', count: logs.length },
    {
      value: 'completed',
      label: 'Completados',
      count: logs.filter((l) => l.status === 'completed').length,
    },
    {
      value: 'running',
      label: 'En ejecucion',
      count: logs.filter((l) => l.status === 'running').length,
    },
    { value: 'queued', label: 'En cola', count: logs.filter((l) => l.status === 'queued').length },
    { value: 'failed', label: 'Fallidos', count: logs.filter((l) => l.status === 'failed').length },
  ];

  return (
    <div className="w-full p-6 container-max-width">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-text mb-2">Registros de pruebas</h1>
          <p className="text-textMuted text-sm">
            {filteredLogs.length} {filteredLogs.length === 1 ? 'registro' : 'registros'}{' '}
            {filterStatus !== 'all' && `(${filterStatus})`}
            {filteredLogs.length > 0 && ` · ${groupedLogs.length} grupos`}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <BaseButton variant="secondary" onClick={loadLogs} disabled={loading}>
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Actualizar
          </BaseButton>

          {logs.length > 0 && (
            <BaseButton variant="secondary" onClick={() => setBulkMode(!bulkMode)}>
              {bulkMode ? <X size={16} /> : <CheckSquare size={16} />}
              {bulkMode ? 'Cancelar seleccion' : 'Seleccionar'}
            </BaseButton>
          )}
        </div>
      </div>

      {/* Action Bar */}
      <BaseCard className="action-bar-row mb-6">
        {/* Filter Dropdown */}
        <div className="filter-dropdown">
            <BaseButton
              variant="secondary"
              onClick={() => setShowFilterDropdown(!showFilterDropdown)}
            >
              <Filter size={16} />
              <span>{statusOptions.find((o) => o.value === filterStatus)?.label}</span>
              <span className="text-textMuted">({filteredLogs.length})</span>
            </BaseButton>

            {showFilterDropdown && (
              <div className="filter-menu">
                {statusOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => {
                      setFilterStatus(option.value);
                      setShowFilterDropdown(false);
                    }}
                    className={`filter-menu-item ${
                      filterStatus === option.value ? 'active' : ''
                    }`}
                  >
                    <span className="text-text">{option.label}</span>
                    <span className="text-secondary text-xs"> {option.count}</span>
                  </button>
                ))}
              </div>
            )}
        </div>

          {/* Bulk Actions */}
          {bulkMode && (
            <div className="flex items-center gap-3">
              <button
                onClick={toggleSelectAll}
                className="text-sm text-textMuted hover:text-text transition-colors"
              >
                {selectedLogIds.length === filteredLogs.length ? 'Deseleccionar todo' : 'Seleccionar todo'}
              </button>

              {selectedLogIds.length > 0 && (
                <BaseButton variant="danger" onClick={handleDeleteSelected}>
                  <Trash2 size={16} />
                  Eliminar seleccionados ({selectedLogIds.length})
                </BaseButton>
              )}
            </div>
          )}

          {/* Delete All Button */}
          {!bulkMode && logs.length > 0 && (
            <BaseButton variant="danger" onClick={() => setShowDeleteConfirm(true)}>
              <Trash2 size={16} />
              Eliminar todo
            </BaseButton>
          )}
      </BaseCard>

      {/* Error State */}
      {error && (
        <BaseCard className="mb-6 p-4 bg-red-50 border border-red-200">
          <p className="text-red-800">Error: {error}</p>
        </BaseCard>
      )}

      {/* Loading State */}
      {loading && (
        <div className="text-center py-12">
          <RefreshCw size={48} className="animate-spin text-accent mx-auto mb-4" />
          <p className="text-textMuted">Cargando registros de pruebas...</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredLogs.length === 0 && (
        <BaseCard className="card-section text-center py-12">
          <p className="text-textMuted text-lg">No se encontraron registros de pruebas</p>
          {filterStatus !== 'all' && (
            <button
              onClick={() => setFilterStatus('all')}
              className="mt-4 text-accent hover:underline"
            >
              Limpiar filtro
            </button>
          )}
        </BaseCard>
      )}

      {/* Logs List */}
      {!loading && filteredLogs.length > 0 && (
        <div className="space-y-3">
          {groupedLogs.map((group) => (
            <div key={group.key} className="space-y-3">
              <button
                type="button"
                onClick={() => toggleGroup(group.key)}
                className="w-full flex items-center justify-between px-2 py-2 rounded-lg border border-border bg-secondary/5 hover:bg-secondary/10 transition-colors"
              >
                <span className="flex items-center gap-2">
                  {expandedGroupKeys.includes(group.key) ? (
                    <ChevronDown size={16} className="text-textMuted" />
                  ) : (
                    <ChevronRight size={16} className="text-textMuted" />
                  )}
                  <h2 className="text-lg font-bold text-text">{group.label}</h2>
                </span>
                <span className="text-xs text-textMuted">
                  {group.logs.length} {group.logs.length === 1 ? 'log' : 'logs'}
                </span>
              </button>

              {expandedGroupKeys.includes(group.key) &&
                group.logs.map((log) => {
                const stats = getResultStats(log.results);
                const duration =
                  log.finishedAt && log.startedAt
                    ? `${new Date(log.finishedAt) - new Date(log.startedAt)}ms`
                    : 'N/A';
                const isSelected = selectedLogIds.includes(log.id);

                return (
                  <BaseCard
                    key={log.id}
                    className={`cursor-pointer hover:shadow-lg transition-all border ${
                      isSelected ? 'border-accent ring-2 ring-accent' : 'border-border'
                    } bg-primary`}
                  >
                    <div onClick={() => !bulkMode && setSelectedLog(log)} className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        {/* Selection Checkbox */}
                        {bulkMode && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleLogSelection(log.id);
                            }}
                            className="flex-shrink-0 mt-1"
                          >
                            {isSelected ? (
                              <CheckSquare size={20} className="text-accent" />
                            ) : (
                              <Square size={20} className="text-textMuted" />
                            )}
                          </button>
                        )}

                        {/* Log Info */}
                        <div className="flex-1 flex flex-col gap-4 min-w-0">
                          <div className="flex items-center gap-3 mb-2 flex-wrap">
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-bold border ${getStatusBadgeClass(log.status)}`}
                            >
                              {log.status.toUpperCase()}
                            </span>
                            <code className="text-xs bg-bg px-2 py-1 rounded text-secondary">
                              {log.id}
                            </code>
                          </div>

                          {log.config?.endpoint && (
                            <div className="flex items-center gap-4 text-sm text-text font-medium flex-wrap bg-secondary/5 px-4 py-1 rounded-lg">
                              <span className="font-bold">{log.config.request?.method || 'GET'}</span>{' '}
                              <span className="font-mono">{log.config.endpoint}</span>
                            </div>
                          )}

                          <div className="flex items-center gap-4 text-xs text-textMuted mt-2">
                            <span>
                              Creado: <strong>{formatDate(log.createdAt)}</strong>
                            </span>
                            {duration !== 'N/A' && (
                              <span>
                                Duracion: <strong>{duration}</strong>
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Stats */}
                        {stats && (
                          <div className="text-right text-sm flex-shrink-0">
                            <p className="text-text font-bold mb-1">{stats.total} peticiones</p>
                            <div className="flex items-center gap-2 text-xs">
                              <span className="text-green-600">{stats.success} ✓</span>
                              <span className="text-red-600">{stats.error} ✗</span>
                              <span className="text-yellow-600">{stats.rateLimited} ⚠</span>
                            </div>
                          </div>
                        )}

                        {/* Delete Button */}
                        {!bulkMode && (
                          <BaseButton
                            variant="icon"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteLog(log.id);
                            }}
                            tooltip="Eliminar registro"
                          >
                            <Trash2 size={18} />
                          </BaseButton>
                        )}
                      </div>
                    </div>
                  </BaseCard>
                );
              })}
            </div>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      {selectedLog && <TestLogDetailModal log={selectedLog} onClose={() => setSelectedLog(null)} />}

      {/* Delete All Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <BaseCard className="max-w-md w-full p-6 bg-background">
            <h3 className="text-xl font-bold text-text mb-4">Eliminar todos los registros de pruebas?</h3>
            <p className="text-textMuted mb-6">
              Esta accion eliminara permanentemente los {logs.length} registros de pruebas. No se
              puede deshacer.
            </p>
            <div className="flex justify-end gap-3">
              <BaseButton variant="secondary" onClick={() => setShowDeleteConfirm(false)}>
                Cancelar
              </BaseButton>
              <BaseButton variant="danger" onClick={handleDeleteAll}>
                <Trash2 size={16} />
                Eliminar todo
              </BaseButton>
            </div>
          </BaseCard>
        </div>
      )}
    </div>
  );
}
