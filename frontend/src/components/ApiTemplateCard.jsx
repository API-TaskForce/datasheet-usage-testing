import React, { useEffect, useMemo, useState } from 'react';
import BaseCard from './BaseCard.jsx';
import AuthBadge from './AuthBadge.jsx';
import BaseButton from './BaseButton.jsx';
import ApiTemplateActionsMenu from './ApiTemplateActionsMenu.jsx';
import Tooltip from './Tooltip.jsx';
import { TestTube2, Settings2 } from 'lucide-react';
import { buildTemplateCoverCandidates } from '../utils/templateCover.js';

export default function ApiTemplateCard({
  template,
  collectionName = null,
  showCover = true,
  coverUrl,
  coverFallbackText = null,
  onCoverError,
  onDashboard,
  onManageConfigs,
  onEdit,
  onDelete,
  dashboardLabel = 'Dashboard',
  testsLabel = 'Tests',
  footer = null,
  showAuthBadge = false,
  className = '',
}) {
  const [coverFailed, setCoverFailed] = useState(false);
  const [coverAttempt, setCoverAttempt] = useState(0);

  const coverCandidates = useMemo(() => {
    if (coverUrl === null) return null;
    if (typeof coverUrl === 'string') return [coverUrl];
    return buildTemplateCoverCandidates(template);
  }, [coverUrl, template]);

  const resolvedCoverUrl = coverCandidates?.[coverAttempt] || null;

  useEffect(() => {
    setCoverFailed(false);
    setCoverAttempt(0);
  }, [template?.id, coverUrl]);

  const shouldShowImage = Boolean(showCover && resolvedCoverUrl && !coverFailed);
  const showActionMenu = typeof onEdit === 'function' || typeof onDelete === 'function';

  return (
    <BaseCard className={className}>
      {showCover && (
        <div className="flex flex-row items-center justify-between h-8 w-full p-2">
          <div className="flex items-center gap-3 w-1/2">
            {shouldShowImage ? (
              <img
                src={resolvedCoverUrl}
                alt={`Logo de ${template?.name || 'API'}`}
                className="w-8 h-8 object-contain"
                loading="lazy"
                onError={() => {
                  if (coverCandidates && coverAttempt < coverCandidates.length - 1) {
                    setCoverAttempt((prev) => prev + 1);
                    return;
                  }

                  setCoverFailed(true);
                  if (typeof onCoverError === 'function') {
                    onCoverError();
                  }
                }}
              />
            ) : (
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
                <p className="text-md text-muted">?</p>
              </div>
            )}
            <h4 className="text-lg font-bold text-md leading-tight">{template?.name}</h4>
          </div>

          <div className="flex items-center gap-2">
            {showAuthBadge && (
              <AuthBadge
                authMethod={template?.authMethod}
                authCredential={template?.authCredential}
              />
            )}
          </div>
        </div>
      )}

      <div className="flex flex-col p-2 justify-between h-full gap-4">
        <div className="flex flex-row items-center gap-2 w-full">
          <Tooltip text={template?.apiUri || ''}>
            <p className="text-xs text-muted">{template?.apiUri}</p>
          </Tooltip>
        </div>

        {(typeof onDashboard === 'function' ||
          typeof onManageConfigs === 'function' ||
          showActionMenu) && (
          <div className="flex flex-row gap-2 items-center">
            {typeof onDashboard === 'function' && (
              <BaseButton
                size="sm"
                variant="secondary"
                onClick={() => onDashboard(template)}
                tooltip="Abrir el panel de testing para esta API"
              >
                <TestTube2 size={16} /> {dashboardLabel}
              </BaseButton>
            )}

            {/*typeof onManageConfigs === 'function' && (
              <BaseButton
                size="sm"
                variant="primary"
                onClick={() => onManageConfigs(template)}
                tooltip="Ver y gestionar configuraciones de test guardadas"
              >
                <Settings2 size={16} /> {testsLabel}
              </BaseButton>
            )*/}

            {showActionMenu && (
              <div className="ml-auto">
                <ApiTemplateActionsMenu template={template} onEdit={onEdit} onDelete={onDelete} />
              </div>
            )}
          </div>
        )}
      </div>
    </BaseCard>
  );
}
