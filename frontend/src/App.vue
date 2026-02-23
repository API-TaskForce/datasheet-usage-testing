<template>
  <div id="app" class="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100">
    <!-- Header -->
    <header class="bg-white shadow-sm sticky top-0 z-50">
      <div class="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-3xl font-bold text-gray-900">
              🚀 API Template Monitor & Tester
            </h1>
            <p class="text-gray-600 mt-2">
              Manage, monitor, and test your API rate limits
            </p>
          </div>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <main class="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
      <TemplatesPage />
    </main>

    <!-- Footer -->
    <footer class="bg-white border-t border-gray-200 mt-12">
      <div class="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        <p class="text-gray-600 text-sm">
          © 2025 API Datasheet Usage Testing. All rights reserved.
        </p>
      </div>
    </footer>
  </div>
</template>

<script setup>
import TemplatesPage from './views/TemplatesPage.vue'
</script>

<style scoped>
#app {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
    'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
    sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
</style>
