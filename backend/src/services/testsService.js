import * as Engine from '../engine.js';

// Service layer between controllers and engine/db.
// Actualmente es un wrapper; permite añadir lógica (autorización, enriquecimiento,
// transformaciones, métricas) sin que los controllers cambien.
export async function startTest(config) {
  // posible lugar para sanitizar/enriquecer la config antes de pasarlo al engine
  return Engine.startTest(config);
}

export async function getJob(id) {
  return Engine.getJob(id);
}

export async function getAllTests() {
  return Engine.listJobs();
} 
