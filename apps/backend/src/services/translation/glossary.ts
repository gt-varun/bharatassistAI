/**
 * Terms a translator must not paraphrase.
 *
 * Government vocabulary is where machine translation does the most damage: a
 * "domicile certificate" rendered as "home paper" sends a citizen to the wrong
 * counter. These are either passed through untouched or forced to the accepted
 * administrative rendering, and every provider prompt carries this list.
 */

/** Left in English wherever they appear — they are proper names or acronyms. */
export const PROTECTED_TERMS = [
  'BharatAssist AI',
  'Aadhaar',
  'PAN',
  'DBT',
  'EWS',
  'OBC',
  'SC',
  'ST',
  'MSME',
  'PMAY',
  'PM-KISAN',
  'DPDP Act',
  'OTP',
  'UPI',
  'IFSC',
  'KYC'
];

/**
 * Placeholders i18next interpolates at render time. If a translation loses or
 * mangles one of these the string breaks in production rather than merely
 * reading oddly, so the runner treats a placeholder mismatch as a hard failure.
 */
export const PLACEHOLDER_PATTERN = /\{\{[a-zA-Z0-9_]+\}\}/g;

export function extractPlaceholders(text: string): string[] {
  return (text.match(PLACEHOLDER_PATTERN) ?? []).sort();
}

/** True when `translated` carries exactly the placeholders `source` did. */
export function placeholdersIntact(source: string, translated: string): boolean {
  const a = extractPlaceholders(source);
  const b = extractPlaceholders(translated);
  return a.length === b.length && a.every((p, i) => p === b[i]);
}

/**
 * Per-language renderings for terms that do have an accepted translation and
 * should not be left in English. Kept deliberately short: every entry here is
 * a promise that a human checked it.
 */
export const TERM_OVERRIDES: Record<string, Record<string, string>> = {
  hi: { 'domicile certificate': 'अधिवास प्रमाणपत्र', subsidy: 'सब्सिडी', pension: 'पेंशन' },
  kn: { 'domicile certificate': 'ವಾಸಸ್ಥಳ ಪ್ರಮಾಣಪತ್ರ', subsidy: 'ಸಬ್ಸಿಡಿ', pension: 'ಪಿಂಚಣಿ' },
  ta: { 'domicile certificate': 'வதிவிடச் சான்றிதழ்', subsidy: 'மானியம்', pension: 'ஓய்வூதியம்' },
  te: { 'domicile certificate': 'నివాస ధ్రువీకరణ పత్రం', subsidy: 'సబ్సిడీ', pension: 'పింఛను' },
  ml: { 'domicile certificate': 'സ്ഥിരതാമസ സർട്ടിഫിക്കറ്റ്', subsidy: 'സബ്സിഡി', pension: 'പെൻഷൻ' },
  mr: { 'domicile certificate': 'अधिवास प्रमाणपत्र', subsidy: 'अनुदान', pension: 'निवृत्तिवेतन' },
  gu: { 'domicile certificate': 'અધિવાસ પ્રમાણપત્ર', subsidy: 'સબસિડી', pension: 'પેન્શન' },
  bn: { 'domicile certificate': 'বাসস্থান শংসাপত্র', subsidy: 'ভর্তুকি', pension: 'পেনশন' },
  pa: { 'domicile certificate': 'ਰਿਹਾਇਸ਼ ਸਰਟੀਫਿਕੇਟ', subsidy: 'ਸਬਸਿਡੀ', pension: 'ਪੈਨਸ਼ਨ' },
  ur: { 'domicile certificate': 'ڈومیسائل سرٹیفکیٹ', subsidy: 'سبسڈی', pension: 'پنشن' }
};

/** The instruction block every provider prepends to a translation request. */
export function glossaryInstruction(targetLang: string): string {
  const overrides = TERM_OVERRIDES[targetLang] ?? {};
  const overrideLines = Object.entries(overrides)
    .map(([en, translated]) => `  "${en}" -> "${translated}"`)
    .join('\n');

  return [
    'You are translating the interface of an Indian government scheme register.',
    'The reader is a citizen, often reading on a phone, often not a fluent English speaker.',
    'Use plain, respectful, everyday language — not literary or bureaucratic register.',
    '',
    'Hard rules:',
    `1. Leave these exactly as they are: ${PROTECTED_TERMS.join(', ')}.`,
    '2. Preserve every {{placeholder}} character-for-character. Do not translate what is inside the braces.',
    '3. Keep ₹ amounts, digits and dates as they are.',
    '4. Return only the translation. No quotes, no notes, no alternatives.',
    overrideLines ? `5. Use these established renderings:\n${overrideLines}` : ''
  ]
    .filter(Boolean)
    .join('\n');
}
