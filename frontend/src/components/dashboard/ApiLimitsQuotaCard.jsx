import React from 'react';
import BaseCard from '../BaseCard.jsx';
import ProgressBar from './ProgressBar.jsx';

const sourceLabel = {
  datasheet: 'Datasheet',
  template: 'Template',
  runtime: 'Runtime',
  response: 'Response',
};

export default function ApiLimitsQuotaCard({ summary, liveResults, apiLimits, template }) {
  return (
    <BaseCard className="gap-2 h-full">
      <h3 className="text-lg font-bold text-text text-center mb-2">API Limits & Quota</h3>
      <ProgressBar
        label="Request Quota Usage"
        current={summary?.total || liveResults.length}
        max={apiLimits?.quotaMax || template?.quotaLimit || 1000}
        unit="reqs"
        color="bg-gradient-to-r from-cyan-500 to-blue-500"
      />

      <ProgressBar
        label="Efficiency Score"
        current={summary?.ok || liveResults.filter((r) => r.status === 'ok').length}
        max={summary?.total || liveResults.length || 1}
        unit="success"
        color="bg-gradient-to-r from-emerald-500 to-teal-500"
      />

      <hr className="my-4" />
      <div className="flex flex-col gap-4 align-center items-center">
        <div className="limits-panel">
          <h5 className="text-sm font-bold text-text mb-2">Applied Limits</h5>
          <div className="grid grid-cols-1 gap-2 text-sm">
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted">Quota Max</span>
              <span className="text-text font-semibold">
                {apiLimits?.quotaMax ? `${apiLimits.quotaMax.toLocaleString()} req/day` : 'N/A'}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted">Rate Max</span>
              <span className="text-text font-semibold">
                {apiLimits?.rateMax ? `${apiLimits.rateMax.toLocaleString()} req/min` : 'N/A'}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted">Source</span>
              <span className="text-text font-semibold">{sourceLabel[apiLimits?.source] || 'N/A'}</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted">Rate Model</span>
              <span className="text-text font-semibold">
                {apiLimits.windowModel === 'UNLIMITED'
                  ? 'Unlimited'
                  : apiLimits.windowModel === 'SLIDING_WINDOW'
                    ? 'Sliding'
                    : apiLimits.windowModel === 'FIXED_WINDOW'
                      ? 'Fixed'
                      : 'Unknown'}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted">Cooldown Base</span>
              <span className="text-text font-semibold">{apiLimits.cooldownSeconds}s</span>
            </div>
          </div>
        </div>
      </div>
    </BaseCard>
  );
}
