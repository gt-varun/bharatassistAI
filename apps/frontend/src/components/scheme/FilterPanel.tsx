import React from 'react';
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
      {field('level', 'Issued by', 'Central and state', [
        { value: 'central', label: 'Central government' },
        { value: 'state', label: 'State government' }
      ])}

      {field(
        'state',
        'State',
        'Any state',
        STATES.map((s) => ({ value: s, label: s }))
      )}

      {field(
        'segment',
        'Who it is for',
        'Anyone',
        SEGMENTS.map((s) => ({ value: s.slug, label: s.label }))
      )}

      {field(
        'benefitType',
        'What you receive',
        'Any benefit',
        BENEFIT_TYPES.map((b) => ({ value: b.slug, label: b.label }))
      )}

      {field(
        'incomeBand',
        'Household income',
        'Any income',
        INCOME_BANDS.map((b) => ({ value: b.slug, label: b.label }))
      )}

      {field('status', 'Applications', 'Open or closed', [
        { value: 'open', label: 'Accepting applications' },
        { value: 'rolling', label: 'Open all year' },
        { value: 'closed', label: 'Closed for now' }
      ])}
    </div>
  );
};
