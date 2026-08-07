import React from 'react';
import { useTranslation } from 'react-i18next';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Label } from '../ui/label';
import { BENEFIT_TYPES, INCOME_BANDS, SEGMENTS, STATES } from '../../lib/taxonomy';

export interface Filters {
  level: string;
  state: string;
  segment: string;
  benefitType: string;
  incomeBand: string;
  status: string;
}

export const EMPTY_FILTERS: Filters = {
  level: '',
  state: '',
  segment: '',
  benefitType: '',
  incomeBand: '',
  status: ''
};

const ANY = '__any';

interface FilterPanelProps {
  filters: Filters;
  onChange: (key: keyof Filters, value: string) => void;
}

/** One control per column the register is indexed on. */
export const FilterPanel: React.FC<FilterPanelProps> = ({ filters, onChange }) => {
  const { t } = useTranslation();
  const field = (
    key: keyof Filters,
    label: string,
    placeholder: string,
    options: { value: string; label: string }[]
  ) => (
    <div className="space-y-1.5">
      <Label htmlFor={`filter-${key}`}>{label}</Label>
      <Select
        value={filters[key] || ANY}
        onValueChange={(value) => onChange(key, value === ANY ? '' : value)}
      >
        <SelectTrigger id={`filter-${key}`}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ANY}>{placeholder}</SelectItem>
          {options.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  return (
    <div className="space-y-5">
      {field('level', t('search.level'), t('search.levelAny'), [
        { value: 'central', label: t('search.levelCentral') },
        { value: 'state', label: t('search.levelState') }
      ])}

      {field(
        'state',
        t('search.state'),
        t('search.stateAny'),
        STATES.map((s) => ({ value: s, label: s }))
      )}

      {field(
        'segment',
        t('search.segment'),
        t('search.segmentAny'),
        SEGMENTS.map((s) => ({ value: s.slug, label: t(s.labelKey) }))
      )}

      {field(
        'benefitType',
        t('search.benefit'),
        t('search.benefitAny'),
        BENEFIT_TYPES.map((b) => ({ value: b.slug, label: t(b.labelKey) }))
      )}

      {field(
        'incomeBand',
        t('search.income'),
        t('search.incomeAny'),
        INCOME_BANDS.map((b) => ({ value: b.slug, label: t(b.labelKey) }))
      )}

      {field('status', t('search.status'), t('search.statusAny'), [
        { value: 'open', label: t('record.accepting') },
        { value: 'rolling', label: t('record.openAllYear') },
        { value: 'closed', label: t('record.closed') }
      ])}
    </div>
  );
};
