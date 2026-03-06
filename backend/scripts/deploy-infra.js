import { execSync } from 'child_process';
import { error as logError, success as logSuccess, info as logInfo } from '../src/lib/log.js';

async function deploy() {
  try {
    logInfo('🚀 Iniciando despliegue de infraestructura (Prometheus & Grafana)...');

    // 1. Ejecutar Docker Compose
    logInfo('📦 Ejecutando docker-compose up -d...');
    execSync('docker compose up -d', { stdio: 'inherit' });

    // 2. Comprobar estado de los contenedores
    logInfo('🔍 Verificando estado de los contenedores...');
    
    const maxRetries = 10;
    let healthy = false;

    for (let i = 0; i < maxRetries; i++) {
      const output = execSync('docker compose ps --format json').toString();
      const containers = JSON.parse(`[${output.replace(/\n/g, ',').replace(/,$/, '')}]`);
      
      const allRunning = containers.every(c => c.State === 'running' || c.Status.includes('Up'));
      
      if (allRunning && containers.length >= 2) {
        healthy = true;
        break;
      }

      logInfo(`⏳ Esperando a que los contenedores estén listos (${i + 1}/${maxRetries})...`);
      await new Promise(resolve => setTimeout(resolve, 3000));
    }

    if (healthy) {
      logSuccess('✅ Infraestructura desplegada y ejecutándose correctamente.');
      logInfo('📊 Prometheus: http://localhost:9090');
      logInfo('📈 Grafana: http://localhost:3001 (User: admin, Pass: admin)');
    } else {
      logError('❌ Algunos contenedores no se iniciaron correctamente. Revisa "docker compose ps".');
      process.exit(1);
    }

  } catch (err) {
    logError(`💥 Error durante el despliegue: ${err.message}`);
    process.exit(1);
  }
}

deploy();
