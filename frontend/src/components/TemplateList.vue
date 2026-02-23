<template>
  <div class="space-y-4">
    <!-- Header -->
    <div class="flex justify-between items-center mb-6">
      <h2 class="text-2xl font-bold text-gray-800">API Templates</h2>
      <BaseButton variant="success" @click="handleNew">
        + New Template
      </BaseButton>
    </div>

    <!-- Search Bar -->
    <div class="mb-6">
      <BaseInput
        id="search"
        v-model="searchQuery"
        label="Search Templates"
        placeholder="Filter by name..."
      />
    </div>

    <!-- Empty State -->
    <div
      v-if="filteredTemplates.length === 0"
      class="text-center py-12 bg-white rounded-lg border border-gray-200"
    >
      <p class="text-gray-500 text-lg mb-4">
        {{ searchQuery ? 'No templates found' : 'No templates yet' }}
      </p>
      <BaseButton v-if="!searchQuery" variant="primary" @click="handleNew">
        Create Your First Template
      </BaseButton>
    </div>

    <!-- Templates Grid -->
    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <BaseCard
        v-for="template in filteredTemplates"
        :key="template.id"
        class="flex flex-col"
      >
        <div class="flex-1">
          <div class="flex items-start justify-between mb-3">
            <div>
              <h3 class="font-bold text-lg text-gray-800">{{ template.name }}</h3>
              <p class="text-sm text-gray-600">{{ template.authMethod }}</p>
            </div>
            <span
              :class="[
                'px-3 py-1 rounded-full text-xs font-semibold',
                template.status === 'active'
                  ? 'bg-green-100 text-green-800'
                  : 'bg-gray-100 text-gray-800'
              ]"
            >
              {{ template.status }}
            </span>
          </div>

          <p class="text-sm text-gray-600 break-all">{{ template.apiUri }}</p>
          <p class="text-xs text-gray-500 mt-3">
            Created: {{ formatDate(template.createdAt) }}
          </p>
        </div>

        <!-- Actions -->
            <div class="flex gap-2 mt-4 pt-4 border-t">
              <BaseButton
                size="sm"
                variant="primary"
                class="flex-1"
                @click="handleSelect(template)"
              >
                View
              </BaseButton>
              <BaseButton
                size="sm"
                variant="secondary"
                @click="handleEdit(template)"
              >
                Edit
              </BaseButton>
              <BaseButton
                size="sm"
                variant="secondary"
                @click="$emit('test', template)"
              >
                Test
              </BaseButton>
              <BaseButton
                size="sm"
                variant="danger"
                @click="handleDelete(template)"
              >
                Delete
              </BaseButton>
            </div>
      </BaseCard>
    </div>

    <!-- Delete Confirmation Modal -->
    <div
      v-if="templateToDelete"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
    >
      <BaseCard class="max-w-md">
        <h3 class="text-xl font-bold text-gray-800 mb-4">Delete Template?</h3>
        <p class="text-gray-600 mb-6">
          Are you sure you want to delete "{{ templateToDelete.name }}"? This action cannot be undone.
        </p>
        <div class="flex gap-3 justify-end">
          <BaseButton variant="secondary" @click="templateToDelete = null">
            Cancel
          </BaseButton>
          <BaseButton
            variant="danger"
            :disabled="isDeleting"
            @click="confirmDelete"
          >
            {{ isDeleting ? 'Deleting...' : 'Delete' }}
          </BaseButton>
        </div>
      </BaseCard>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useTemplateStore } from '../stores/templateStore.js';
import BaseCard from './BaseCard.vue';
import BaseButton from './BaseButton.vue';
import BaseInput from './BaseInput.vue';

const emit = defineEmits(['edit', 'select', 'test']);

const store = useTemplateStore();
const searchQuery = ref('');
const templateToDelete = ref(null);
const isDeleting = ref(false);

const filteredTemplates = computed(() => {
  return store.templates.filter(template =>
    template.name.toLowerCase().includes(searchQuery.value.toLowerCase())
  );
});

onMounted(() => {
  loadTemplates();
});

const loadTemplates = async () => {
  try {
    await store.fetchAllTemplates();
  } catch (err) {
    console.error('Failed to load templates:', err);
  }
};

const handleNew = () => {
  emit('edit', null);
};

const handleSelect = (template) => {
  store.setActive(template);
  emit('select', template);
};

const handleEdit = (template) => {
  emit('edit', template);
};

const handleDelete = (template) => {
  templateToDelete.value = template;
};

const confirmDelete = async () => {
  try {
    isDeleting.value = true;
    await store.deleteExisting(templateToDelete.value.id);
    templateToDelete.value = null;
  } catch (err) {
    console.error('Failed to delete template:', err);
  } finally {
    isDeleting.value = false;
  }
};

const formatDate = (date) => {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};
</script>
