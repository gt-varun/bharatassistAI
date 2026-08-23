import React from 'react';
import { useTranslation } from 'react-i18next';
import { WifiOff } from 'lucide-react';
import { useNetworkStatus } from '../../native/useNetworkStatus';

/**
 * A standing notice while the device has no connection.
 *
 * Deliberately not a toast: the condition persists, so the message should
 * too, and it should say what still works rather than only what broke. It
 * sits above the bottom navigation on a phone and in the corner on a
 * desktop, and takes no layout space when the connection is fine.
 */
export const OfflineNotice: React.FC = () => {
  const { t } = useTranslation();
  const online = useNetworkStatus();

  if (online) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 z-50 flex justify-center px-4
                 bottom-[calc(var(--tab-bar-h)+var(--sab)+0.75rem)]
                 lg:bottom-6 lg:right-6 lg:left-auto lg:justify-end lg:px-0"
    >
      <div
        className="pointer-events-auto flex max-w-md items-start gap-2.5 rounded-lg border
                   border-ochre-edge bg-ochre-tint px-3.5 py-2.5 shadow-lift"
      >
        <WifiOff className="mt-0.5 h-4 w-4 shrink-0 text-ochre" strokeWidth={1.8} />
        <p className="min-w-0 text-[0.8125rem] leading-relaxed text-ochre">
          <span className="block font-semibold">{t('network.offlineTitle')}</span>
          {t('network.offlineBody')}
        </p>
      </div>
    </div>
  );
};
