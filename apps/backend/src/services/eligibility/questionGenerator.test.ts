import { describe, it, expect } from 'vitest';
import { generateEligibilityQuestions } from './questionGenerator.js';
import type { EligibilityRules } from '@bharatassist/shared-types';

describe('questionGenerator', () => {
  describe('core rule question generation', () => {
    it('generates state question for state-specific schemes', () => {
      const rules: EligibilityRules = {
        state: ['Karnataka', 'Maharashtra']
      };
      const questions = generateEligibilityQuestions(rules);
      expect(questions).toHaveLength(1);
      expect(questions[0].id).toBe('q_state');
      expect(questions[0].field).toBe('state');
      expect(questions[0].type).toBe('select');
      expect(questions[0].options).toEqual(['Karnataka', 'Maharashtra']);
      expect(questions[0].required).toBe(true);
      expect(questions[0].prefilled).toBe(false);
    });

    it('skips state question for central schemes open to all states', () => {
      expect(generateEligibilityQuestions({ state: ['All'] })).toHaveLength(0);
      expect(generateEligibilityQuestions({ state: ['National'] })).toHaveLength(0);
      expect(generateEligibilityQuestions({ state: ['India'] })).toHaveLength(0);
    });

    it('generates age question when ageMin or ageMax is specified', () => {
      const minOnly = generateEligibilityQuestions({ ageMin: 18 });
      expect(minOnly).toHaveLength(1);
      expect(minOnly[0].id).toBe('q_age');
      expect(minOnly[0].field).toBe('age');
      expect(minOnly[0].type).toBe('number');

      const maxOnly = generateEligibilityQuestions({ ageMax: 60 });
      expect(maxOnly).toHaveLength(1);
      expect(maxOnly[0].id).toBe('q_age');

      const both = generateEligibilityQuestions({ ageMin: 18, ageMax: 60 });
      expect(both).toHaveLength(1);
      expect(both[0].id).toBe('q_age');
    });

    it('generates income question when incomeMax is specified', () => {
      const questions = generateEligibilityQuestions({ incomeMax: 250000 });
      expect(questions).toHaveLength(1);
      expect(questions[0].id).toBe('q_income');
      expect(questions[0].field).toBe('income');
      expect(questions[0].type).toBe('number');
      expect(questions[0].required).toBe(true);
    });

    it('generates occupation category question with available options', () => {
      const questions = generateEligibilityQuestions({
        occupationCategory: ['student', 'unemployed']
      });
      expect(questions).toHaveLength(1);
      expect(questions[0].id).toBe('q_occupationCategory');
      expect(questions[0].field).toBe('occupationCategory');
      expect(questions[0].type).toBe('select');
      expect(questions[0].options).toEqual(['student', 'unemployed']);
    });

    it('generates gender question with standard gender options', () => {
      const questions = generateEligibilityQuestions({
        genderRestriction: 'female'
      });
      expect(questions).toHaveLength(1);
      expect(questions[0].id).toBe('q_gender');
      expect(questions[0].field).toBe('gender');
      expect(questions[0].type).toBe('select');
      expect(questions[0].options).toEqual(['Female', 'Male', 'Transgender', 'Other']);
    });

    it('skips gender question when unrestricted or set to all/any', () => {
      expect(generateEligibilityQuestions({ genderRestriction: 'all' })).toHaveLength(0);
      expect(generateEligibilityQuestions({ genderRestriction: 'any' })).toHaveLength(0);
      expect(generateEligibilityQuestions({ genderRestriction: '' })).toHaveLength(0);
    });

    it('generates category question for social category restrictions', () => {
      const questions = generateEligibilityQuestions({
        categoryRestriction: ['SC', 'ST', 'OBC']
      });
      expect(questions).toHaveLength(1);
      expect(questions[0].id).toBe('q_category');
      expect(questions[0].field).toBe('category');
      expect(questions[0].type).toBe('select');
      expect(questions[0].options).toEqual(['SC', 'ST', 'OBC']);
    });
  });

  describe('additional conditions and operator type inference', () => {
    it('infers number type for gte, lte, and between operators', () => {
      const rules: EligibilityRules = {
        additionalConditions: [
          { field: 'landOwnershipAcres', operator: 'lte', value: 2 },
          { field: 'score', operator: 'between', value: [60, 100] }
        ]
      };
      const questions = generateEligibilityQuestions(rules);
      expect(questions).toHaveLength(2);
      expect(questions[0].id).toBe('q_add_landOwnershipAcres');
      expect(questions[0].type).toBe('number');
      expect(questions[1].id).toBe('q_add_score');
      expect(questions[1].type).toBe('number');
    });

    it('infers multiselect type for in operator with array value', () => {
      const rules: EligibilityRules = {
        additionalConditions: [
          { field: 'educationLevel', operator: 'in', value: ['undergraduate', 'postgraduate'] }
        ]
      };
      const questions = generateEligibilityQuestions(rules);
      expect(questions).toHaveLength(1);
      expect(questions[0].type).toBe('multiselect');
      expect(questions[0].options).toEqual(['undergraduate', 'postgraduate']);
    });

    it('infers select type for equals and not_in operators', () => {
      const rules: EligibilityRules = {
        additionalConditions: [
          { field: 'maritalStatus', operator: 'equals', value: 'widow' }
        ]
      };
      const questions = generateEligibilityQuestions(rules);
      expect(questions).toHaveLength(1);
      expect(questions[0].type).toBe('select');
      expect(questions[0].options).toEqual(['widow']);
    });
  });

  describe('profile pre-filling and reachability', () => {
    it('prefills known citizen profile fields', () => {
      const rules: EligibilityRules = {
        state: ['Karnataka'],
        ageMin: 18,
        ageMax: 35,
        incomeMax: 200000,
        occupationCategory: ['student'],
        genderRestriction: 'female',
        categoryRestriction: ['OBC']
      };

      const profile = {
        state: 'Karnataka',
        age: 21,
        income: 150000,
        occupationCategory: 'student',
        gender: 'female',
        category: 'OBC'
      };

      const questions = generateEligibilityQuestions(rules, profile);
      expect(questions).toHaveLength(6);
      expect(questions.every((q) => q.prefilled === true)).toBe(true);
      expect(questions.find((q) => q.field === 'state')?.currentValue).toBe('Karnataka');
      expect(questions.find((q) => q.field === 'age')?.currentValue).toBe(21);
      expect(questions.find((q) => q.field === 'income')?.currentValue).toBe(150000);
      expect(questions.find((q) => q.field === 'occupationCategory')?.currentValue).toBe('student');
    });

    it('supports incomeBand prefilling when exact income is absent', () => {
      const rules: EligibilityRules = { incomeMax: 250000 };
      const profile = { incomeBand: '1l_2_5l' };
      const questions = generateEligibilityQuestions(rules, profile);
      expect(questions[0].prefilled).toBe(true);
      expect(questions[0].currentValue).toBe('1l_2_5l');
    });

    it('ensures prefilled option is reachable if not originally in scheme options', () => {
      const rules: EligibilityRules = {
        occupationCategory: ['farmer', 'artisan']
      };
      const profile = { occupationCategory: 'student' };
      const questions = generateEligibilityQuestions(rules, profile);
      expect(questions[0].options).toContain('student');
      expect(questions[0].currentValue).toBe('student');
      expect(questions[0].prefilled).toBe(true);
    });

    it('does not duplicate option if prefilled value already exists in options', () => {
      const rules: EligibilityRules = {
        occupationCategory: ['farmer', 'artisan']
      };
      const profile = { occupationCategory: 'farmer' };
      const questions = generateEligibilityQuestions(rules, profile);
      expect(questions[0].options).toEqual(['farmer', 'artisan']);
    });
  });

  describe('edge cases and safety', () => {
    it('returns empty array when rules are null or undefined', () => {
      expect(generateEligibilityQuestions(null)).toEqual([]);
      expect(generateEligibilityQuestions(undefined)).toEqual([]);
      expect(generateEligibilityQuestions({})).toEqual([]);
    });

    it('handles empty profile gracefully with prefilled false', () => {
      const rules: EligibilityRules = { ageMin: 18, incomeMax: 100000 };
      const questions = generateEligibilityQuestions(rules, {});
      expect(questions).toHaveLength(2);
      expect(questions[0].prefilled).toBe(false);
      expect(questions[0].currentValue).toBeNull();
      expect(questions[1].prefilled).toBe(false);
      expect(questions[1].currentValue).toBeNull();
    });
  });
});
