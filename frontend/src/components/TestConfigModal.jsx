import React, { useState, useEffect } from 'react';
import BaseCard from './BaseCard.jsx';
import BaseButton from './BaseButton.jsx';
import { X, Plus, Pencil, Trash2, Save, MoreVertical, Code, AlertCircle, Check } from 'lucide-react';
import {
  getTestConfigs,
  createTestConfig,
  updateTestConfig,
  deleteTestConfig,
} from '../services/apiTemplateService.js';
import { useToast } from '../stores/toastStore.jsx';

export default function TestConfigModal({ template, onClose }) {
  const [configs, setConfigs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingConfig, setEditingConfig] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const toast = useToast();

  const [formData, setFormData] = useState({
    testName: '',
    method: 'GET',
    path: '/',
    clients: 5,
    totalRequests: 100,
    timeoutMs: 5000,
    headers: [],
    body: '',
  });

  const loadConfigs = async () => {
    setLoading(true);
    try {
      const data = await getTestConfigs(template.id);
      setConfigs(data);
    } catch (err) {
      toast.error('Failed to load test configs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConfigs();
  }, [template.id]);

  const handleCreate = () => {
    setEditingConfig(null);
    setFormData({
      testName: '',
      method: 'GET',
      path: '/',
      clients: 5,
      totalRequests: 100,
      timeoutMs: 5000,
      headers: [],
      body: '',
    });
    setShowForm(true);
  };

  const handleEdit = (config) => {
    setEditingConfig(config);
    setFormData({ ...config });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this test configuration?')) return;
    try {
      await deleteTestConfig(id);
      toast.success('Test configuration deleted');
      loadConfigs();
    } catch (err) {
      toast.error('Failed to delete config');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...formData, apiTemplateId: template.id, apiTemplateName: template.name };
      if (editingConfig) {
        await updateTestConfig(editingConfig.id, payload);
        toast.success('Test configuration updated');
      } else {
        await createTestConfig(payload);
        toast.success('Test configuration created');
      }
      setShowForm(false);
      loadConfigs();
    } catch (err) {
      toast.error('Failed to save config');
    }
  };

  const handleFormatJSON = () => {
    try {
      if (!formData.body || formData.body.trim() === '') {
        toast.info('No JSON content to format');
        return;
      }

      let jsonStr = formData.body;

      // Remove trailing commas before closing braces/brackets
      jsonStr = jsonStr.replace(/,(\s*[}\]])/g, '$1');

      // Fix unquoted object keys - comprehensive multi-pass approach
      // Pass 1: Keys after { or , (handles most common cases)
      jsonStr = jsonStr.replace(/([{,\n]\s*)([a-zA-Z_$][a-zA-Z0-9_$-]*)\s*:/g, '$1"$2":');
      
      // Pass 2: Keys at start of document or after whitespace
      jsonStr = jsonStr.replace(/^\s*([a-zA-Z_$][a-zA-Z0-9_$-]*)\s*:/m, '"$1":');
      
      // Pass 3: Keys after opening bracket in array of objects
      jsonStr = jsonStr.replace(/(\[\s*)([a-zA-Z_$][a-zA-Z0-9_$-]*)\s*:/g, '$1"$2":');

      const parsed = JSON.parse(jsonStr);
      const formatted = JSON.stringify(parsed, null, 2);
      setFormData({ ...formData, body: formatted });
      toast.success('JSON formatted and corrected successfully');
    } catch (err) {
      toast.error(`Invalid JSON: ${err.message}`);
    }
  };

  return (
    <div className="modal-overlay z-[60]">
      <div className="modal-panel max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-white sticky top-0 z-10">
          <div>
            <h2 className="text-2xl font-black text-slate-800">Manage Test Configs</h2>
            <p className="text-slate-500 text-sm">Predefined settings for {template.name}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400"
          >
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 bg-bg">
          {!showForm ? (
            <div className="space-y-4">
              <div className="flex justify-end">
                <BaseButton variant="primary" onClick={handleCreate} size="md">
                  <Plus size={18} /> New Configuration
                </BaseButton>
              </div>

              {loading ? (
                <div className="py-12 text-center text-text">Loading configurations...</div>
              ) : configs.length === 0 ? (
                <div className="py-20 text-center bg-white rounded-2xl border border-dashed border-border">
                  <p className="text-text font-medium">No predefined tests yet</p>
                  <p className="text-text text-sm mt-1">
                    Create one to speed up your testing workflow
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
                  {configs.map((c) => (
                    <div
                      key={c.id}
                      className="card-section shadow-sm hover:shadow-md transition-all group"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-bold text-text">{c.testName}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="badge badge-secondary text-[10px] px-2 py-0.5 rounded-full bg-bg font-black uppercase">
                              {c.method}
                            </span>
                            <span className="text-xs text-text font-mono">{c.path}</span>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <BaseButton variant="secondary" onClick={() => handleEdit(c)} size="sm">
                            <Pencil size={16} />
                          </BaseButton>
                          <BaseButton
                            variant="primary"
                            onClick={() => handleDelete(c.id)}
                            size="sm"
                          >
                            <Trash2 size={16} />
                          </BaseButton>
                        </div>
                      </div>
                      <div className="mt-4 pt-4 border-t border-slate-50 grid grid-cols-3 gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">
                        <div>
                          <p className="text-slate-300 text-[8px]">Clients</p>
                          <p className="text-text">{c.clients}</p>
                        </div>
                        <div>
                          <p className="text-slate-300 text-[8px]">Requests</p>
                          <p className="text-text">{c.totalRequests}</p>
                        </div>
                        <div>
                          <p className="text-slate-300 text-[8px]">Timeout</p>
                          <p className="text-text">{c.timeoutMs}ms</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="card-section rounded-2xl space-y-6"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-text">
                  {editingConfig ? 'Edit Config' : 'New Config'}
                </h3>
                <BaseButton variant="ghost" onClick={() => setShowForm(false)} size="sm">
                  Cancel
                </BaseButton>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-accent uppercase tracking-widest mb-2">
                      Config Name
                    </label>
                    <input
                      required
                      value={formData.testName}
                      onChange={(e) => setFormData({ ...formData, testName: e.target.value })}
                      className="w-full bg-bg border border-border rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 transition-all"
                      placeholder="e.g., Stress Test 100"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-1">
                      <label className="block text-xs font-bold text-accent uppercase tracking-widest mb-2">
                        Method
                      </label>
                      <select
                        value={formData.method}
                        onChange={(e) => setFormData({ ...formData, method: e.target.value })}
                        className="form-select w-full h-fit px-3 py-2 rounded-xl text-base bg-white text-text outline-none"
                      >
                        <option>GET</option>
                        <option>POST</option>
                        <option>PUT</option>
                        <option>DELETE</option>
                      </select>
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-bold text-accent uppercase tracking-widest mb-2">
                        Path
                      </label>
                      <input
                        value={formData.path}
                        onChange={(e) => setFormData({ ...formData, path: e.target.value })}
                        className="w-full bg-bg border border-border rounded-xl px-4 py-2.5 outline-none font-mono text-sm"
                        placeholder="/api/v1/resource"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-accent uppercase tracking-widest mb-2 text-center">
                      Clients
                    </label>
                    <input
                      type="number"
                      value={formData.clients}
                      onChange={(e) =>
                        setFormData({ ...formData, clients: parseInt(e.target.value) })
                      }
                      className="w-full bg-bg border border-border rounded-xl px-3 py-2.5 text-center font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-accent uppercase tracking-widest mb-2 text-center">
                      Requests
                    </label>
                    <input
                      type="number"
                      value={formData.totalRequests}
                      onChange={(e) =>
                        setFormData({ ...formData, totalRequests: parseInt(e.target.value) })
                      }
                      className="w-full bg-bg border border-border rounded-xl px-3 py-2.5 text-center font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-accent uppercase tracking-widest mb-2 text-center">
                      Timeout
                    </label>
                    <input
                      type="number"
                      value={formData.timeoutMs}
                      onChange={(e) =>
                        setFormData({ ...formData, timeoutMs: parseInt(e.target.value) })
                      }
                      className="w-full bg-bg border border-border rounded-xl px-3 py-2.5 text-center font-bold"
                    />
                  </div>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-xs font-bold text-accent uppercase tracking-widest">
                    Body (JSON)
                  </label>
                  <BaseButton
                    variant="secondary"
                    size="sm"
                    onClick={() => handleFormatJSON()}
                    type="button"
                  >
                    <Code size={14} /> Format
                  </BaseButton>
                </div>
                <textarea
                  value={formData.body}
                  onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                  className="w-full bg-bg border border-border rounded-xl px-4 py-3 outline-none font-mono text-sm"
                  placeholder="{}"
                  rows={4}
                />
              </div>

              <div className="flex justify-end pt-4 border-t border-slate-100">
                <BaseButton variant="primary" type="submit" size="md">
                  <Check size={18} /> Save
                </BaseButton>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
