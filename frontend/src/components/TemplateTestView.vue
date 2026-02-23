<template>
  <div class="space-y-4">
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <!-- Left: Request builder -->
      <div class="space-y-3">
        <div class="flex gap-2">
          <select v-model="method" class="w-32 p-2 border rounded">
            <option>GET</option>
            <option>POST</option>
            <option>PUT</option>
            <option>DELETE</option>
            <option>PATCH</option>
          </select>
          <input v-model="path" class="flex-1 p-2 border rounded" />
        </div>

        <div>
          <p class="text-sm muted mb-1">Headers</p>
          <div v-for="(h, idx) in headers" :key="idx" class="flex gap-2 mb-2">
            <input v-model="h.key" class="w-1/3 p-2 border rounded" placeholder="Header" />
            <input v-model="h.value" class="flex-1 p-2 border rounded" placeholder="Value" />
          </div>
        </div>

        <div>
          <p class="text-sm muted mb-1">Body (JSON)</p>
          <textarea v-model="body" rows="6" class="w-full p-2 border rounded font-mono"></textarea>
        </div>

        <div class="flex gap-2 justify-end">
          <button @click="runTest" class="btn-primary px-4 py-2 rounded">Run</button>
          <button @click="clearConsole" class="btn-secondary px-4 py-2 rounded">Clear</button>
        </div>
      </div>

      <!-- Middle: Charts / stats (placeholders) -->
      <div class="lg:col-span-1 space-y-4">
        <div class="card-root">
          <h4 class="font-semibold mb-2">Quick Stats</h4>
          <p class="text-sm muted">Last status: <strong>{{ lastStatus || '—' }}</strong></p>
          <p class="text-sm muted">Avg latency: <strong>{{ avgLatencyDisplay }}</strong></p>
        </div>

        <div class="card-root">
          <h4 class="font-semibold mb-2">Capacity / Usage</h4>
          <p class="text-sm muted">(Charts to be implemented)</p>
        </div>
      </div>

      <!-- Right: Console -->
      <div class="lg:col-span-1">
        <div>
          <p class="text-sm muted mb-2">Console</p>
          <div class="console-root" ref="consoleRef">
            <div v-for="(line, i) in consoleLines" :key="i" class="console-line">
              <div v-if="line.type === 'request'" class="console-request">→ {{ line.text }}</div>
              <div v-else class="console-response">← {{ line.text }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, nextTick } from 'vue';

const props = defineProps({
  template: { type: Object, required: true }
});

const method = ref('GET');
const path = ref('/');
const headers = ref([]);
const body = ref('');
const consoleLines = ref([]);
const lastStatus = ref(null);
const latencies = ref([]);
const consoleRef = ref(null);

onMounted(() => {
  // populate auth header based on template
  const t = props.template;
  headers.value = [];
  if (t.authMethod === 'API_TOKEN' || t.authMethod === 'BEARER') {
    headers.value.push({ key: 'Authorization', value: `Bearer ${t.authCredential}` });
  } else if (t.authMethod === 'BASIC_AUTH') {
    headers.value.push({ key: 'Authorization', value: `Basic ${t.authCredential}` });
  }
});

watch(consoleLines, () => {
  // auto-scroll
  nextTick(() => {
    if (consoleRef.value) {
      consoleRef.value.scrollTop = consoleRef.value.scrollHeight;
    }
  });
});

const formatUrl = () => {
  let base = props.template.apiUri || '';
  if (base.endsWith('/')) base = base.slice(0, -1);
  let p = path.value || '';
  if (!p.startsWith('/')) p = '/' + p;
  return base + p;
};

const runTest = async () => {
  const url = formatUrl();
  const hdrs = {};
  for (const h of headers.value) {
    if (h.key && h.value) hdrs[h.key] = h.value;
  }

  consoleLines.value.push({ type: 'request', text: `${method.value} ${url}` });
  const start = Date.now();
  try {
    const res = await fetch(url, {
      method: method.value,
      headers: { 'Content-Type': 'application/json', ...hdrs },
      body: ['GET','DELETE'].includes(method.value) ? undefined : (body.value || undefined),
    });

    const time = Date.now() - start;
    latencies.value.push(time);
    lastStatus.value = `${res.status} ${res.statusText}`;

    let text;
    try { text = await res.text(); } catch(e){ text = '<no body>'; }

    consoleLines.value.push({ type: 'response', text: `${res.status} ${res.statusText} — ${time}ms` });
    // show snippet
    consoleLines.value.push({ type: 'response', text: text.slice(0, 2000) });
  } catch (err) {
    const time = Date.now() - start;
    latencies.value.push(time);
    consoleLines.value.push({ type: 'response', text: `ERROR: ${err.message}` });
  }
};

const clearConsole = () => { consoleLines.value = []; };

const avgLatencyDisplay = computed(() => {
  if (latencies.value.length === 0) return '—';
  const sum = latencies.value.reduce((a,b)=>a+b,0);
  return Math.round(sum/latencies.value.length) + ' ms';
});
</script>

<style scoped>
.card-root{padding:1rem}
</style>
