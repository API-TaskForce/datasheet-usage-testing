import { useCallback } from 'react';

/**
 * Mock Data Injection profiles configuration
 * Each profile defines traffic pattern characteristics
 */
export const MOCK_PROFILES = {
  baseline: {
    burstChance: 0.16,
    burstMin: 7,
    burstMax: 16,
    clientErrorChance: 0.02,
  },
  good: {
    burstChance: 0.08,
    burstMin: 3,
    burstMax: 8,
    clientErrorChance: 0.005,
  },
  cautious: {
    burstChance: 0.04,
    burstMin: 2,
    burstMax: 5,
    clientErrorChance: 0.003,
  },
  bursty: {
    burstChance: 0.4,
    burstMin: 10,
    burstMax: 30,
    clientErrorChance: 0.08,
  },
  quotaDrainer: {
    burstChance: 0.12,
    burstMin: 5,
    burstMax: 12,
    clientErrorChance: 0.015,
  },
  bad: {
    burstChance: 0.31,
    burstMin: 12,
    burstMax: 24,
    clientErrorChance: 0.22,
  },
};

/**
 * Showcase scenarios configuration
 * Each scenario maps to a profile with specific traffic parameters
 */
export const SHOWCASE_SCENARIOS = {
  good: {
    profile: 'good',
    totalRequests: 70,
    intervalMs: 280,
  },
  cautious: {
    profile: 'cautious',
    totalRequests: 50,
    intervalMs: 360,
  },
  bursty: {
    profile: 'bursty',
    totalRequests: 120,
    intervalMs: 165,
  },
  quota: {
    profile: 'quotaDrainer',
    totalRequests: 180,
    intervalMs: 190,
  },
  bad: {
    profile: 'bad',
    totalRequests: 140,
    intervalMs: 150,
  },
};

/**
 * Hook for mock data generation and injection
 * Encapsulates all logic for building organic mock results and running showcase scenarios
 * 
 * @param {Object} apiLimits - API rate/quota limits
 * @param {Object} template - API template info
 * @param {Function} buildHeadersFromTemplate - Helper to build request headers
 * @param {Function} buildEndpointFromConfig - Helper to build request endpoint
 * @param {Function} buildUserLikePacing - Helper to generate realistic pacing
 * @param {Function} startProgressiveSimulation - Callback to start test simulation
 * @param {boolean} running - Whether a test is currently running
 * @param {Function} buildSummaryFromResults - Helper to build test summary
 * @param {Function} addTestResult - Callback to store test result
 * @param {Object} defaultTestConfig - Default test configuration
 * @param {boolean} isCurrentlyInCooldown - Whether in cooldown period
 * @returns {Object} { buildOrganicMockResults, runSimulatedTest, runShowcaseScenario }
 */
export function useMockDataInjection(
  apiLimits,
  template,
  buildHeadersFromTemplate,
  buildEndpointFromConfig,
  buildUserLikePacing,
  startProgressiveSimulation,
  running,
  buildSummaryFromResults,
  addTestResult,
  defaultTestConfig,
  isCurrentlyInCooldown
) {
  /**
   * Build organic mock results respecting rate limits and quota
   */
  const buildOrganicMockResults = useCallback(
    (config, profile = 'baseline') => {
      const totalRequests = Math.max(1, parseInt(config?.totalRequests || 80, 10));
      const now = Date.now();

      const cooldownBase = Math.max(1, Number(apiLimits?.cooldownSeconds || 30));
      const limitPerWindow = Math.max(1, parseInt(apiLimits?.rateMax || 60, 10));
      const windowSeconds = Math.max(1, parseInt(apiLimits?.windowSeconds || 60, 10));
      const isSlidingWindow = apiLimits?.windowModel === 'SLIDING_WINDOW';
      const quotaMaxRaw = Number(apiLimits?.quotaMax || 0);
      const hasQuota = Number.isFinite(quotaMaxRaw) && quotaMaxRaw > 0;
      const quotaMax = hasQuota ? Math.max(1, Math.floor(quotaMaxRaw)) : Number.MAX_SAFE_INTEGER;
      const pacing = buildUserLikePacing(Number(config?.intervalMs) || 230);

      const selectedProfile = MOCK_PROFILES[profile] || MOCK_PROFILES.baseline;

      const estimatedTotalMs = totalRequests * 420 + cooldownBase * 1000 * 2 + 6000;
      let cursor = now - estimatedTotalMs;

      let windowStartMs = cursor;
      let requestsInWindow = 0;
      const slidingAccepted = [];
      const results = [];
      let quotaConsumed = 0;

      const availableCapacity = (tsMs) => {
        if (isSlidingWindow) {
          const cutoff = tsMs - windowSeconds * 1000;
          while (slidingAccepted.length > 0 && slidingAccepted[0] < cutoff) {
            slidingAccepted.shift();
          }
          return Math.max(0, limitPerWindow - slidingAccepted.length);
        }

        if (tsMs - windowStartMs >= windowSeconds * 1000) {
          windowStartMs = tsMs;
          requestsInWindow = 0;
        }
        return Math.max(0, limitPerWindow - requestsInWindow);
      };

      const consumeCapacity = (tsMs) => {
        if (isSlidingWindow) {
          slidingAccepted.push(tsMs);
        } else {
          requestsInWindow += 1;
        }
      };

      const computeRetryAfter = (tsMs) => {
        if (!isSlidingWindow) return cooldownBase;
        if (slidingAccepted.length === 0) return cooldownBase;
        const oldest = slidingAccepted[0];
        return Math.max(1, Math.ceil((oldest + windowSeconds * 1000 - tsMs) / 1000));
      };

      let seq = 0;
      while (results.length < totalRequests) {
        const burstTick = Math.random() < selectedProfile.burstChance;
        const tickRequests = burstTick
          ? selectedProfile.burstMin +
            Math.floor(Math.random() * Math.max(1, selectedProfile.burstMax - selectedProfile.burstMin + 1))
          : 1;

        for (let j = 0; j < tickRequests && results.length < totalRequests; j++) {
          const jitterMs = burstTick ? Math.floor(Math.random() * 5) : 0;
          const tsMs = cursor + jitterMs;

          const cap = availableCapacity(tsMs);
          const endpoint = buildEndpointFromConfig(config);
          const method = config?.method || template?.requestMethod || 'GET';

          let statusCode = 200;
          let status = 'ok';
          let retryAfter = null;

          if (quotaConsumed >= quotaMax) {
            statusCode = 403;
            status = 'error';
            retryAfter = cooldownBase;
          } else if (cap <= 0) {
            statusCode = 429;
            status = 'rate_limited';
            retryAfter = computeRetryAfter(tsMs);
          } else if (Math.random() < selectedProfile.clientErrorChance) {
            const errors = [400, 401, 403, 404];
            statusCode = errors[Math.floor(Math.random() * errors.length)];
            status = 'error';
            retryAfter = cooldownBase;
          } else {
            consumeCapacity(tsMs);
            quotaConsumed += 1;
          }

          seq += 1;
          results.push({
            seq,
            timestamp: new Date(tsMs).toISOString(),
            status,
            statusCode,
            durationMs:
              statusCode === 200
                ? 70 + Math.floor(Math.random() * 240)
                : 20 + Math.floor(Math.random() * 85),
            retryAfter: retryAfter != null ? String(retryAfter) : null,
            request: {
              url: endpoint,
              method,
              headers: buildHeadersFromTemplate(),
              body: config?.body || null,
            },
            response: {
              status: statusCode,
              statusText:
                statusCode === 429
                  ? 'Too Many Requests'
                  : statusCode >= 400
                    ? 'Client Error'
                    : 'OK',
              headers:
                statusCode >= 400
                  ? {
                      'retry-after': String(retryAfter || cooldownBase),
                      'x-ratelimit-limit': String(limitPerWindow),
                      'x-ratelimit-window': `${windowSeconds}s`,
                      'x-quota-max': String(quotaMax),
                      'x-quota-used': String(quotaConsumed),
                    }
                  : {
                      'x-ratelimit-limit': String(limitPerWindow),
                      'x-ratelimit-window': `${windowSeconds}s`,
                      'x-quota-max': String(quotaMax),
                      'x-quota-used': String(quotaConsumed),
                    },
              body:
                statusCode >= 400
                  ? JSON.stringify({
                      error:
                        statusCode === 429
                          ? 'Rate limit exceeded'
                          : statusCode === 403 && quotaConsumed >= quotaMax
                            ? 'Quota exceeded'
                            : 'Client request error',
                      simulated: true,
                      profile,
                    })
                  : JSON.stringify({ ok: true, simulated: true, profile }),
            },
            rateLimit:
              statusCode === 429
                ? {
                    detected: true,
                    retryAfter,
                    window: windowSeconds,
                    limit: limitPerWindow,
                  }
                : null,
          });
        }

        const baseDelay = pacing.drawDelayMs();
        cursor += burstTick ? Math.max(baseDelay, 650 + Math.floor(Math.random() * 1200)) : baseDelay;

        const last = results[results.length - 1];
        if (last?.statusCode >= 400 && last?.statusCode < 500) {
          const jumpS = Number(last?.retryAfter || cooldownBase);
          cursor += jumpS * 1000;
        }
      }

      return results;
    },
    [
      apiLimits?.cooldownSeconds,
      apiLimits?.quotaMax,
      apiLimits?.rateMax,
      apiLimits?.windowModel,
      apiLimits?.windowSeconds,
      template?.requestMethod,
      buildHeadersFromTemplate,
      buildEndpointFromConfig,
      buildUserLikePacing,
    ]
  );

  /**
   * Run a simulated test with given config and profile
   */
  const runSimulatedTest = useCallback(
    (config, options = {}) => {
      const profile = options?.profile || 'baseline';
      const simulatedResults = buildOrganicMockResults(config, profile);
      startProgressiveSimulation(simulatedResults, options?.jobPrefix || 'sim', {
        organicPlayback: options?.organicPlayback ?? true,
        instant: Boolean(options?.instant),
      });
    },
    [buildOrganicMockResults, startProgressiveSimulation]
  );

  /**
   * Run a showcase scenario with predefined profile and configuration
   */
  const runShowcaseScenario = useCallback(
    (scenario) => {
      if (running || isCurrentlyInCooldown) return;

      const baseConfig = {
        ...(defaultTestConfig || {
          method: template?.requestMethod || 'GET',
          path: '/',
          clients: 1,
          totalRequests: 40,
          timeoutMs: 5000,
          body: '',
        }),
      };

      const selectedScenario = SHOWCASE_SCENARIOS[scenario] || SHOWCASE_SCENARIOS.good;
      baseConfig.totalRequests = selectedScenario.totalRequests;
      baseConfig.intervalMs = selectedScenario.intervalMs;

      runSimulatedTest(baseConfig, {
        profile: selectedScenario.profile,
        jobPrefix: `showcase-${scenario}`,
        instant: true,
      });
    },
    [running, isCurrentlyInCooldown, defaultTestConfig, template?.requestMethod, runSimulatedTest]
  );

  return {
    buildOrganicMockResults,
    runSimulatedTest,
    runShowcaseScenario,
  };
}
