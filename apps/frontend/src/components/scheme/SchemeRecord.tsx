import React from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Bookmark, BookmarkCheck } from 'lucide-react';
import type { Scheme } from '@bharatassist/shared-types';
import { LevelMark, Provenance, StaleMark, StatusMark } from './RecordMarks';
import { benefitLabelKey, segmentLabelKey } from '../../lib/taxonomy';
import { cn } from '../../lib/utils';

interface SchemeRecordProps {
  scheme: Scheme;
  /** Why this scheme surfaced — shown when search or recommendations can say. */
  matchReason?: string;
  saved?: boolean;
  onToggleSave?: (scheme: Scheme) => void;
  className?: string;
}

/**
 * A scheme, as a record slip: level spine on the reading edge, the benefit
 * stated in the citizen's terms, and provenance at the foot. This is the one
 * component the whole product is built around — search results, category
 * lists, saved schemes and recommendations are all lists of these.
 */
export const SchemeRecord: React.FC<SchemeRecordProps> = ({
  scheme,
  matchReason,
  saved,
  onToggleSave,
  className
}) => {
  const { t } = useTranslation();
  const href = `/schemes/${scheme.slug || scheme._id}`;

  return (
    <article
      data-level={scheme.level}
      className={cn('record record-interactive group', className)}
    >
      <div className="p-5 pl-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-wrap items-center gap-1.5">
            <LevelMark level={scheme.level} state={scheme.state} />
            <StatusMark scheme={scheme} />
            <StaleMark lastVerifiedAt={scheme.lastVerifiedAt} />
          </div>

          {onToggleSave && (
            <button
              type="button"
              onClick={() => onToggleSave(scheme)}
              aria-pressed={saved}
              aria-label={saved ? `Remove ${scheme.name} from saved` : `Save ${scheme.name}`}
              className={cn(
                'shrink-0 rounded p-1.5 transition-colors',
                saved ? 'text-sanction hover:bg-sanction-tint' : 'text-ink-4 hover:bg-rule-soft hover:text-ink-2'
              )}
            >
              {saved ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
            </button>
          )}
        </div>

        <h3 className="mt-3 font-display text-[1.0625rem] font-semibold leading-snug tracking-[-0.012em]">
          <Link
            to={href}
            className="text-ink decoration-sanction/40 underline-offset-4 outline-none transition-colors hover:text-sanction hover:underline focus-visible:text-sanction focus-visible:underline"
          >
            {scheme.name}
          </Link>
        </h3>

        <p className="mt-1.5 line-clamp-2 text-[0.875rem] leading-relaxed text-ink-2 text-pretty">
          {scheme.shortDescription || scheme.fullDescription}
        </p>

        {matchReason && (
          <p className="mt-3 rounded border-l-2 border-sanction-edge bg-sanction-tint/60 py-1.5 pl-2.5 pr-3 text-[0.8125rem] text-sanction">
            {matchReason}
          </p>
        )}

        {/* What you actually get — the answer most citizens are looking for. */}
        <dl className="mt-4 flex flex-wrap items-baseline gap-x-6 gap-y-2">
          <div className="min-w-0">
            <dt className="register">{t('record.youReceive')}</dt>
            <dd className="mt-0.5 text-[0.9375rem] font-semibold text-ink">
              {scheme.benefitSummary || t(benefitLabelKey(scheme.benefitType))}
            </dd>
          </div>
          {scheme.targetSegments?.length > 0 && (
            <div className="min-w-0">
              <dt className="register">For</dt>
              <dd className="mt-0.5 text-[0.9375rem] text-ink-2">
                {scheme.targetSegments.map((s) => t(segmentLabelKey(s))).join(', ')}
              </dd>
            </div>
          )}
        </dl>
      </div>

      <div className="hair-top px-5 py-2.5 pl-6">
        <Provenance scheme={scheme} />
      </div>
    </article>
  );
};
