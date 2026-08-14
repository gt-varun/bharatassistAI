import React from 'react';
import { useTranslation } from 'react-i18next';
import { Landmark, MapPin, CircleAlert, Clock, CheckCircle2 } from 'lucide-react';
import type { Scheme } from '@bharatassist/shared-types';
import { Badge } from '../ui/badge';
import { daysUntil, formatDate, isStale, recordRef, relativeVerified } from '../../lib/format';
import { cn } from '../../lib/utils';

/**
 * The register marks that appear on every scheme, wherever it is shown.
 * Each one answers a question a citizen has before they read a word of the
 * description: who issued this, is it open, and can I trust the data.
 */

export const LevelMark: React.FC<{ level: Scheme['level']; state: Scheme['state'] }> = ({
  level,
  state
}) => {
  const { t } = useTranslation();

  // A state's own name is a proper noun and stays as the register holds it;
  // only the fallback word is translated.
  return level === 'central' ? (
    <Badge variant="central">
      <Landmark className="h-3 w-3" strokeWidth={2} />
      {t('record.central')}
    </Badge>
  ) : (
    <Badge variant="state">
      <MapPin className="h-3 w-3" strokeWidth={2} />
      {state || t('record.state')}
    </Badge>
  );
};

export const StatusMark: React.FC<{ scheme: Pick<Scheme, 'status' | 'deadline'> }> = ({ scheme }) => {
  const { t } = useTranslation();
  const left = daysUntil(scheme.deadline);

  if (scheme.status === 'closed') {
    return <Badge variant="closed">{t('record.closedShort')}</Badge>;
  }

  // A deadline inside a month is the one thing worth a stamp of vermilion.
  if (left !== null && left >= 0 && left <= 30) {
    return (
      <Badge variant="deadline">
        <Clock className="h-3 w-3" strokeWidth={2} />
        {left === 0 ? t('record.closesToday') : t('record.daysLeft', { count: left })}
      </Badge>
    );
  }

  if (scheme.status === 'rolling') {
    return <Badge variant="open">{t('record.openAllYear')}</Badge>;
  }

  return <Badge variant="open">{t('record.open')}</Badge>;
};

export const StaleMark: React.FC<{ lastVerifiedAt: Scheme['lastVerifiedAt'] }> = ({
  lastVerifiedAt
}) => {
  const { t } = useTranslation();

  return isStale(lastVerifiedAt) ? (
    <Badge variant="stale" title={t('record.staleTitle')}>
      <CircleAlert className="h-3 w-3" strokeWidth={2} />
      {t('record.needsRecheck')}
    </Badge>
  ) : null;
};

/**
 * The provenance line: department, verification date and the source
 * notification reference. This is the product's trust claim, so it is set in
 * the mono register and never truncated away on desktop.
 */
export const Provenance: React.FC<{ scheme: Scheme; className?: string }> = ({
  scheme,
  className
}) => {
  const { t } = useTranslation();
  const [verifiedKey, verifiedCount] = relativeVerified(scheme.lastVerifiedAt);

  return (
    /*
     * `min-w-0` on the truncating spans is what keeps a scheme record from
     * setting the width of the page it sits in.
     *
     * `truncate` includes `white-space: nowrap`, and a flex item defaults to
     * `min-width: auto` — so without this each span reports its *entire*
     * untruncated string as a minimum width. A department like "National
     * Social Assistance Programme Guidelines" then demands ~456px, which
     * propagates up through every list and grid holding a record and pushes
     * the whole layout past the width of a phone. `min-w-0` lets the span
     * shrink and actually do the truncating it was asked to do.
     */
    <p className={cn('register flex flex-wrap items-center gap-x-2 gap-y-1', className)}>
      <span className="min-w-0 truncate text-ink-2">{scheme.department}</span>
      <span aria-hidden className="text-ink-4">
        ·
      </span>
      <span className={isStale(scheme.lastVerifiedAt) ? 'text-ochre' : ''}>
        {t(verifiedKey, verifiedCount)}
      </span>
      <span aria-hidden className="text-ink-4">
        ·
      </span>
      <span className="min-w-0 truncate">{recordRef(scheme.sourceRef, scheme.slug)}</span>
    </p>
  );
};

/**
 * The endorsement stamp — used once, on the scheme detail page. It is the
 * one element in the system that borrows a physical form, and it earns that
 * because provenance is the whole promise of the product.
 */
export const VerificationStamp: React.FC<{ scheme: Scheme }> = ({ scheme }) => {
  const { t } = useTranslation();
  const stale = isStale(scheme.lastVerifiedAt);

  return (
    <div
      className={cn(
        'stamp animate-stamp-in',
        stale && 'border-ochre-edge bg-ochre-tint'
      )}
    >
      <span className={cn('register-strong flex items-center gap-1.5', stale ? 'text-ochre' : 'text-sanction')}>
        {stale ? <CircleAlert className="h-3 w-3" /> : <CheckCircle2 className="h-3 w-3" />}
        {stale ? t('record.recheckDue') : t('record.verifiedAgainstSource')}
      </span>
      <span className="font-mono text-[0.8125rem] font-medium text-ink">
        {formatDate(scheme.lastVerifiedAt)}
      </span>
      <span className="register text-ink-3">{recordRef(scheme.sourceRef, scheme.slug)}</span>
    </div>
  );
};
