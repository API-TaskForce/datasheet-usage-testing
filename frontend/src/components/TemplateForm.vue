<template>
  <BaseCard>
    <div class="space-y-4">
      <div class="flex justify-between items-center mb-6">
        <h2 class="text-2xl font-bold text-gray-800">
          {{ isEditing ? 'Edit API Template' : 'Create New API Template' }}
        </h2>
      </div>

      <!-- Error Message -->
      <div
        v-if="errors.form"
        class="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700"
      >
        {{ errors.form }}
      </div>

      <!-- Form Fields -->
      <BaseInput
        id="name"
        v-model="form.name"
        label="Template Name"
        placeholder="e.g., MailerSend API"
        :error="errors.name"
        required
      />

      <BaseSelect
        id="authMethod"
        v-model="form.authMethod"
        label="Authentication Method"
        :options="authMethods"
        :error="errors.authMethod"
        required
      />

      <BaseInput
        id="authCredential"
        v-model="form.authCredential"
        type="password"
        label="Auth Credential"
        placeholder="API key, token, or credentials"
        :error="errors.authCredential"
        hint="Your authentication credential (stored securely)"
        required
      />

      <BaseInput
        id="apiUri"
        v-model="form.apiUri"
        label="API URL"
        placeholder="https://api.example.com/v1"
        :error="errors.apiUri"
        hint="The base URL of the API endpoint"
        required
      />

      <BaseSelect
        id="status"
        v-model="form.status"
        label="Status"
        :options="statusOptions"
        :error="errors.status"
      />

      <BaseTextarea
        id="datasheet"
        v-model="form.datasheet"
        label="API Datasheet (YAML)"
        placeholder="associatedSaaS: Example&#10;planReference: PRO&#10;capacity:&#10;  - value: 1000&#10;    type: QUOTA&#10;    windowType: MONTHLY"
        :error="errors.datasheet"
        hint="YAML format with API limits and capabilities"
        :rows="12"
        required
      />

      <!-- Buttons -->
      <div class="flex justify-end gap-3 pt-4 border-t">
        <BaseButton
          variant="secondary"
          @click="handleCancel"
        >
          Cancel
        </BaseButton>
        <BaseButton
          variant="primary"
          :disabled="isSubmitting"
          @click="handleSubmit"
        >
          {{ isSubmitting ? 'Saving...' : (isEditing ? 'Update' : 'Create') }}
        </BaseButton>
      </div>
    </div>
  </BaseCard>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { useTemplateStore } from '../stores/templateStore.js';
import BaseCard from './BaseCard.vue';
import BaseButton from './BaseButton.vue';
import BaseInput from './BaseInput.vue';
import BaseSelect from './BaseSelect.vue';
import BaseTextarea from './BaseTextarea.vue';

const props = defineProps({
  template: Object,
});

const emit = defineEmits(['success', 'cancel']);

const store = useTemplateStore();
const isSubmitting = ref(false);
const errors = ref({});

const authMethods = [
  { value: 'API_TOKEN', label: 'API Token' },
  { value: 'BASIC_AUTH', label: 'Basic Auth' },
  { value: 'BEARER', label: 'Bearer Token' },
  { value: 'OAUTH2', label: 'OAuth 2.0' },
];

const statusOptions = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
];

const form = ref({
  name: '',
  authMethod: '',
  authCredential: '',
  apiUri: '',
  datasheet: '',
  status: 'active',
});

const isEditing = computed(() => !!props.template);

// Initialize form with template data if editing
watch(
  () => props.template,
  (template) => {
    if (template) {
      form.value = { ...template };
    }
  },
  { immediate: true }
);

const handleSubmit = async () => {
  errors.value = {};

  // Validate
  if (!form.value.name?.trim()) {
    errors.value.name = 'Name is required';
  }
  if (!form.value.authMethod) {
    errors.value.authMethod = 'Auth method is required';
  }
  if (!form.value.authCredential?.trim()) {
    errors.value.authCredential = 'Auth credential is required';
  }
  if (!form.value.apiUri?.trim()) {
    errors.value.apiUri = 'API URL is required';
  }
  if (!form.value.datasheet?.trim()) {
    errors.value.datasheet = 'Datasheet is required';
  }

  if (Object.keys(errors.value).length > 0) {
    return;
  }

  try {
    isSubmitting.value = true;

    if (isEditing.value) {
      await store.updateExisting(props.template.id, form.value);
    } else {
      await store.createNew(form.value);
    }

    emit('success');
  } catch (err) {
    errors.value.form = err.message;
  } finally {
    isSubmitting.value = false;
  }
};

const handleCancel = () => {
  emit('cancel');
};
</script>
