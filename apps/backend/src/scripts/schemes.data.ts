/**
 * The real scheme corpus.
 *
 * Every record here is an actual central or state government scheme. Values
 * are taken from the scheme's own guidelines or official portal, which is
 * what `sourceRef` points at — we deliberately do not invent gazette numbers.
 *
 * Coverage is deliberate rather than incidental: all eight target segments,
 * all five benefit types, both levels, and ten states, so that search
 * relevance, filters and ranking are exercised against real-world messiness
 * (see docs/person-1-discovery-content.md §1 and §4).
 *
 * `extractionConfidence` reflects how mechanically the fields map onto the
 * source guidelines. Anything below 1.0 has at least one field — usually a
 * benefit amount or a deadline — that a human should re-check against the
 * current notification before a citizen acts on it.
 */

type Doc = { label: string; howToObtain: string; mandatory: boolean };

const AADHAAR: Doc = {
  label: 'Aadhaar Card',
  howToObtain: 'UIDAI portal or nearest Aadhaar Seva Kendra',
  mandatory: true
};
const BANK: Doc = {
  label: 'Bank Passbook with IFSC',
  howToObtain: 'Your bank branch, or download from net banking',
  mandatory: true
};
const INCOME: Doc = {
  label: 'Income Certificate',
  howToObtain: 'Tehsil / Taluk office or the state e-district portal',
  mandatory: true
};
const CASTE: Doc = {
  label: 'Caste Certificate',
  howToObtain: 'Tehsil / Taluk office or the state e-district portal',
  mandatory: true
};
const RESIDENCE: Doc = {
  label: 'Domicile / Residence Certificate',
  howToObtain: 'Tehsil / Taluk office or the state e-district portal',
  mandatory: true
};
const PHOTO: Doc = {
  label: 'Passport-size Photograph',
  howToObtain: 'Any photo studio',
  mandatory: true
};
const RATION: Doc = {
  label: 'Ration Card',
  howToObtain: 'State food and civil supplies department portal',
  mandatory: false
};
const DISABILITY: Doc = {
  label: 'UDID / Disability Certificate (40% or above)',
  howToObtain: 'Apply on swavlambancard.gov.in, assessed at a district hospital',
  mandatory: true
};
const LAND: Doc = {
  label: 'Land Record (Khatauni / RTC / 7-12 extract)',
  howToObtain: 'State land records portal (Bhulekh, Bhoomi, Mahabhulekh)',
  mandatory: true
};

export const realSchemes = [
  // ------------------------------------------------------------------
  // CENTRAL — farmers
  // ------------------------------------------------------------------
  {
    name: 'PM-KISAN (Pradhan Mantri Kisan Samman Nidhi)',
    slug: 'pm-kisan-samman-nidhi',
    department: 'Ministry of Agriculture & Farmers Welfare',
    level: 'central',
    state: null,
    shortDescription:
      'Direct income support of ₹6,000 per year for all landholding farmer families across India.',
    fullDescription:
      'Under PM-KISAN, a financial benefit of ₹6,000 per year is provided to all landholding farmer families, payable in three equal instalments of ₹2,000 every four months directly into the bank account linked to the beneficiary. Higher-income earners, institutional landholders, serving and retired government employees and income-tax payers are excluded.',
    targetSegments: ['farmer'],
    benefitType: 'cash',
    benefitSummary: '₹6,000 per year in 3 equal instalments of ₹2,000.',
    eligibilityRules: {
      state: [],
      ageMin: 18,
      ageMax: null,
      incomeMax: null,
      occupationCategory: ['farmer'],
      genderRestriction: null,
      categoryRestriction: ['General', 'OBC', 'SC', 'ST', 'EWS'],
      additionalConditions: [{ field: 'landOwnershipAcres', operator: 'gte', value: 0.1 }]
    },
    eligibilitySummaryPlain:
      'Any farmer family with cultivable land recorded in their name. Income-tax payers and government employees are not eligible.',
    requiredDocuments: [AADHAAR, LAND, BANK],
    applicationMode: 'online',
    officialPortalUrl: 'https://pmkisan.gov.in',
    applicationFields: [
      { fieldName: 'Aadhaar Number', instructions: '12-digit Aadhaar number', mandatory: true },
      {
        fieldName: 'Land Registration ID',
        instructions: 'As printed on your state revenue land record',
        mandatory: true
      }
    ],
    commonMistakes: [
      'Aadhaar name not matching the bank account name',
      'Not completing eKYC, which holds up the instalment',
      'Land record still in a parent’s name after inheritance'
    ],
    deadline: null,
    status: 'rolling',
    translations: {
      hi: {
        name: 'प्रधानमंत्री किसान सम्मान निधि (PM-KISAN)',
        shortDescription:
          'भारत के सभी भूमिधारक किसान परिवारों के लिए प्रति वर्ष ₹6,000 की प्रत्यक्ष आय सहायता।',
        eligibilitySummaryPlain:
          'ऐसा कोई भी किसान परिवार जिसके नाम पर खेती योग्य भूमि दर्ज है। आयकर दाता और सरकारी कर्मचारी पात्र नहीं हैं।',
        verified: true
      }
    },
    lastVerifiedAt: new Date('2026-07-15'),
    sourceRef: 'PM-KISAN Operational Guidelines — pmkisan.gov.in',
    extractionConfidence: 0.97
  },
  {
    name: 'Pradhan Mantri Fasal Bima Yojana (PMFBY)',
    slug: 'pm-fasal-bima-yojana',
    department: 'Ministry of Agriculture & Farmers Welfare',
    level: 'central',
    state: null,
    shortDescription:
      'Crop insurance against loss from natural calamity, pest and disease, at a heavily subsidised premium.',
    fullDescription:
      'PMFBY insures notified crops against yield loss from non-preventable natural risks. The farmer pays a maximum of 2% of the sum insured for kharif food and oilseed crops, 1.5% for rabi, and 5% for commercial and horticultural crops; the balance of the actuarial premium is shared by the central and state governments.',
    targetSegments: ['farmer'],
    benefitType: 'service',
    benefitSummary: 'Crop insurance at 1.5–5% farmer premium; the rest is paid by government.',
    eligibilityRules: {
      state: [],
      ageMin: 18,
      ageMax: null,
      incomeMax: null,
      occupationCategory: ['farmer'],
      genderRestriction: null,
      categoryRestriction: ['General', 'OBC', 'SC', 'ST', 'EWS'],
      additionalConditions: [
        { field: 'growsNotifiedCrop', operator: 'equals', value: true }
      ]
    },
    eligibilitySummaryPlain:
      'Any farmer — owner or tenant — growing a notified crop in a notified area. Enrolment is voluntary.',
    requiredDocuments: [
      AADHAAR,
      LAND,
      BANK,
      {
        label: 'Sowing Certificate / Declaration',
        howToObtain: 'Village patwari, or self-declaration on the portal',
        mandatory: true
      }
    ],
    applicationMode: 'both',
    officialPortalUrl: 'https://pmfby.gov.in',
    applicationFields: [
      {
        fieldName: 'Crop and Season',
        instructions: 'Select the notified crop for the current kharif or rabi season',
        mandatory: true
      },
      { fieldName: 'Area Sown (hectares)', instructions: 'As per your land record', mandatory: true }
    ],
    commonMistakes: [
      'Enrolling after the cut-off date for the season',
      'Not reporting crop loss within 72 hours of the event',
      'Insuring a crop other than the one actually sown'
    ],
    deadline: new Date('2026-12-15'),
    status: 'open',
    translations: {
      hi: {
        name: 'प्रधानमंत्री फसल बीमा योजना (PMFBY)',
        shortDescription:
          'प्राकृतिक आपदा, कीट और रोग से फसल हानि पर बीमा, अत्यधिक रियायती प्रीमियम पर।',
        eligibilitySummaryPlain:
          'अधिसूचित क्षेत्र में अधिसूचित फसल उगाने वाला कोई भी किसान — मालिक या बटाईदार। नामांकन स्वैच्छिक है।',
        verified: true
      }
    },
    lastVerifiedAt: new Date('2026-07-20'),
    sourceRef: 'PMFBY Operational Guidelines — pmfby.gov.in',
    extractionConfidence: 0.93
  },
  {
    name: 'Kisan Credit Card (KCC)',
    slug: 'kisan-credit-card',
    department: 'Ministry of Agriculture & Farmers Welfare / NABARD',
    level: 'central',
    state: null,
    shortDescription:
      'Short-term crop loan at an effective 4% interest for farmers who repay on time.',
    fullDescription:
      'The Kisan Credit Card gives farmers a running credit limit for crop production, post-harvest expenses and allied activities such as dairy and fisheries. Loans up to ₹3 lakh carry a 2% interest subvention and a further 3% prompt repayment incentive, bringing the effective rate to about 4% per annum. Collateral is not required up to ₹1.6 lakh.',
    targetSegments: ['farmer'],
    benefitType: 'loan',
    benefitSummary: 'Crop loan up to ₹3 lakh at an effective 4% a year on timely repayment.',
    eligibilityRules: {
      state: [],
      ageMin: 18,
      ageMax: 75,
      incomeMax: null,
      occupationCategory: ['farmer'],
      genderRestriction: null,
      categoryRestriction: ['General', 'OBC', 'SC', 'ST', 'EWS'],
      additionalConditions: []
    },
    eligibilitySummaryPlain:
      'Farmers who cultivate their own land, and also tenant farmers, oral lessees and sharecroppers.',
    requiredDocuments: [
      AADHAAR,
      LAND,
      PHOTO,
      { label: 'PAN Card', howToObtain: 'NSDL or UTIITSL portal', mandatory: false }
    ],
    applicationMode: 'both',
    officialPortalUrl: 'https://www.myscheme.gov.in/schemes/kcc',
    applicationFields: [
      {
        fieldName: 'Cropping Pattern',
        instructions: 'Crops grown and area under each, used to compute your credit limit',
        mandatory: true
      }
    ],
    commonMistakes: [
      'Treating the limit as a one-time loan instead of a revolving credit line',
      'Missing the repayment date and losing the 3% prompt-repayment incentive'
    ],
    deadline: null,
    status: 'rolling',
    translations: {
      hi: {
        name: 'किसान क्रेडिट कार्ड (KCC)',
        shortDescription: 'समय पर चुकाने वाले किसानों के लिए प्रभावी 4% ब्याज पर अल्पकालिक फसल ऋण।',
        eligibilitySummaryPlain:
          'अपनी भूमि पर खेती करने वाले किसान, और बटाईदार, मौखिक पट्टेदार तथा हिस्सेदार किसान भी।',
        verified: true
      }
    },
    lastVerifiedAt: new Date('2026-06-28'),
    sourceRef: 'RBI Master Circular on Kisan Credit Card Scheme',
    extractionConfidence: 0.92
  },

  // ------------------------------------------------------------------
  // CENTRAL — women
  // ------------------------------------------------------------------
  {
    name: 'Pradhan Mantri Matru Vandana Yojana (PMMVY)',
    slug: 'pm-matru-vandana-yojana',
    department: 'Ministry of Women and Child Development',
    level: 'central',
    state: null,
    shortDescription:
      'Maternity benefit of ₹5,000 for the first living child, paid directly to the mother.',
    fullDescription:
      'PMMVY provides a cash incentive to pregnant women and lactating mothers to partly compensate for wage loss and to encourage antenatal care. ₹5,000 is paid in instalments for the first living child on meeting conditions such as early pregnancy registration and antenatal check-up. For a second child, an additional ₹6,000 is paid if the child is a girl.',
    targetSegments: ['women'],
    benefitType: 'cash',
    benefitSummary: '₹5,000 for the first living child; ₹6,000 more if the second child is a girl.',
    eligibilityRules: {
      state: [],
      ageMin: 19,
      ageMax: 50,
      incomeMax: 800000,
      occupationCategory: [],
      genderRestriction: 'female',
      categoryRestriction: ['General', 'OBC', 'SC', 'ST', 'EWS'],
      additionalConditions: []
    },
    eligibilitySummaryPlain:
      'Pregnant and lactating mothers aged 19 or above, for the first living child. Women in regular government employment are not eligible.',
    requiredDocuments: [
      AADHAAR,
      BANK,
      {
        label: 'MCP Card (Mother and Child Protection Card)',
        howToObtain: 'Issued at your anganwadi centre or government health facility',
        mandatory: true
      }
    ],
    applicationMode: 'both',
    officialPortalUrl: 'https://pmmvy.wcd.gov.in',
    applicationFields: [
      { fieldName: 'LMP Date', instructions: 'Date of last menstrual period, as on the MCP card', mandatory: true }
    ],
    commonMistakes: [
      'Registering the pregnancy too late to claim the first instalment',
      'Bank account not seeded with Aadhaar (DBT-enabled)'
    ],
    deadline: null,
    status: 'rolling',
    translations: {
      hi: {
        name: 'प्रधानमंत्री मातृ वंदना योजना (PMMVY)',
        shortDescription: 'पहले जीवित बच्चे के लिए ₹5,000 की मातृत्व सहायता, सीधे माता को।',
        eligibilitySummaryPlain:
          '19 वर्ष या उससे अधिक आयु की गर्भवती और स्तनपान कराने वाली माताएँ, पहले जीवित बच्चे के लिए। नियमित सरकारी नौकरी वाली महिलाएँ पात्र नहीं हैं।',
        verified: true
      }
    },
    lastVerifiedAt: new Date('2026-07-10'),
    sourceRef: 'PMMVY Scheme Implementation Guidelines — wcd.nic.in',
    extractionConfidence: 0.94
  },
  {
    name: 'Pradhan Mantri Ujjwala Yojana (PMUY)',
    slug: 'pm-ujjwala-yojana',
    department: 'Ministry of Petroleum & Natural Gas',
    level: 'central',
    state: null,
    shortDescription:
      'Free LPG connection with deposit-free cylinder and regulator for women from poor households.',
    fullDescription:
      'PMUY provides a deposit-free LPG connection to an adult woman of a poor household, along with the first refill and a stove in many cases. The aim is to replace solid cooking fuel and reduce household air pollution. Beneficiaries also receive a targeted subsidy per 14.2 kg cylinder for a capped number of refills a year.',
    targetSegments: ['women', 'general'],
    benefitType: 'subsidy',
    benefitSummary: 'Deposit-free LPG connection plus a subsidy on refills.',
    eligibilityRules: {
      state: [],
      ageMin: 18,
      ageMax: null,
      incomeMax: 200000,
      occupationCategory: [],
      genderRestriction: 'female',
      categoryRestriction: ['General', 'OBC', 'SC', 'ST', 'EWS'],
      additionalConditions: []
    },
    eligibilitySummaryPlain:
      'An adult woman from a poor household that does not already have an LPG connection in any family member’s name.',
    requiredDocuments: [
      AADHAAR,
      BANK,
      RATION,
      {
        label: 'Self-declaration of no existing LPG connection (KYC form)',
        howToObtain: 'Available at any LPG distributor',
        mandatory: true
      }
    ],
    applicationMode: 'both',
    officialPortalUrl: 'https://www.pmuy.gov.in',
    applicationFields: [
      {
        fieldName: 'Preferred Distributor',
        instructions: 'Choose the Indane, HP or Bharat Gas distributor nearest to you',
        mandatory: true
      }
    ],
    commonMistakes: [
      'Applying when another family member already holds a connection',
      'Family details not matching the ration card'
    ],
    deadline: null,
    status: 'rolling',
    translations: {
      hi: {
        name: 'प्रधानमंत्री उज्ज्वला योजना (PMUY)',
        shortDescription:
          'गरीब परिवारों की महिलाओं के लिए बिना जमा राशि के मुफ़्त एलपीजी कनेक्शन और रेगुलेटर।',
        eligibilitySummaryPlain:
          'ऐसे गरीब परिवार की वयस्क महिला जिसके किसी भी सदस्य के नाम पहले से एलपीजी कनेक्शन नहीं है।',
        verified: true
      }
    },
    lastVerifiedAt: new Date('2026-07-05'),
    sourceRef: 'PMUY Guidelines — pmuy.gov.in',
    extractionConfidence: 0.9
  },
  {
    name: 'Sukanya Samriddhi Yojana (SSY)',
    slug: 'sukanya-samriddhi-yojana',
    department: 'Ministry of Finance — Department of Economic Affairs',
    level: 'central',
    state: null,
    shortDescription:
      'High-interest, tax-free small savings account for a girl child under 10, for her education and marriage.',
    fullDescription:
      'A Sukanya Samriddhi account can be opened in the name of a girl child below the age of ten by a parent or guardian, at any post office or authorised bank. Deposits from ₹250 to ₹1.5 lakh a year are accepted for 15 years, the account matures 21 years from opening, and both the interest and the maturity amount are exempt from income tax. Partial withdrawal is allowed for higher education after the girl turns 18.',
    targetSegments: ['women', 'student', 'general'],
    benefitType: 'service',
    benefitSummary: 'Tax-free savings account with a government-set interest rate, from ₹250 a year.',
    eligibilityRules: {
      state: [],
      ageMin: null,
      ageMax: 10,
      incomeMax: null,
      occupationCategory: [],
      genderRestriction: 'female',
      categoryRestriction: ['General', 'OBC', 'SC', 'ST', 'EWS'],
      additionalConditions: []
    },
    eligibilitySummaryPlain:
      'A girl child under 10 years old. A maximum of two accounts per family, one per girl.',
    requiredDocuments: [
      {
        label: 'Birth Certificate of the Girl Child',
        howToObtain: 'Municipal corporation or gram panchayat',
        mandatory: true
      },
      { label: 'Aadhaar / ID of Parent or Guardian', howToObtain: 'UIDAI portal', mandatory: true },
      PHOTO
    ],
    applicationMode: 'offline',
    officialPortalUrl: 'https://www.indiapost.gov.in/Financial/pages/content/post-office-saving-schemes.aspx',
    applicationFields: [
      {
        fieldName: 'Initial Deposit',
        instructions: 'Minimum ₹250 to open the account',
        mandatory: true
      }
    ],
    commonMistakes: [
      'Missing the minimum yearly deposit, which makes the account dormant',
      'Trying to open a third account in one family'
    ],
    deadline: null,
    status: 'rolling',
    translations: {
      hi: {
        name: 'सुकन्या समृद्धि योजना (SSY)',
        shortDescription:
          '10 वर्ष से कम आयु की बालिका के लिए उसकी शिक्षा और विवाह हेतु उच्च ब्याज वाला कर-मुक्त बचत खाता।',
        eligibilitySummaryPlain:
          '10 वर्ष से कम आयु की बालिका। एक परिवार में अधिकतम दो खाते, प्रति बालिका एक।',
        verified: true
      }
    },
    lastVerifiedAt: new Date('2026-06-30'),
    sourceRef: 'Sukanya Samriddhi Account Scheme Rules — India Post',
    extractionConfidence: 0.95
  },
  {
    name: 'Indira Gandhi National Widow Pension Scheme (IGNWPS)',
    slug: 'ignwps-widow-pension',
    department: 'Ministry of Rural Development',
    level: 'central',
    state: null,
    shortDescription: 'Monthly pension for widows aged 40 and above from below-poverty-line households.',
    fullDescription:
      'Part of the National Social Assistance Programme, IGNWPS pays a monthly pension to widows aged 40–79 belonging to families living below the poverty line. The central contribution is ₹300 a month, rising to ₹500 at age 80, and most states add a top-up from their own funds.',
    targetSegments: ['women', 'general'],
    benefitType: 'cash',
    benefitSummary: '₹300 a month from the centre, ₹500 after age 80, plus any state top-up.',
    eligibilityRules: {
      state: [],
      ageMin: 40,
      ageMax: null,
      incomeMax: 100000,
      occupationCategory: [],
      genderRestriction: 'female',
      categoryRestriction: ['General', 'OBC', 'SC', 'ST', 'EWS'],
      additionalConditions: [{ field: 'maritalStatus', operator: 'equals', value: 'widow' }]
    },
    eligibilitySummaryPlain:
      'Widows aged 40 or above whose household is on the BPL list, and who are not drawing another pension.',
    requiredDocuments: [
      AADHAAR,
      BANK,
      {
        label: 'Death Certificate of Husband',
        howToObtain: 'Municipal corporation or gram panchayat',
        mandatory: true
      },
      { label: 'BPL Card', howToObtain: 'Gram panchayat or municipal ward office', mandatory: true }
    ],
    applicationMode: 'both',
    officialPortalUrl: 'https://nsap.nic.in',
    applicationFields: [
      { fieldName: 'Date of Husband’s Death', instructions: 'As on the death certificate', mandatory: true }
    ],
    commonMistakes: [
      'Applying while already drawing an old-age or disability pension',
      'Household not on the current BPL list'
    ],
    deadline: null,
    status: 'rolling',
    translations: {
      hi: {
        name: 'इंदिरा गांधी राष्ट्रीय विधवा पेंशन योजना (IGNWPS)',
        shortDescription:
          'गरीबी रेखा से नीचे के परिवारों की 40 वर्ष और उससे अधिक आयु की विधवाओं के लिए मासिक पेंशन।',
        eligibilitySummaryPlain:
          '40 वर्ष या उससे अधिक आयु की विधवाएँ जिनका परिवार बीपीएल सूची में है और जो कोई अन्य पेंशन नहीं ले रहीं।',
        verified: true
      }
    },
    lastVerifiedAt: new Date('2026-07-02'),
    sourceRef: 'National Social Assistance Programme Guidelines — nsap.nic.in',
    extractionConfidence: 0.91
  },

  // ------------------------------------------------------------------
  // CENTRAL — senior citizens, general welfare
  // ------------------------------------------------------------------
  {
    name: 'Indira Gandhi National Old Age Pension Scheme (IGNOAPS)',
    slug: 'ignoaps-senior-citizen-pension',
    department: 'Ministry of Rural Development',
    level: 'central',
    state: null,
    shortDescription:
      'Monthly old-age pension for citizens aged 60 and above from below-poverty-line households.',
    fullDescription:
      'IGNOAPS provides a monthly pension to BPL citizens aged 60 and above under the National Social Assistance Programme. The central contribution is ₹200 a month for ages 60–79 and ₹500 from 80 onwards; states typically add their own contribution on top, so the amount actually received varies by state.',
    targetSegments: ['senior_citizen'],
    benefitType: 'cash',
    benefitSummary: '₹200 a month for ages 60–79, ₹500 from age 80, plus any state top-up.',
    eligibilityRules: {
      state: [],
      ageMin: 60,
      ageMax: null,
      incomeMax: 100000,
      occupationCategory: [],
      genderRestriction: null,
      categoryRestriction: ['General', 'OBC', 'SC', 'ST', 'EWS'],
      additionalConditions: []
    },
    eligibilitySummaryPlain:
      'Citizens aged 60 or above whose household is on the BPL list.',
    requiredDocuments: [
      AADHAAR,
      BANK,
      { label: 'Age Proof', howToObtain: 'Birth certificate, school record or voter ID', mandatory: true },
      { label: 'BPL Card', howToObtain: 'Gram panchayat or municipal ward office', mandatory: true }
    ],
    applicationMode: 'both',
    officialPortalUrl: 'https://nsap.nic.in',
    applicationFields: [
      { fieldName: 'Date of Birth', instructions: 'As on your age proof document', mandatory: true }
    ],
    commonMistakes: [
      'Age proof documents disagreeing with each other',
      'Household not on the current BPL list'
    ],
    deadline: null,
    status: 'rolling',
    translations: {
      hi: {
        name: 'इंदिरा गांधी राष्ट्रीय वृद्धावस्था पेंशन योजना (IGNOAPS)',
        shortDescription:
          'गरीबी रेखा से नीचे के परिवारों के 60 वर्ष और उससे अधिक आयु के नागरिकों के लिए मासिक वृद्धावस्था पेंशन।',
        eligibilitySummaryPlain: '60 वर्ष या उससे अधिक आयु के नागरिक जिनका परिवार बीपीएल सूची में है।',
        verified: true
      }
    },
    lastVerifiedAt: new Date('2026-07-12'),
    sourceRef: 'National Social Assistance Programme Guidelines — nsap.nic.in',
    extractionConfidence: 0.95
  },
  {
    name: 'Ayushman Bharat PM-JAY',
    slug: 'ayushman-bharat-pmjay',
    department: 'National Health Authority, Ministry of Health & Family Welfare',
    level: 'central',
    state: null,
    shortDescription:
      'Cashless hospital cover of ₹5 lakh per family per year at empanelled public and private hospitals.',
    fullDescription:
      'PM-JAY gives eligible families health cover of ₹5 lakh a year for secondary and tertiary hospitalisation, with no cap on family size or age. Treatment is cashless and paperless at any empanelled hospital anywhere in India, and pre-existing conditions are covered from day one. Citizens aged 70 and above are eligible irrespective of income.',
    targetSegments: ['general', 'senior_citizen'],
    benefitType: 'service',
    benefitSummary: '₹5 lakh a year of cashless hospital treatment per family.',
    eligibilityRules: {
      state: [],
      ageMin: null,
      ageMax: null,
      incomeMax: 250000,
      occupationCategory: [],
      genderRestriction: null,
      categoryRestriction: ['General', 'OBC', 'SC', 'ST', 'EWS'],
      additionalConditions: []
    },
    eligibilitySummaryPlain:
      'Families identified as deprived in the SECC database, and everyone aged 70 and above regardless of income.',
    requiredDocuments: [
      AADHAAR,
      RATION,
      {
        label: 'Ayushman Card',
        howToObtain: 'Generate free on beneficiary.nha.gov.in or at any Common Service Centre',
        mandatory: true
      }
    ],
    applicationMode: 'both',
    officialPortalUrl: 'https://beneficiary.nha.gov.in',
    applicationFields: [
      {
        fieldName: 'Family ID / Ration Card Number',
        instructions: 'Used to locate your family in the beneficiary database',
        mandatory: true
      }
    ],
    commonMistakes: [
      'Paying at the hospital when treatment should have been cashless',
      'Going to a hospital that is not empanelled',
      'Not carrying the Ayushman card and an ID at admission'
    ],
    deadline: null,
    status: 'rolling',
    translations: {
      hi: {
        name: 'आयुष्मान भारत PM-JAY',
        shortDescription:
          'सूचीबद्ध सरकारी और निजी अस्पतालों में प्रति परिवार प्रति वर्ष ₹5 लाख तक का नकद-रहित इलाज।',
        eligibilitySummaryPlain:
          'SECC डेटाबेस में वंचित के रूप में चिह्नित परिवार, और आय की परवाह किए बिना 70 वर्ष से अधिक आयु के सभी नागरिक।',
        verified: true
      }
    },
    lastVerifiedAt: new Date('2026-07-18'),
    sourceRef: 'PM-JAY Scheme Guidelines — nha.gov.in',
    extractionConfidence: 0.94
  },
  {
    name: 'Pradhan Mantri Awas Yojana — Gramin (PMAY-G)',
    slug: 'pm-awas-yojana-gramin',
    department: 'Ministry of Rural Development',
    level: 'central',
    state: null,
    shortDescription:
      'Assistance to build a pucca house for rural families who are houseless or living in a kutcha house.',
    fullDescription:
      'PMAY-G provides central assistance of ₹1.20 lakh in plain areas and ₹1.30 lakh in hilly, difficult and IAP districts towards constructing a pucca house of at least 25 square metres, with a dedicated cooking area. Beneficiaries also receive support for a toilet under SBM-G and up to 90–95 days of unskilled wage under MGNREGA.',
    targetSegments: ['general'],
    benefitType: 'subsidy',
    benefitSummary: '₹1.20 lakh in plains, ₹1.30 lakh in hill and difficult areas, in instalments.',
    eligibilityRules: {
      state: [],
      ageMin: 18,
      ageMax: null,
      incomeMax: 200000,
      occupationCategory: [],
      genderRestriction: null,
      categoryRestriction: ['General', 'OBC', 'SC', 'ST', 'EWS'],
      additionalConditions: []
    },
    eligibilitySummaryPlain:
      'Rural households that are houseless or living in a kutcha house, identified through the SECC and approved by the gram sabha.',
    requiredDocuments: [
      AADHAAR,
      BANK,
      { label: 'Job Card (MGNREGA)', howToObtain: 'Gram panchayat office', mandatory: true },
      { label: 'SBM-G Registration Number', howToObtain: 'Gram panchayat office', mandatory: false }
    ],
    applicationMode: 'offline',
    officialPortalUrl: 'https://pmayg.nic.in',
    applicationFields: [
      {
        fieldName: 'Gram Panchayat',
        instructions: 'Your registered gram panchayat, which verifies the application',
        mandatory: true
      }
    ],
    commonMistakes: [
      'Assuming you can apply directly online — selection is from the SECC list via the gram sabha',
      'Not starting construction after the first instalment, which stalls the rest'
    ],
    deadline: null,
    status: 'rolling',
    translations: {
      hi: {
        name: 'प्रधानमंत्री आवास योजना — ग्रामीण (PMAY-G)',
        shortDescription:
          'बेघर या कच्चे मकान में रहने वाले ग्रामीण परिवारों को पक्का मकान बनाने के लिए सहायता।',
        eligibilitySummaryPlain:
          'बेघर या कच्चे मकान में रहने वाले ग्रामीण परिवार, SECC सूची से चिह्नित और ग्राम सभा द्वारा अनुमोदित।',
        verified: true
      }
    },
    lastVerifiedAt: new Date('2026-06-25'),
    sourceRef: 'PMAY-G Framework for Implementation — pmayg.nic.in',
    extractionConfidence: 0.9
  },
  {
    name: 'Atal Pension Yojana (APY)',
    slug: 'atal-pension-yojana',
    department: 'Ministry of Finance / PFRDA',
    level: 'central',
    state: null,
    shortDescription:
      'Guaranteed monthly pension of ₹1,000 to ₹5,000 after 60, for workers in the unorganised sector.',
    fullDescription:
      'Atal Pension Yojana is a contributory scheme for unorganised-sector workers between 18 and 40. The subscriber chooses a pension of ₹1,000, ₹2,000, ₹3,000, ₹4,000 or ₹5,000 a month from age 60; the contribution depends on the chosen amount and the age at joining. The same pension continues to the spouse after the subscriber’s death, and the accumulated corpus goes to the nominee.',
    targetSegments: ['general', 'jobseeker'],
    benefitType: 'service',
    benefitSummary: 'Guaranteed ₹1,000–₹5,000 a month from age 60, for life.',
    eligibilityRules: {
      state: [],
      ageMin: 18,
      ageMax: 40,
      incomeMax: null,
      occupationCategory: [],
      genderRestriction: null,
      categoryRestriction: ['General', 'OBC', 'SC', 'ST', 'EWS'],
      additionalConditions: []
    },
    eligibilitySummaryPlain:
      'Any citizen aged 18 to 40 with a bank account, who is not an income-tax payer.',
    requiredDocuments: [AADHAAR, BANK],
    applicationMode: 'both',
    officialPortalUrl: 'https://www.npscra.nsdl.co.in/scheme-details.php',
    applicationFields: [
      {
        fieldName: 'Chosen Pension Amount',
        instructions: '₹1,000 / ₹2,000 / ₹3,000 / ₹4,000 / ₹5,000 per month',
        mandatory: true
      }
    ],
    commonMistakes: [
      'Joining after 40, which is not permitted',
      'Insufficient balance on the auto-debit date, which attracts a penalty'
    ],
    deadline: null,
    status: 'rolling',
    translations: {
      hi: {
        name: 'अटल पेंशन योजना (APY)',
        shortDescription:
          'असंगठित क्षेत्र के श्रमिकों के लिए 60 वर्ष के बाद ₹1,000 से ₹5,000 तक की गारंटीशुदा मासिक पेंशन।',
        eligibilitySummaryPlain:
          'बैंक खाता रखने वाला 18 से 40 वर्ष का कोई भी नागरिक, जो आयकर दाता न हो।',
        verified: true
      }
    },
    lastVerifiedAt: new Date('2026-06-20'),
    sourceRef: 'APY Scheme Details — PFRDA / npscra.nsdl.co.in',
    extractionConfidence: 0.93
  },

  // ------------------------------------------------------------------
  // CENTRAL — MSME, entrepreneurs, job seekers
  // ------------------------------------------------------------------
  {
    name: 'Pradhan Mantri MUDRA Yojana (PMMY) — Shishu / Kishore / Tarun',
    slug: 'pm-mudra-yojana',
    department: 'Ministry of Finance / MUDRA Ltd',
    level: 'central',
    state: null,
    shortDescription:
      'Collateral-free business loan up to ₹10 lakh for non-farm micro and small enterprises.',
    fullDescription:
      'PMMY provides collateral-free institutional credit to non-corporate, non-farm micro enterprises through banks, NBFCs and MFIs, in three categories: Shishu up to ₹50,000, Kishore from ₹50,000 to ₹5 lakh, and Tarun from ₹5 lakh to ₹10 lakh. Loans can be used for working capital or for buying equipment and vehicles used in the business.',
    targetSegments: ['msme', 'women', 'jobseeker'],
    benefitType: 'loan',
    benefitSummary: 'Collateral-free loan up to ₹10 lakh across Shishu, Kishore and Tarun.',
    eligibilityRules: {
      state: [],
      ageMin: 18,
      ageMax: 65,
      incomeMax: null,
      occupationCategory: ['self_employed', 'msme'],
      genderRestriction: null,
      categoryRestriction: ['General', 'OBC', 'SC', 'ST', 'EWS'],
      additionalConditions: []
    },
    eligibilitySummaryPlain:
      'Any Indian citizen running or starting a non-farm micro business, with a viable business plan and no loan default history.',
    requiredDocuments: [
      AADHAAR,
      BANK,
      { label: 'PAN Card', howToObtain: 'NSDL or UTIITSL portal', mandatory: true },
      {
        label: 'Business Plan / Quotation for Machinery',
        howToObtain: 'Prepare yourself, or with help from a DIC or bank officer',
        mandatory: true
      },
      {
        label: 'Udyam Registration',
        howToObtain: 'Free on udyamregistration.gov.in',
        mandatory: false
      }
    ],
    applicationMode: 'both',
    officialPortalUrl: 'https://www.mudra.org.in',
    applicationFields: [
      {
        fieldName: 'Loan Category',
        instructions: 'Shishu (up to ₹50,000), Kishore (₹50,000–₹5 lakh) or Tarun (₹5–10 lakh)',
        mandatory: true
      },
      { fieldName: 'Nature of Business', instructions: 'What the business does', mandatory: true }
    ],
    commonMistakes: [
      'Applying for agriculture activity, which MUDRA does not cover',
      'Being asked for collateral — MUDRA loans are collateral-free by design',
      'Applying for more than the category ceiling'
    ],
    deadline: null,
    status: 'rolling',
    translations: {
      hi: {
        name: 'प्रधानमंत्री मुद्रा योजना (PMMY) — शिशु / किशोर / तरुण',
        shortDescription:
          'गैर-कृषि सूक्ष्म और लघु उद्यमों के लिए ₹10 लाख तक का बिना गारंटी व्यवसाय ऋण।',
        eligibilitySummaryPlain:
          'गैर-कृषि सूक्ष्म व्यवसाय चलाने या शुरू करने वाला कोई भी भारतीय नागरिक, जिसके पास व्यवहार्य व्यवसाय योजना हो और ऋण चूक का इतिहास न हो।',
        verified: true
      }
    },
    lastVerifiedAt: new Date('2026-07-08'),
    sourceRef: 'PMMY Guidelines — mudra.org.in',
    extractionConfidence: 0.95
  },
  {
    name: 'Stand-Up India',
    slug: 'stand-up-india',
    department: 'Department of Financial Services, Ministry of Finance',
    level: 'central',
    state: null,
    shortDescription:
      'Bank loan from ₹10 lakh to ₹1 crore for SC, ST and women entrepreneurs setting up a new enterprise.',
    fullDescription:
      'Stand-Up India requires every scheduled commercial bank branch to facilitate a loan between ₹10 lakh and ₹1 crore to at least one Scheduled Caste or Scheduled Tribe borrower and at least one woman borrower, for setting up a greenfield enterprise in manufacturing, services, trading or an agriculture-allied activity. The loan is repayable over seven years with a moratorium of up to 18 months.',
    targetSegments: ['msme', 'women', 'jobseeker'],
    benefitType: 'loan',
    benefitSummary: '₹10 lakh to ₹1 crore composite loan, repayable over 7 years.',
    eligibilityRules: {
      state: [],
      ageMin: 18,
      ageMax: null,
      incomeMax: null,
      occupationCategory: ['self_employed', 'msme'],
      genderRestriction: null,
      categoryRestriction: ['SC', 'ST'],
      additionalConditions: [
        { field: 'enterpriseType', operator: 'equals', value: 'greenfield' }
      ]
    },
    eligibilitySummaryPlain:
      'SC, ST or women entrepreneurs aged 18 and above, setting up a brand-new enterprise. For non-individual firms, at least 51% must be held by the eligible entrepreneur.',
    requiredDocuments: [
      AADHAAR,
      CASTE,
      { label: 'PAN Card', howToObtain: 'NSDL or UTIITSL portal', mandatory: true },
      {
        label: 'Detailed Project Report',
        howToObtain: 'Prepare with a chartered accountant or the Stand-Up Mitra portal',
        mandatory: true
      }
    ],
    applicationMode: 'online',
    officialPortalUrl: 'https://www.standupmitra.in',
    applicationFields: [
      {
        fieldName: 'Project Cost',
        instructions: 'Total cost; the loan covers up to 85% of it',
        mandatory: true
      }
    ],
    commonMistakes: [
      'Applying for an existing business — only greenfield projects qualify',
      'Not arranging the borrower’s own margin contribution'
    ],
    deadline: null,
    status: 'rolling',
    translations: {
      hi: {
        name: 'स्टैंड-अप इंडिया',
        shortDescription:
          'नया उद्यम शुरू करने वाले अनुसूचित जाति, अनुसूचित जनजाति और महिला उद्यमियों के लिए ₹10 लाख से ₹1 करोड़ तक का बैंक ऋण।',
        eligibilitySummaryPlain:
          '18 वर्ष से अधिक आयु के अनुसूचित जाति, अनुसूचित जनजाति या महिला उद्यमी, जो बिल्कुल नया उद्यम शुरू कर रहे हों।',
        verified: true
      }
    },
    lastVerifiedAt: new Date('2026-06-22'),
    sourceRef: 'Stand-Up India Scheme Guidelines — standupmitra.in',
    extractionConfidence: 0.92
  },
  {
    name: 'PM Vishwakarma',
    slug: 'pm-vishwakarma',
    department: 'Ministry of Micro, Small and Medium Enterprises',
    level: 'central',
    state: null,
    shortDescription:
      'Recognition, skill training with stipend, a toolkit grant and collateral-free credit for traditional artisans.',
    fullDescription:
      'PM Vishwakarma supports artisans and craftspeople working with their hands and tools in eighteen recognised trades, such as carpenter, blacksmith, goldsmith, potter, cobbler, tailor and barber. Benefits include a certificate and ID, basic and advanced skill training with a stipend of ₹500 a day, a ₹15,000 toolkit incentive, and collateral-free enterprise loans of ₹1 lakh and then ₹2 lakh at a concessional 5% interest.',
    targetSegments: ['msme', 'jobseeker'],
    benefitType: 'loan',
    benefitSummary: '₹15,000 toolkit grant, ₹500/day training stipend, and ₹1–3 lakh credit at 5%.',
    eligibilityRules: {
      state: [],
      ageMin: 18,
      ageMax: null,
      incomeMax: null,
      occupationCategory: ['artisan', 'self_employed', 'msme'],
      genderRestriction: null,
      categoryRestriction: ['General', 'OBC', 'SC', 'ST', 'EWS'],
      additionalConditions: [
        {
          field: 'trade',
          operator: 'in',
          value: ['carpenter', 'blacksmith', 'goldsmith', 'potter', 'cobbler', 'tailor', 'barber', 'mason']
        }
      ]
    },
    eligibilitySummaryPlain:
      'Artisans aged 18 or above working in one of the 18 listed trades. One member per family, and not someone who has taken a similar loan under PMEGP or MUDRA in the last five years.',
    requiredDocuments: [
      AADHAAR,
      BANK,
      RATION,
      {
        label: 'Proof of Trade / Self-declaration',
        howToObtain: 'Verified by your gram panchayat or urban local body',
        mandatory: true
      }
    ],
    applicationMode: 'online',
    officialPortalUrl: 'https://pmvishwakarma.gov.in',
    applicationFields: [
      { fieldName: 'Trade', instructions: 'Select one of the 18 recognised trades', mandatory: true }
    ],
    commonMistakes: [
      'More than one family member applying',
      'Applying for a trade that is not on the list of 18',
      'Skipping the mandatory basic training, which unlocks the toolkit grant'
    ],
    deadline: null,
    status: 'open',
    translations: {
      hi: {
        name: 'पीएम विश्वकर्मा',
        shortDescription:
          'पारंपरिक कारीगरों के लिए पहचान, वजीफे के साथ कौशल प्रशिक्षण, औज़ार अनुदान और बिना गारंटी ऋण।',
        eligibilitySummaryPlain:
          '18 सूचीबद्ध पारंपरिक व्यवसायों में से किसी एक में काम करने वाले 18 वर्ष या उससे अधिक आयु के कारीगर। प्रति परिवार एक सदस्य।',
        verified: true
      }
    },
    lastVerifiedAt: new Date('2026-07-22'),
    sourceRef: 'PM Vishwakarma Scheme Guidelines — pmvishwakarma.gov.in',
    extractionConfidence: 0.93
  },
  {
    name: 'Prime Minister’s Employment Generation Programme (PMEGP)',
    slug: 'pmegp',
    department: 'Ministry of MSME / KVIC',
    level: 'central',
    state: null,
    shortDescription:
      'Capital subsidy of 15–35% for setting up a new micro enterprise in manufacturing or services.',
    fullDescription:
      'PMEGP is a credit-linked subsidy programme for setting up new micro enterprises — up to ₹50 lakh in manufacturing and ₹20 lakh in services. The margin money subsidy is 15–25% in urban areas and 25–35% in rural areas, with the higher rate for SC, ST, OBC, women, ex-servicemen, PwD and North-Eastern applicants. The bank funds the balance.',
    targetSegments: ['msme', 'jobseeker', 'women'],
    benefitType: 'subsidy',
    benefitSummary: '15–35% capital subsidy on a project up to ₹50 lakh (manufacturing).',
    eligibilityRules: {
      state: [],
      ageMin: 18,
      ageMax: null,
      incomeMax: null,
      occupationCategory: ['self_employed', 'msme', 'unemployed'],
      genderRestriction: null,
      categoryRestriction: ['General', 'OBC', 'SC', 'ST', 'EWS'],
      additionalConditions: [
        { field: 'enterpriseType', operator: 'equals', value: 'greenfield' }
      ]
    },
    eligibilitySummaryPlain:
      'Anyone above 18 setting up a new unit. Projects above ₹10 lakh in manufacturing or ₹5 lakh in services need at least a Class VIII pass.',
    requiredDocuments: [
      AADHAAR,
      { label: 'PAN Card', howToObtain: 'NSDL or UTIITSL portal', mandatory: true },
      {
        label: 'Project Report',
        howToObtain: 'Prepare yourself or through the District Industries Centre',
        mandatory: true
      },
      {
        label: 'Education Certificate',
        howToObtain: 'Your school or board',
        mandatory: false
      },
      CASTE
    ],
    applicationMode: 'online',
    officialPortalUrl: 'https://www.kviconline.gov.in/pmegpeportal',
    applicationFields: [
      { fieldName: 'Project Cost', instructions: 'Total capital cost of the unit', mandatory: true },
      { fieldName: 'Area', instructions: 'Rural or urban — this sets your subsidy rate', mandatory: true }
    ],
    commonMistakes: [
      'Applying for an existing business rather than a new unit',
      'Not attending the mandatory EDP training before disbursement'
    ],
    deadline: null,
    status: 'rolling',
    translations: {
      hi: {
        name: 'प्रधानमंत्री रोजगार सृजन कार्यक्रम (PMEGP)',
        shortDescription:
          'विनिर्माण या सेवा क्षेत्र में नया सूक्ष्म उद्यम स्थापित करने के लिए 15–35% पूंजी सब्सिडी।',
        eligibilitySummaryPlain:
          '18 वर्ष से अधिक आयु का कोई भी व्यक्ति जो नई इकाई स्थापित कर रहा हो। बड़ी परियोजनाओं के लिए कम से कम आठवीं पास होना आवश्यक है।',
        verified: true
      }
    },
    lastVerifiedAt: new Date('2026-06-18'),
    sourceRef: 'PMEGP Guidelines — kviconline.gov.in',
    extractionConfidence: 0.91
  },
  {
    name: 'Pradhan Mantri Kaushal Vikas Yojana (PMKVY 4.0)',
    slug: 'pmkvy-skill-training',
    department: 'Ministry of Skill Development and Entrepreneurship',
    level: 'central',
    state: null,
    shortDescription:
      'Free short-term skill training with certification and placement assistance for youth.',
    fullDescription:
      'PMKVY offers free short-term training courses aligned to National Skills Qualification Framework job roles, along with Recognition of Prior Learning for people already working in a trade. Successful candidates receive a government-recognised certificate and placement support. Training covers emerging areas such as AI, robotics, drones and mechatronics alongside traditional trades.',
    targetSegments: ['jobseeker', 'student'],
    benefitType: 'service',
    benefitSummary: 'Free NSQF-aligned training, certification and placement assistance.',
    eligibilityRules: {
      state: [],
      ageMin: 15,
      ageMax: 45,
      incomeMax: null,
      occupationCategory: ['unemployed', 'student'],
      genderRestriction: null,
      categoryRestriction: ['General', 'OBC', 'SC', 'ST', 'EWS'],
      additionalConditions: []
    },
    eligibilitySummaryPlain:
      'Indian citizens between 15 and 45 who are unemployed, school or college dropouts, or looking to upskill.',
    requiredDocuments: [
      AADHAAR,
      BANK,
      {
        label: 'Education Certificate',
        howToObtain: 'Your school or board — the requirement varies by job role',
        mandatory: false
      }
    ],
    applicationMode: 'online',
    officialPortalUrl: 'https://www.skillindiadigital.gov.in',
    applicationFields: [
      { fieldName: 'Job Role', instructions: 'Choose the NSQF job role you want to train for', mandatory: true },
      { fieldName: 'Preferred Training Centre', instructions: 'Select a centre near you', mandatory: true }
    ],
    commonMistakes: [
      'Enrolling at a centre that is not empanelled, so the certificate is not recognised',
      'Dropping out before assessment, which forfeits the certificate'
    ],
    deadline: null,
    status: 'rolling',
    translations: {
      hi: {
        name: 'प्रधानमंत्री कौशल विकास योजना (PMKVY 4.0)',
        shortDescription:
          'युवाओं के लिए प्रमाणन और प्लेसमेंट सहायता के साथ नि:शुल्क अल्पकालिक कौशल प्रशिक्षण।',
        eligibilitySummaryPlain:
          '15 से 45 वर्ष के भारतीय नागरिक जो बेरोजगार हैं, स्कूल या कॉलेज छोड़ चुके हैं, या अपना कौशल बढ़ाना चाहते हैं।',
        verified: true
      }
    },
    lastVerifiedAt: new Date('2026-07-14'),
    sourceRef: 'PMKVY 4.0 Guidelines — skillindiadigital.gov.in',
    extractionConfidence: 0.9
  },
  {
    name: 'Deen Dayal Upadhyaya Grameen Kaushalya Yojana (DDU-GKY)',
    slug: 'ddu-gky',
    department: 'Ministry of Rural Development',
    level: 'central',
    state: null,
    shortDescription:
      'Free residential skill training with guaranteed placement for poor rural youth.',
    fullDescription:
      'DDU-GKY funds free skill training for rural youth from poor families, with free food and accommodation for residential courses, post-placement support and career progression tracking. Training partners are mandated to place at least 70% of trained candidates in jobs paying at least the minimum wage.',
    targetSegments: ['jobseeker'],
    benefitType: 'service',
    benefitSummary: 'Free training with food and lodging, and a mandated 70% placement rate.',
    eligibilityRules: {
      state: [],
      ageMin: 15,
      ageMax: 35,
      incomeMax: 250000,
      occupationCategory: ['unemployed'],
      genderRestriction: null,
      categoryRestriction: ['General', 'OBC', 'SC', 'ST', 'EWS'],
      additionalConditions: []
    },
    eligibilitySummaryPlain:
      'Rural youth aged 15 to 35 from poor households. The upper age limit is 45 for women and other vulnerable groups.',
    requiredDocuments: [AADHAAR, BANK, INCOME, PHOTO],
    applicationMode: 'both',
    officialPortalUrl: 'https://ddugky.gov.in',
    applicationFields: [
      { fieldName: 'Preferred Trade', instructions: 'The sector you want to train in', mandatory: true }
    ],
    commonMistakes: [
      'Applying without household verification through the gram panchayat',
      'Leaving the course midway, which counts against the training partner and you'
    ],
    deadline: null,
    status: 'rolling',
    translations: {
      hi: {
        name: 'दीन दयाल उपाध्याय ग्रामीण कौशल्य योजना (DDU-GKY)',
        shortDescription:
          'गरीब ग्रामीण युवाओं के लिए नि:शुल्क आवासीय कौशल प्रशिक्षण, प्लेसमेंट की गारंटी के साथ।',
        eligibilitySummaryPlain:
          'गरीब परिवारों के 15 से 35 वर्ष के ग्रामीण युवा। महिलाओं और अन्य कमजोर वर्गों के लिए आयु सीमा 45 वर्ष है।',
        verified: true
      }
    },
    lastVerifiedAt: new Date('2026-06-15'),
    sourceRef: 'DDU-GKY Guidelines — ddugky.gov.in',
    extractionConfidence: 0.89
  },

  // ------------------------------------------------------------------
  // CENTRAL — persons with disability
  // ------------------------------------------------------------------
  {
    name: 'ADIP — Assistance to Disabled Persons for Purchase of Aids and Appliances',
    slug: 'adip-aids-appliances',
    department: 'Department of Empowerment of Persons with Disabilities (DEPwD)',
    level: 'central',
    state: null,
    shortDescription:
      'Free or subsidised assistive devices — motorised tricycle, hearing aid, prosthetics, Braille kit.',
    fullDescription:
      'The ADIP scheme helps persons with disabilities obtain durable, scientifically manufactured and standard aids and appliances that promote independence. Devices are supplied free where monthly income is up to ₹15,000, and at 50% cost where income is between ₹15,001 and ₹20,000. Distribution happens through ALIMCO, national institutes and implementing agencies at organised camps.',
    targetSegments: ['pwd'],
    benefitType: 'subsidy',
    benefitSummary: 'Assistive devices free below ₹15,000 monthly income, 50% subsidised above it.',
    eligibilityRules: {
      state: [],
      ageMin: null,
      ageMax: null,
      incomeMax: 240000,
      occupationCategory: [],
      genderRestriction: null,
      categoryRestriction: ['General', 'OBC', 'SC', 'ST', 'EWS'],
      additionalConditions: [
        { field: 'disabilityPercentage', operator: 'gte', value: 40 }
      ]
    },
    eligibilitySummaryPlain:
      'Persons with 40% or more certified disability whose monthly income is up to ₹20,000, who have not received the same device in the last three years.',
    requiredDocuments: [
      AADHAAR,
      DISABILITY,
      INCOME,
      PHOTO
    ],
    applicationMode: 'both',
    officialPortalUrl: 'https://www.adip.depwd.gov.in',
    applicationFields: [
      {
        fieldName: 'Device Required',
        instructions: 'The aid or appliance you need, as assessed at a camp or hospital',
        mandatory: true
      }
    ],
    commonMistakes: [
      'Applying again within three years of receiving the same device (ten years for spectacles)',
      'Disability certificate below the 40% threshold'
    ],
    deadline: null,
    status: 'rolling',
    translations: {
      hi: {
        name: 'ADIP — दिव्यांगजनों को सहायक उपकरण खरीद हेतु सहायता',
        shortDescription:
          'नि:शुल्क या रियायती सहायक उपकरण — मोटर चालित ट्राइसाइकिल, श्रवण यंत्र, कृत्रिम अंग, ब्रेल किट।',
        eligibilitySummaryPlain:
          '40% या अधिक प्रमाणित दिव्यांगता वाले व्यक्ति जिनकी मासिक आय ₹20,000 तक है और जिन्हें पिछले तीन वर्षों में वही उपकरण नहीं मिला है।',
        verified: true
      }
    },
    lastVerifiedAt: new Date('2026-07-06'),
    sourceRef: 'ADIP Scheme Guidelines — depwd.gov.in',
    extractionConfidence: 0.92
  },
  {
    name: 'Indira Gandhi National Disability Pension Scheme (IGNDPS)',
    slug: 'igndps-disability-pension',
    department: 'Ministry of Rural Development',
    level: 'central',
    state: null,
    shortDescription:
      'Monthly pension for persons with severe or multiple disabilities from BPL households.',
    fullDescription:
      'Under the National Social Assistance Programme, IGNDPS pays a monthly pension to persons aged 18 and above with 80% or more disability who belong to families below the poverty line. The central contribution is ₹300 a month, rising to ₹500 at age 80, with most states adding a top-up.',
    targetSegments: ['pwd'],
    benefitType: 'cash',
    benefitSummary: '₹300 a month from the centre, ₹500 after age 80, plus any state top-up.',
    eligibilityRules: {
      state: [],
      ageMin: 18,
      ageMax: null,
      incomeMax: 100000,
      occupationCategory: [],
      genderRestriction: null,
      categoryRestriction: ['General', 'OBC', 'SC', 'ST', 'EWS'],
      additionalConditions: [
        { field: 'disabilityPercentage', operator: 'gte', value: 80 }
      ]
    },
    eligibilitySummaryPlain:
      'Persons aged 18 or above with 80% or more disability, from a household on the BPL list.',
    requiredDocuments: [AADHAAR, BANK, DISABILITY, { label: 'BPL Card', howToObtain: 'Gram panchayat or municipal ward office', mandatory: true }],
    applicationMode: 'both',
    officialPortalUrl: 'https://nsap.nic.in',
    applicationFields: [
      { fieldName: 'UDID Number', instructions: 'As printed on your disability card', mandatory: true }
    ],
    commonMistakes: [
      'Disability certified between 40% and 79%, which does not meet this scheme’s bar',
      'Already drawing an old-age or widow pension'
    ],
    deadline: null,
    status: 'rolling',
    translations: {
      hi: {
        name: 'इंदिरा गांधी राष्ट्रीय दिव्यांग पेंशन योजना (IGNDPS)',
        shortDescription:
          'बीपीएल परिवारों के गंभीर या बहु-दिव्यांगता वाले व्यक्तियों के लिए मासिक पेंशन।',
        eligibilitySummaryPlain:
          '18 वर्ष या उससे अधिक आयु के ऐसे व्यक्ति जिनकी दिव्यांगता 80% या अधिक है और जिनका परिवार बीपीएल सूची में है।',
        verified: true
      }
    },
    lastVerifiedAt: new Date('2026-07-02'),
    sourceRef: 'National Social Assistance Programme Guidelines — nsap.nic.in',
    extractionConfidence: 0.93
  },

  // ------------------------------------------------------------------
  // CENTRAL — students
  // ------------------------------------------------------------------
  {
    name: 'Post Matric Scholarship for SC Students',
    slug: 'post-matric-scholarship-sc',
    department: 'Ministry of Social Justice and Empowerment',
    level: 'central',
    state: null,
    shortDescription:
      'Full tuition reimbursement and maintenance allowance for SC students after Class X.',
    fullDescription:
      'This centrally sponsored scheme covers Scheduled Caste students pursuing any recognised post-matriculation course, from Class XI through to research degrees. It reimburses compulsory non-refundable fees charged by the institution and pays a monthly maintenance allowance that varies by course group and whether the student is a hosteller or day scholar.',
    targetSegments: ['student'],
    benefitType: 'certificate',
    benefitSummary: 'Full course fee reimbursement plus a monthly maintenance allowance.',
    eligibilityRules: {
      state: [],
      ageMin: 15,
      ageMax: 35,
      incomeMax: 250000,
      occupationCategory: ['student'],
      genderRestriction: null,
      categoryRestriction: ['SC'],
      additionalConditions: [
        {
          field: 'educationLevel',
          operator: 'in',
          value: ['higher_secondary', 'undergraduate', 'postgraduate', 'doctorate']
        }
      ]
    },
    eligibilitySummaryPlain:
      'Scheduled Caste students in a recognised post-matric course whose family income is up to ₹2.5 lakh a year.',
    requiredDocuments: [AADHAAR, CASTE, INCOME, BANK, {
      label: 'Previous Year Marksheet',
      howToObtain: 'Your school, college or board',
      mandatory: true
    }],
    applicationMode: 'online',
    officialPortalUrl: 'https://scholarships.gov.in',
    applicationFields: [
      { fieldName: 'Institute Name', instructions: 'Select from the NSP institute list', mandatory: true },
      { fieldName: 'Course and Year', instructions: 'Current course and year of study', mandatory: true }
    ],
    commonMistakes: [
      'Missing the annual National Scholarship Portal deadline',
      'Not completing institute-level verification after submitting',
      'Bank account not in the student’s own name'
    ],
    deadline: new Date('2026-10-31'),
    status: 'open',
    translations: {
      hi: {
        name: 'अनुसूचित जाति छात्रों हेतु पोस्ट मैट्रिक छात्रवृत्ति',
        shortDescription:
          'दसवीं के बाद अनुसूचित जाति के छात्रों के लिए पूर्ण शुल्क प्रतिपूर्ति और निर्वाह भत्ता।',
        eligibilitySummaryPlain:
          'मान्यता प्राप्त पोस्ट-मैट्रिक पाठ्यक्रम में पढ़ रहे अनुसूचित जाति के छात्र जिनकी पारिवारिक आय ₹2.5 लाख प्रति वर्ष तक है।',
        verified: true
      }
    },
    lastVerifiedAt: new Date('2026-07-16'),
    sourceRef: 'Post Matric Scholarship Guidelines — scholarships.gov.in',
    extractionConfidence: 0.94
  },
  {
    name: 'National Means-cum-Merit Scholarship (NMMSS)',
    slug: 'nmmss-scholarship',
    department: 'Ministry of Education',
    level: 'central',
    state: null,
    shortDescription:
      'Scholarship of ₹12,000 a year for meritorious Class IX–XII students from low-income families.',
    fullDescription:
      'NMMSS awards scholarships to bright students from economically weaker families to reduce dropout at Class VIII and encourage them to continue to Class XII. Selection is through a state-level examination consisting of a Mental Ability Test and a Scholastic Aptitude Test. The award continues from Class IX to XII subject to satisfactory academic progress.',
    targetSegments: ['student'],
    benefitType: 'certificate',
    benefitSummary: '₹12,000 a year from Class IX to Class XII.',
    eligibilityRules: {
      state: [],
      ageMin: 12,
      ageMax: 20,
      incomeMax: 350000,
      occupationCategory: ['student'],
      genderRestriction: null,
      categoryRestriction: ['General', 'OBC', 'SC', 'ST', 'EWS'],
      additionalConditions: [
        { field: 'educationLevel', operator: 'in', value: ['secondary', 'higher_secondary'] }
      ]
    },
    eligibilitySummaryPlain:
      'Students in a government, local body or government-aided school who scored at least 55% in Class VII, with family income up to ₹3.5 lakh.',
    requiredDocuments: [AADHAAR, INCOME, BANK, {
      label: 'Class VII Marksheet',
      howToObtain: 'Your school',
      mandatory: true
    }],
    applicationMode: 'online',
    officialPortalUrl: 'https://scholarships.gov.in',
    applicationFields: [
      { fieldName: 'School Details', instructions: 'Government or aided school only', mandatory: true }
    ],
    commonMistakes: [
      'Applying from a private unaided school, which is not covered',
      'Not sitting the state selection test'
    ],
    deadline: new Date('2026-11-30'),
    status: 'open',
    translations: {
      hi: {
        name: 'राष्ट्रीय साधन-सह-मेधा छात्रवृत्ति (NMMSS)',
        shortDescription:
          'कम आय वाले परिवारों के मेधावी कक्षा 9–12 के छात्रों के लिए ₹12,000 वार्षिक छात्रवृत्ति।',
        eligibilitySummaryPlain:
          'सरकारी या सहायता प्राप्त विद्यालय के छात्र जिन्होंने कक्षा 7 में कम से कम 55% अंक प्राप्त किए हों और पारिवारिक आय ₹3.5 लाख तक हो।',
        verified: true
      }
    },
    lastVerifiedAt: new Date('2026-07-16'),
    sourceRef: 'NMMSS Guidelines — scholarships.gov.in / Ministry of Education',
    extractionConfidence: 0.9
  },

  // ------------------------------------------------------------------
  // STATE — Karnataka
  // ------------------------------------------------------------------
  {
    name: 'Karnataka Vidyasiri Scholarship',
    slug: 'karnataka-vidyasiri-scholarship',
    department: 'Department of Backward Classes Welfare, Karnataka',
    level: 'state',
    state: 'Karnataka',
    shortDescription:
      'Food and accommodation fee reimbursement for post-matric students from low-income families.',
    fullDescription:
      'Vidyasiri provides financial assistance towards hostel and food expenses for students pursuing post-matric courses who belong to backward classes and minority communities and could not get a place in a government hostel. The assistance is paid directly into the student’s bank account.',
    targetSegments: ['student'],
    benefitType: 'subsidy',
    benefitSummary: 'Around ₹15,000 a year towards food and hostel expenses.',
    eligibilityRules: {
      state: ['Karnataka'],
      ageMin: 17,
      ageMax: 25,
      incomeMax: 250000,
      occupationCategory: ['student'],
      genderRestriction: null,
      categoryRestriction: ['OBC', 'SC', 'ST', 'EWS'],
      additionalConditions: [
        { field: 'educationLevel', operator: 'in', value: ['undergraduate', 'postgraduate'] }
      ]
    },
    eligibilitySummaryPlain:
      'Karnataka post-matric students from families earning under ₹2.5 lakh a year who did not get government hostel accommodation.',
    requiredDocuments: [
      INCOME,
      CASTE,
      AADHAAR,
      {
        label: 'College Admission Receipt',
        howToObtain: 'Your college administration',
        mandatory: true
      }
    ],
    applicationMode: 'online',
    officialPortalUrl: 'https://ssp.postmatric.karnataka.gov.in',
    applicationFields: [
      { fieldName: 'SATS / Student ID', instructions: 'Your state student ID', mandatory: true },
      { fieldName: 'College Name', instructions: 'Select your college from the list', mandatory: true }
    ],
    commonMistakes: [
      'Aadhaar name not matching college records',
      'Submitting an expired income certificate'
    ],
    deadline: new Date('2026-10-31'),
    status: 'open',
    translations: {
      hi: {
        name: 'कर्नाटक विद्यासिरी छात्रवृत्ति',
        shortDescription:
          'कम आय वाले परिवारों के छात्रों के लिए भोजन और छात्रावास शुल्क प्रतिपूर्ति छात्रवृत्ति।',
        eligibilitySummaryPlain:
          'कर्नाटक के पोस्ट-मैट्रिक छात्र जिनकी पारिवारिक वार्षिक आय ₹2.5 लाख से कम है और जिन्हें सरकारी छात्रावास नहीं मिला।',
        verified: true
      }
    },
    lastVerifiedAt: new Date('2026-07-01'),
    sourceRef: 'Karnataka Backward Classes Welfare Department — ssp.postmatric.karnataka.gov.in',
    extractionConfidence: 0.93
  },
  {
    name: 'Gruha Lakshmi (Karnataka)',
    slug: 'karnataka-gruha-lakshmi',
    department: 'Department of Women and Child Development, Karnataka',
    level: 'state',
    state: 'Karnataka',
    shortDescription:
      'Monthly payment of ₹2,000 to the woman head of every eligible household in Karnataka.',
    fullDescription:
      'Gruha Lakshmi transfers ₹2,000 a month to the woman recorded as head of the family on a BPL, APL or Antyodaya ration card in Karnataka. Households where a member is an income-tax payer or GST filer are excluded. Payment is made by direct benefit transfer to the woman’s own Aadhaar-linked account.',
    targetSegments: ['women', 'general'],
    benefitType: 'cash',
    benefitSummary: '₹2,000 every month to the woman head of the household.',
    eligibilityRules: {
      state: ['Karnataka'],
      ageMin: 18,
      ageMax: null,
      incomeMax: null,
      occupationCategory: [],
      genderRestriction: 'female',
      categoryRestriction: ['General', 'OBC', 'SC', 'ST', 'EWS'],
      additionalConditions: [
        { field: 'isHeadOfFamily', operator: 'equals', value: true }
      ]
    },
    eligibilitySummaryPlain:
      'Woman named as head of the family on a Karnataka ration card, where no family member pays income tax or files GST.',
    requiredDocuments: [
      AADHAAR,
      RATION,
      BANK,
      {
        label: 'Aadhaar-linked Bank Account of the Woman',
        howToObtain: 'Seed Aadhaar at your bank branch',
        mandatory: true
      }
    ],
    applicationMode: 'both',
    officialPortalUrl: 'https://sevasindhugs.karnataka.gov.in',
    applicationFields: [
      {
        fieldName: 'Ration Card Number',
        instructions: 'Used to confirm you are recorded as head of the family',
        mandatory: true
      }
    ],
    commonMistakes: [
      'Husband recorded as head of family on the ration card',
      'Bank account not seeded with Aadhaar, so the transfer fails'
    ],
    deadline: null,
    status: 'rolling',
    translations: {
      hi: {
        name: 'गृह लक्ष्मी (कर्नाटक)',
        shortDescription: 'कर्नाटक के प्रत्येक पात्र परिवार की महिला मुखिया को ₹2,000 मासिक भुगतान।',
        eligibilitySummaryPlain:
          'कर्नाटक के राशन कार्ड पर परिवार की मुखिया के रूप में दर्ज महिला, जिसके परिवार का कोई सदस्य आयकर या जीएसटी नहीं भरता।',
        verified: true
      }
    },
    lastVerifiedAt: new Date('2026-07-19'),
    sourceRef: 'Karnataka WCD Department — sevasindhugs.karnataka.gov.in',
    extractionConfidence: 0.91
  },
  {
    name: 'Yuva Nidhi (Karnataka)',
    slug: 'karnataka-yuva-nidhi',
    department: 'Department of Skill Development, Entrepreneurship and Livelihood, Karnataka',
    level: 'state',
    state: 'Karnataka',
    shortDescription:
      'Monthly unemployment allowance for Karnataka graduates and diploma holders who remain jobless.',
    fullDescription:
      'Yuva Nidhi pays an unemployment allowance to Karnataka-domiciled graduates and diploma holders who have not found employment within six months of passing. Graduates receive ₹3,000 a month and diploma holders ₹1,500, for up to 24 months or until they find work, whichever is earlier.',
    targetSegments: ['jobseeker', 'student'],
    benefitType: 'cash',
    benefitSummary: '₹3,000 a month for graduates, ₹1,500 for diploma holders, up to 24 months.',
    eligibilityRules: {
      state: ['Karnataka'],
      ageMin: 18,
      ageMax: 35,
      incomeMax: null,
      occupationCategory: ['unemployed'],
      genderRestriction: null,
      categoryRestriction: ['General', 'OBC', 'SC', 'ST', 'EWS'],
      additionalConditions: [
        { field: 'educationLevel', operator: 'in', value: ['diploma', 'undergraduate', 'postgraduate'] }
      ]
    },
    eligibilitySummaryPlain:
      'Karnataka residents who completed a degree or diploma and have been unemployed for at least six months since passing.',
    requiredDocuments: [
      AADHAAR,
      RESIDENCE,
      BANK,
      { label: 'Degree or Diploma Certificate', howToObtain: 'Your university or board', mandatory: true }
    ],
    applicationMode: 'online',
    officialPortalUrl: 'https://sevasindhugs.karnataka.gov.in',
    applicationFields: [
      { fieldName: 'Year of Passing', instructions: 'Must be at least six months ago', mandatory: true }
    ],
    commonMistakes: [
      'Applying before the six-month waiting period is over',
      'Continuing to claim after taking up a job, which must be declared'
    ],
    deadline: null,
    status: 'open',
    translations: {
      hi: {
        name: 'युवा निधि (कर्नाटक)',
        shortDescription:
          'बेरोजगार रह गए कर्नाटक के स्नातक और डिप्लोमा धारकों के लिए मासिक बेरोजगारी भत्ता।',
        eligibilitySummaryPlain:
          'कर्नाटक के निवासी जिन्होंने डिग्री या डिप्लोमा पूरा किया है और उत्तीर्ण होने के बाद कम से कम छह महीने से बेरोजगार हैं।',
        verified: true
      }
    },
    lastVerifiedAt: new Date('2026-07-19'),
    sourceRef: 'Karnataka Skill Development Department — sevasindhugs.karnataka.gov.in',
    extractionConfidence: 0.9
  },

  // ------------------------------------------------------------------
  // STATE — other states
  // ------------------------------------------------------------------
  {
    name: 'Mukhyamantri Majhi Ladki Bahin Yojana (Maharashtra)',
    slug: 'maharashtra-ladki-bahin',
    department: 'Department of Women and Child Development, Maharashtra',
    level: 'state',
    state: 'Maharashtra',
    shortDescription:
      'Monthly assistance of ₹1,500 for women aged 21 to 65 from families earning under ₹2.5 lakh.',
    fullDescription:
      'The scheme pays ₹1,500 a month directly into the bank account of eligible women residing in Maharashtra, to support their health, nutrition and financial independence. Families with an income-tax payer, a government employee, or ownership of a four-wheeler are excluded.',
    targetSegments: ['women'],
    benefitType: 'cash',
    benefitSummary: '₹1,500 every month by direct benefit transfer.',
    eligibilityRules: {
      state: ['Maharashtra'],
      ageMin: 21,
      ageMax: 65,
      incomeMax: 250000,
      occupationCategory: [],
      genderRestriction: 'female',
      categoryRestriction: ['General', 'OBC', 'SC', 'ST', 'EWS'],
      additionalConditions: []
    },
    eligibilitySummaryPlain:
      'Women aged 21 to 65 residing in Maharashtra with family income up to ₹2.5 lakh a year.',
    requiredDocuments: [AADHAAR, RESIDENCE, INCOME, BANK, RATION],
    applicationMode: 'both',
    officialPortalUrl: 'https://ladakibahin.maharashtra.gov.in',
    applicationFields: [
      { fieldName: 'Domicile Details', instructions: 'Proof of residence in Maharashtra', mandatory: true }
    ],
    commonMistakes: [
      'Bank account not linked to Aadhaar for DBT',
      'Applying when a family member is a government employee'
    ],
    deadline: null,
    status: 'open',
    translations: {
      hi: {
        name: 'मुख्यमंत्री माझी लाडकी बहीण योजना (महाराष्ट्र)',
        shortDescription:
          '₹2.5 लाख से कम आय वाले परिवारों की 21 से 65 वर्ष की महिलाओं के लिए ₹1,500 मासिक सहायता।',
        eligibilitySummaryPlain:
          'महाराष्ट्र में रहने वाली 21 से 65 वर्ष की महिलाएँ जिनकी पारिवारिक आय ₹2.5 लाख प्रति वर्ष तक है।',
        verified: true
      }
    },
    lastVerifiedAt: new Date('2026-07-11'),
    sourceRef: 'Maharashtra WCD Department — ladakibahin.maharashtra.gov.in',
    extractionConfidence: 0.9
  },
  {
    name: 'Kalaignar Magalir Urimai Thogai (Tamil Nadu)',
    slug: 'tamilnadu-magalir-urimai-thogai',
    department: 'Department of Social Welfare and Women Empowerment, Tamil Nadu',
    level: 'state',
    state: 'Tamil Nadu',
    shortDescription:
      'Monthly entitlement of ₹1,000 for eligible women heads of household in Tamil Nadu.',
    fullDescription:
      'The scheme provides ₹1,000 a month to eligible women identified as heads of their household, transferred directly to their bank account. Households with an income-tax payer, a government employee, or significant landholding are excluded.',
    targetSegments: ['women'],
    benefitType: 'cash',
    benefitSummary: '₹1,000 every month to the woman head of household.',
    eligibilityRules: {
      state: ['Tamil Nadu'],
      ageMin: 21,
      ageMax: null,
      incomeMax: 250000,
      occupationCategory: [],
      genderRestriction: 'female',
      categoryRestriction: ['General', 'OBC', 'SC', 'ST', 'EWS'],
      additionalConditions: [
        { field: 'isHeadOfFamily', operator: 'equals', value: true }
      ]
    },
    eligibilitySummaryPlain:
      'Women aged 21 and above recorded as head of the family on a Tamil Nadu ration card, subject to income and landholding limits.',
    requiredDocuments: [AADHAAR, RATION, BANK, RESIDENCE],
    applicationMode: 'both',
    officialPortalUrl: 'https://kmut.tn.gov.in',
    applicationFields: [
      { fieldName: 'Ration Card Number', instructions: 'Family card number', mandatory: true }
    ],
    commonMistakes: [
      'Not being recorded as head of family on the family card',
      'Household exceeding the landholding limit'
    ],
    deadline: null,
    status: 'rolling',
    translations: {
      hi: {
        name: 'कलैगनार मगलिर उरिमै थोगै (तमिलनाडु)',
        shortDescription:
          'तमिलनाडु में परिवार की मुखिया पात्र महिलाओं के लिए ₹1,000 मासिक अधिकार राशि।',
        eligibilitySummaryPlain:
          'तमिलनाडु के राशन कार्ड पर परिवार की मुखिया के रूप में दर्ज 21 वर्ष से अधिक आयु की महिलाएँ, आय और भूमि सीमा के अधीन।',
        verified: true
      }
    },
    lastVerifiedAt: new Date('2026-07-09'),
    sourceRef: 'Tamil Nadu Social Welfare Department — kmut.tn.gov.in',
    extractionConfidence: 0.89
  },
  {
    name: 'Kanyashree Prakalpa (West Bengal)',
    slug: 'westbengal-kanyashree',
    department: 'Department of Women and Child Development and Social Welfare, West Bengal',
    level: 'state',
    state: 'West Bengal',
    shortDescription:
      'Annual scholarship and a one-time grant of ₹25,000 to keep girls in school and delay marriage.',
    fullDescription:
      'Kanyashree Prakalpa pays an annual scholarship of ₹1,000 to unmarried girls aged 13 to 18 enrolled in school or an equivalent vocational course (K1), and a one-time grant of ₹25,000 at age 18 to those still unmarried and continuing their education (K2). The scheme has been recognised internationally for reducing child marriage.',
    targetSegments: ['student', 'women'],
    benefitType: 'cash',
    benefitSummary: '₹1,000 a year from 13 to 18, then a one-time ₹25,000 grant at 18.',
    eligibilityRules: {
      state: ['West Bengal'],
      ageMin: 13,
      ageMax: 19,
      incomeMax: 120000,
      occupationCategory: ['student'],
      genderRestriction: 'female',
      categoryRestriction: ['General', 'OBC', 'SC', 'ST', 'EWS'],
      additionalConditions: [
        { field: 'maritalStatus', operator: 'equals', value: 'unmarried' }
      ]
    },
    eligibilitySummaryPlain:
      'Unmarried girls aged 13 to 18 enrolled in a recognised school or vocational course in West Bengal, with family income up to ₹1.2 lakh. The income ceiling is waived for girls with disability or orphans.',
    requiredDocuments: [
      AADHAAR,
      BANK,
      INCOME,
      {
        label: 'Unmarried Declaration',
        howToObtain: 'Self-declaration countersigned by the head of your institution',
        mandatory: true
      }
    ],
    applicationMode: 'online',
    officialPortalUrl: 'https://wbkanyashree.gov.in',
    applicationFields: [
      { fieldName: 'Institution Name', instructions: 'Your school or vocational institute', mandatory: true }
    ],
    commonMistakes: [
      'Applying through the school after the annual cut-off',
      'Bank account not in the girl’s own name'
    ],
    deadline: new Date('2026-10-15'),
    status: 'open',
    translations: {
      hi: {
        name: 'कन्याश्री प्रकल्प (पश्चिम बंगाल)',
        shortDescription:
          'लड़कियों को स्कूल में बनाए रखने और बाल विवाह रोकने हेतु वार्षिक छात्रवृत्ति और ₹25,000 की एकमुश्त राशि।',
        eligibilitySummaryPlain:
          'पश्चिम बंगाल के मान्यता प्राप्त विद्यालय में पढ़ रही 13 से 18 वर्ष की अविवाहित लड़कियाँ, जिनकी पारिवारिक आय ₹1.2 लाख तक है।',
        verified: true
      }
    },
    lastVerifiedAt: new Date('2026-07-04'),
    sourceRef: 'West Bengal WCD Department — wbkanyashree.gov.in',
    extractionConfidence: 0.91
  },
  {
    name: 'Rythu Bandhu (Telangana)',
    slug: 'telangana-rythu-bandhu',
    department: 'Department of Agriculture, Telangana',
    level: 'state',
    state: 'Telangana',
    shortDescription:
      'Investment support of ₹5,000 per acre per season paid to Telangana farmers before sowing.',
    fullDescription:
      'Rythu Bandhu pays landholding farmers in Telangana ₹5,000 per acre for each of the two crop seasons, so that they can meet input costs without borrowing from informal lenders. The payment is not linked to the crop sown and is credited directly to the farmer’s account before the season begins.',
    targetSegments: ['farmer'],
    benefitType: 'cash',
    benefitSummary: '₹5,000 per acre per season, twice a year.',
    eligibilityRules: {
      state: ['Telangana'],
      ageMin: 18,
      ageMax: null,
      incomeMax: null,
      occupationCategory: ['farmer'],
      genderRestriction: null,
      categoryRestriction: ['General', 'OBC', 'SC', 'ST', 'EWS'],
      additionalConditions: [{ field: 'landOwnershipAcres', operator: 'gte', value: 0.1 }]
    },
    eligibilitySummaryPlain:
      'Farmers in Telangana with agricultural land recorded in their name in the Dharani land records.',
    requiredDocuments: [
      AADHAAR,
      BANK,
      { label: 'Pattadar Passbook', howToObtain: 'Mandal revenue office or Dharani portal', mandatory: true }
    ],
    applicationMode: 'offline',
    officialPortalUrl: 'https://rythubandhu.telangana.gov.in',
    applicationFields: [
      { fieldName: 'Pattadar Passbook Number', instructions: 'As printed on your passbook', mandatory: true }
    ],
    commonMistakes: [
      'Land records not mutated after purchase or inheritance',
      'Assuming tenant farmers qualify — the payment follows the landowner'
    ],
    deadline: null,
    status: 'rolling',
    translations: {
      hi: {
        name: 'रायथु बंधु (तेलंगाना)',
        shortDescription:
          'बुवाई से पहले तेलंगाना के किसानों को प्रति एकड़ प्रति मौसम ₹5,000 की निवेश सहायता।',
        eligibilitySummaryPlain:
          'तेलंगाना के ऐसे किसान जिनकी कृषि भूमि धरणी अभिलेख में उनके नाम दर्ज है।',
        verified: true
      }
    },
    lastVerifiedAt: new Date('2026-06-27'),
    sourceRef: 'Telangana Agriculture Department — rythubandhu.telangana.gov.in',
    extractionConfidence: 0.9
  },
  {
    name: 'Mukhyamantri Ladli Behna Yojana (Madhya Pradesh)',
    slug: 'mp-ladli-behna',
    department: 'Department of Women and Child Development, Madhya Pradesh',
    level: 'state',
    state: 'Madhya Pradesh',
    shortDescription:
      'Monthly assistance for married, widowed, divorced and abandoned women aged 21 to 60 in Madhya Pradesh.',
    fullDescription:
      'Ladli Behna transfers a monthly amount directly to eligible women in Madhya Pradesh to strengthen their economic independence and improve nutrition within the family. Households where a member is an income-tax payer, a government employee or owns more than five acres are excluded.',
    targetSegments: ['women'],
    benefitType: 'cash',
    benefitSummary: 'Monthly direct benefit transfer to the woman’s own account.',
    eligibilityRules: {
      state: ['Madhya Pradesh'],
      ageMin: 21,
      ageMax: 60,
      incomeMax: 250000,
      occupationCategory: [],
      genderRestriction: 'female',
      categoryRestriction: ['General', 'OBC', 'SC', 'ST', 'EWS'],
      additionalConditions: []
    },
    eligibilitySummaryPlain:
      'Women aged 21 to 60 residing in Madhya Pradesh whose family income is under ₹2.5 lakh and who hold no more than five acres of land.',
    requiredDocuments: [AADHAAR, RESIDENCE, BANK, RATION],
    applicationMode: 'both',
    officialPortalUrl: 'https://cmladlibahna.mp.gov.in',
    applicationFields: [
      { fieldName: 'Samagra ID', instructions: 'Your Madhya Pradesh Samagra family ID', mandatory: true }
    ],
    commonMistakes: [
      'Samagra ID not linked with Aadhaar',
      'Bank account not DBT-enabled'
    ],
    deadline: null,
    status: 'rolling',
    translations: {
      hi: {
        name: 'मुख्यमंत्री लाड़ली बहना योजना (मध्य प्रदेश)',
        shortDescription:
          'मध्य प्रदेश की 21 से 60 वर्ष की विवाहित, विधवा, तलाकशुदा और परित्यक्ता महिलाओं के लिए मासिक सहायता।',
        eligibilitySummaryPlain:
          'मध्य प्रदेश में रहने वाली 21 से 60 वर्ष की महिलाएँ जिनकी पारिवारिक आय ₹2.5 लाख से कम है और जिनके पास पाँच एकड़ से अधिक भूमि नहीं है।',
        verified: true
      }
    },
    lastVerifiedAt: new Date('2026-07-03'),
    sourceRef: 'Madhya Pradesh WCD Department — cmladlibahna.mp.gov.in',
    extractionConfidence: 0.88
  },
  {
    name: 'Delhi Old Age Assistance Scheme',
    slug: 'delhi-old-age-pension',
    department: 'Department of Social Welfare, Government of NCT of Delhi',
    level: 'state',
    state: 'Delhi',
    shortDescription:
      'Monthly pension of ₹2,000 to ₹2,500 for senior citizens who have lived in Delhi for at least five years.',
    fullDescription:
      'The Delhi Old Age Assistance Scheme pays ₹2,000 a month to residents aged 60 to 69 and ₹2,500 a month from age 70, with a higher rate for SC, ST and minority beneficiaries. Applicants must have been resident in Delhi for at least five years and have family income below ₹1 lakh a year.',
    targetSegments: ['senior_citizen'],
    benefitType: 'cash',
    benefitSummary: '₹2,000 a month from 60, ₹2,500 from 70.',
    eligibilityRules: {
      state: ['Delhi'],
      ageMin: 60,
      ageMax: null,
      incomeMax: 100000,
      occupationCategory: [],
      genderRestriction: null,
      categoryRestriction: ['General', 'OBC', 'SC', 'ST', 'EWS'],
      additionalConditions: [
        { field: 'yearsOfResidence', operator: 'gte', value: 5 }
      ]
    },
    eligibilitySummaryPlain:
      'Delhi residents aged 60 and above, resident for at least five years, with family income under ₹1 lakh a year and no other pension.',
    requiredDocuments: [
      AADHAAR,
      BANK,
      RESIDENCE,
      INCOME,
      { label: 'Age Proof', howToObtain: 'Birth certificate, voter ID or school record', mandatory: true }
    ],
    applicationMode: 'online',
    officialPortalUrl: 'https://edistrict.delhigovt.nic.in',
    applicationFields: [
      { fieldName: 'Years of Residence in Delhi', instructions: 'Must be five or more', mandatory: true }
    ],
    commonMistakes: [
      'Residence proof not covering the full five years',
      'Already receiving another government pension'
    ],
    deadline: null,
    status: 'rolling',
    translations: {
      hi: {
        name: 'दिल्ली वृद्धावस्था सहायता योजना',
        shortDescription:
          'कम से कम पाँच वर्ष से दिल्ली में रह रहे वरिष्ठ नागरिकों के लिए ₹2,000 से ₹2,500 मासिक पेंशन।',
        eligibilitySummaryPlain:
          '60 वर्ष से अधिक आयु के दिल्ली निवासी, जो कम से कम पाँच वर्ष से यहाँ रह रहे हों, पारिवारिक आय ₹1 लाख से कम हो और कोई अन्य पेंशन न ले रहे हों।',
        verified: true
      }
    },
    lastVerifiedAt: new Date('2026-06-29'),
    sourceRef: 'Delhi Social Welfare Department — edistrict.delhigovt.nic.in',
    extractionConfidence: 0.89
  },
  {
    name: 'YSR Rythu Bharosa (Andhra Pradesh)',
    slug: 'ap-rythu-bharosa',
    department: 'Department of Agriculture, Andhra Pradesh',
    level: 'state',
    state: 'Andhra Pradesh',
    shortDescription:
      'Annual investment support of ₹13,500 for farmer families, including tenant and landless cultivators.',
    fullDescription:
      'YSR Rythu Bharosa provides ₹13,500 a year to farmer families in Andhra Pradesh, paid in three instalments timed to the crop cycle. The state amount is combined with the central PM-KISAN contribution. Unusually for a scheme of this kind, it also covers tenant farmers and landless cultivators from SC, ST, BC and minority communities who hold a valid cultivation rights card.',
    targetSegments: ['farmer'],
    benefitType: 'cash',
    benefitSummary: '₹13,500 a year in three instalments, inclusive of PM-KISAN.',
    eligibilityRules: {
      state: ['Andhra Pradesh'],
      ageMin: 18,
      ageMax: null,
      incomeMax: null,
      occupationCategory: ['farmer'],
      genderRestriction: null,
      categoryRestriction: ['General', 'OBC', 'SC', 'ST', 'EWS'],
      additionalConditions: []
    },
    eligibilitySummaryPlain:
      'Farmer families in Andhra Pradesh, including tenant farmers and landless cultivators holding a cultivation rights card.',
    requiredDocuments: [
      AADHAAR,
      BANK,
      {
        label: 'Adangal / Cultivation Rights Card (CCRC)',
        howToObtain: 'Village revenue officer or the Meebhoomi portal',
        mandatory: true
      }
    ],
    applicationMode: 'offline',
    officialPortalUrl: 'https://ysrrythubharosa.ap.gov.in',
    applicationFields: [
      { fieldName: 'Survey Number', instructions: 'Land survey number as in the Adangal', mandatory: true }
    ],
    commonMistakes: [
      'Tenant farmers not renewing the annual cultivation rights card',
      'Aadhaar not seeded with the bank account'
    ],
    deadline: null,
    status: 'rolling',
    translations: {
      hi: {
        name: 'वाईएसआर रायथु भरोसा (आंध्र प्रदेश)',
        shortDescription:
          'किसान परिवारों के लिए ₹13,500 वार्षिक निवेश सहायता, जिसमें बटाईदार और भूमिहीन कृषक भी शामिल हैं।',
        eligibilitySummaryPlain:
          'आंध्र प्रदेश के किसान परिवार, जिनमें बटाईदार किसान और कृषि अधिकार पत्र रखने वाले भूमिहीन कृषक भी शामिल हैं।',
        verified: true
      }
    },
    lastVerifiedAt: new Date('2026-06-24'),
    sourceRef: 'Andhra Pradesh Agriculture Department — ysrrythubharosa.ap.gov.in',
    extractionConfidence: 0.88
  },
  {
    name: 'Mukhyamantri Kanya Utthan Yojana (Bihar)',
    slug: 'bihar-kanya-utthan',
    department: 'Department of Education, Bihar',
    level: 'state',
    state: 'Bihar',
    shortDescription:
      'Cash incentives at every stage of a girl’s education, including ₹50,000 on graduation.',
    fullDescription:
      'The scheme supports girls in Bihar from birth through graduation with staged incentives — at birth and immunisation, on passing Class X and Class XII unmarried, and ₹50,000 on completing a degree. It is designed to raise female enrolment and delay marriage.',
    targetSegments: ['student', 'women'],
    benefitType: 'cash',
    benefitSummary: 'Staged incentives across school, and ₹50,000 on graduating.',
    eligibilityRules: {
      state: ['Bihar'],
      ageMin: null,
      ageMax: 25,
      incomeMax: null,
      occupationCategory: ['student'],
      genderRestriction: 'female',
      categoryRestriction: ['General', 'OBC', 'SC', 'ST', 'EWS'],
      additionalConditions: []
    },
    eligibilitySummaryPlain:
      'Girls domiciled in Bihar, at the relevant educational milestone. The Class XII and graduation incentives require the girl to be unmarried at the time of claim.',
    requiredDocuments: [
      AADHAAR,
      BANK,
      RESIDENCE,
      { label: 'Marksheet / Degree Certificate', howToObtain: 'Your board or university', mandatory: true }
    ],
    applicationMode: 'online',
    officialPortalUrl: 'https://medhasoft.bih.nic.in',
    applicationFields: [
      { fieldName: 'Roll Number and Year', instructions: 'As on the qualifying marksheet', mandatory: true }
    ],
    commonMistakes: [
      'Applying after the window for that milestone closes',
      'Name spelling differing between marksheet and Aadhaar'
    ],
    deadline: new Date('2026-09-30'),
    status: 'open',
    translations: {
      hi: {
        name: 'मुख्यमंत्री कन्या उत्थान योजना (बिहार)',
        shortDescription:
          'बालिका की शिक्षा के हर चरण पर नकद प्रोत्साहन, स्नातक पूरा करने पर ₹50,000 सहित।',
        eligibilitySummaryPlain:
          'बिहार की मूल निवासी बालिकाएँ, संबंधित शैक्षिक चरण पर। बारहवीं और स्नातक प्रोत्साहन के लिए अविवाहित होना आवश्यक है।',
        verified: true
      }
    },
    lastVerifiedAt: new Date('2026-07-07'),
    sourceRef: 'Bihar Education Department — medhasoft.bih.nic.in',
    extractionConfidence: 0.87
  }
];
