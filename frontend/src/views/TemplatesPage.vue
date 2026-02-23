<template>
  <div class="min-h-screen py-8 px-4">
    <div class="max-w-7xl mx-auto">
      <!-- Loading State -->
      <div v-if="store.isLoading" class="text-center py-12">
        <div class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
        <p class="mt-4 text-gray-600">Loading templates...</p>
      </div>

      <!-- Error State -->
      <div
        v-else-if="store.hasError"
        class="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 mb-6"
      >
        <p class="font-semibold">Error</p>
        <p>{{ store.error }}</p>
        <button
          @click="store.clearError()"
          class="mt-2 text-sm underline hover:no-underline"
        >
          Dismiss
        </button>
      </div>

      <!-- List Mode -->
      <div>
        <TemplateList
          @edit="handleEdit"
          @select="handleSelect"
          @test="handleTest"
        />
      </div>

      <!-- Create / Edit Modal -->
      <div v-if="showFormModal" class="modal-overlay">
        <div class="modal-panel">
          <div class="p-6">
            <TemplateForm
              :template="editingTemplate"
              @success="handleFormSuccess"
              @cancel="closeFormModal"
            />
          </div>
        </div>
      </div>

      <!-- Test Modal -->
      <div v-if="showTestModal" class="modal-overlay">
        <div class="modal-panel">
          <div class="p-4 border-b">
            <div class="flex items-center justify-between">
              <h3 class="text-lg font-semibold">Testing: {{ testTemplate.name }}</h3>
              <button @click="closeTestModal" class="text-xl">×</button>
            </div>
          </div>
          <div class="p-6">
            <TemplateTestView :template="testTemplate" />
          </div>
        </div>
      </div>

      <!-- View Detail Modal -->
      <div
        v-if="selectedTemplate && !isEditing"
        class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-40 p-4"
      >
        <div class="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-96 overflow-y-auto">
          <div class="p-6 border-b border-gray-200">
            <div class="flex justify-between items-center">
              <h2 class="text-2xl font-bold text-gray-800">{{ selectedTemplate.name }}</h2>
              <button
                @click="selectedTemplate = null"
                class="text-gray-500 hover:text-gray-700 text-2xl leading-none"
              >
                ×
              </button>
            </div>
          </div>

          <div class="p-6 space-y-4">
            <div class="grid grid-cols-2 gap-4">
              <div>
                <p class="text-sm text-gray-600">Auth Method</p>
                <p class="font-semibold text-gray-800">{{ selectedTemplate.authMethod }}</p>
              </div>
              <div>
                <p class="text-sm text-gray-600">Status</p>
                <p
                  :class="[
                    'font-semibold',
                    selectedTemplate.status === 'active' ? 'text-green-600' : 'text-gray-600'
                  ]"
                >
                  {{ selectedTemplate.status }}
                </p>
              </div>
            </div>

            <div>
              <p class="text-sm text-gray-600">API URL</p>
              <p class="font-mono text-sm bg-gray-50 p-2 rounded text-gray-800 break-all">
                {{ selectedTemplate.apiUri }}
              </p>
            </div>

            <div>
              <p class="text-sm text-gray-600 mb-2">Datasheet Preview</p>
              <pre class="bg-gray-50 p-3 rounded text-xs text-gray-800 overflow-x-auto max-h-32">{{ selectedTemplate.datasheet }}</pre>
            </div>

            <div class="flex gap-3 pt-4 border-t">
              <button
                @click="handleEdit(selectedTemplate)"
                class="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-semibold"
              >
                Edit
              </button>
              <button
                @click="selectedTemplate = null"
                class="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useTemplateStore } from '../stores/templateStore.js';
import TemplateForm from '../components/TemplateForm.vue';
import TemplateList from '../components/TemplateList.vue';
import TemplateTestView from '../components/TemplateTestView.vue';

const store = useTemplateStore();
const showFormModal = ref(false);
const editingTemplate = ref(null);
const selectedTemplate = ref(null);
const showTestModal = ref(false);
const testTemplate = ref(null);

const handleEdit = (template) => {
  editingTemplate.value = template;
  showFormModal.value = true;
  selectedTemplate.value = null;
};

const handleSelect = (template) => {
  selectedTemplate.value = template;
};

const handleTest = (template) => {
  testTemplate.value = template;
  showTestModal.value = true;
};

const closeFormModal = () => {
  showFormModal.value = false;
  editingTemplate.value = null;
};

const closeTestModal = () => {
  showTestModal.value = false;
  testTemplate.value = null;
};

const handleFormSuccess = async () => {
  // refresh list and close modal
  await store.fetchAllTemplates();
  closeFormModal();
  store.clearError();
};
</script>
