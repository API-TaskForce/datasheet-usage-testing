import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { success as logSuccess, info as logInfo } from '../src/lib/log.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

const FILES = {
  'grafana/provisioning/datasources/prometheus.yml': `
apiVersion: 1
datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    isDefault: true
    editable: true
  `,
  'grafana/provisioning/dashboards/dashboards.yml': `
apiVersion: 1
providers:
  - name: 'Default'
    orgId: 1
    folder: ''
    type: file
    disableDeletion: false
    editable: true
    options:
      path: /etc/grafana/provisioning/dashboards
  `
};

function setup() {
  logInfo('🛠️  Activando configuración estática de Grafana...');

  for (const [filePath, content] of Object.entries(FILES)) {
    const fullPath = path.join(ROOT, filePath);
    const dir = path.dirname(fullPath);

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(fullPath, content.trim());
    logInfo(`  📄 Configurado: ${filePath}`);
  }

  logSuccess('✅ Configuración estática activada correctamente.');
}

setup();
