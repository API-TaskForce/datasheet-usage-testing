import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import {
  getTemplates as fetchTemplates,
  getTemplate as fetchTemplate,
  createTemplate as apiCreateTemplate,
  updateTemplate as apiUpdateTemplate,
  deleteTemplate as apiDeleteTemplate,
  getTemplateDatasheet as fetchTemplateDatasheet,
} from '../services/apiTemplateService.js';

export const useTemplateStore = defineStore('templates', () => {
  // =============== STATE ===============
  const templates = ref([]);
  const activeTemplate = ref(null);
  const loading = ref(false);
  const error = ref(null);
  const editingTemplate = ref(null);

  // =============== COMPUTED ===============
  const templateCount = computed(() => templates.value.length);
  const hasTemplates = computed(() => templates.value.length > 0);
  const isLoading = computed(() => loading.value);
  const hasError = computed(() => error.value !== null);

  // =============== ACTIONS ===============

  /**
   * Fetch all templates
   */
  async function fetchAllTemplates() {
    try {
      loading.value = true;
      error.value = null;
      templates.value = await fetchTemplates();
    } catch (err) {
      error.value = err.message;
      templates.value = [];
      throw err;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Fetch single template by ID
   */
  async function getTemplateById(id) {
    try {
      loading.value = true;
      error.value = null;
      return await fetchTemplate(id);
    } catch (err) {
      error.value = err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Fetch template with parsed datasheet
   */
  async function getDatasheet(id) {
    try {
      loading.value = true;
      error.value = null;
      return await fetchTemplateDatasheet(id);
    } catch (err) {
      error.value = err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Create new template
   */
  async function createNew(templateData) {
    try {
      loading.value = true;
      error.value = null;
      const newTemplate = await apiCreateTemplate(templateData);
      templates.value.push(newTemplate);
      return newTemplate;
    } catch (err) {
      error.value = err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Update existing template
   */
  async function updateExisting(id, templateData) {
    try {
      loading.value = true;
      error.value = null;
      const updated = await apiUpdateTemplate(id, templateData);
      
      // Update in local array
      const index = templates.value.findIndex(t => t.id === id);
      if (index !== -1) {
        templates.value[index] = updated;
      }
      
      // Update active if applicable
      if (activeTemplate.value?.id === id) {
        activeTemplate.value = updated;
      }
      
      return updated;
    } catch (err) {
      error.value = err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Delete template
   */
  async function deleteExisting(id) {
    try {
      loading.value = true;
      error.value = null;
      await apiDeleteTemplate(id);
      
      // Remove from local array
      templates.value = templates.value.filter(t => t.id !== id);
      
      // Clear active if deleted
      if (activeTemplate.value?.id === id) {
        activeTemplate.value = null;
      }
    } catch (err) {
      error.value = err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Set active template
   */
  function setActive(template) {
    activeTemplate.value = template;
  }

  /**
   * Start editing template
   */
  function startEdit(template) {
    editingTemplate.value = { ...template };
  }

  /**
   * Cancel editing
   */
  function cancelEdit() {
    editingTemplate.value = null;
  }

  /**
   * Clear error
   */
  function clearError() {
    error.value = null;
  }

  /**
   * Clear all state
   */
  function reset() {
    templates.value = [];
    activeTemplate.value = null;
    editingTemplate.value = null;
    error.value = null;
    loading.value = false;
  }

  return {
    // State
    templates,
    activeTemplate,
    editingTemplate,
    loading,
    error,

    // Computed
    templateCount,
    hasTemplates,
    isLoading,
    hasError,

    // Actions
    fetchAllTemplates,
    getTemplateById,
    getDatasheet,
    createNew,
    updateExisting,
    deleteExisting,
    setActive,
    startEdit,
    cancelEdit,
    clearError,
    reset,
  };
});
