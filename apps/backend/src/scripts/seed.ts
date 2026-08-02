import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { connectDB, disconnectDB } from '../config/db.js';
import { SchemeModel } from '../models/Scheme.js';
import { UserModel } from '../models/User.js';
import { CitizenProfileModel } from '../models/CitizenProfile.js';
import { logger } from '../utils/logger.js';

const realSchemes = [
  {
    name: 'Karnataka Vidyasiri Scholarship',
    slug: 'karnataka-vidyasiri-scholarship',
    department: 'Department of Backward Classes Welfare, Karnataka',
    level: 'state',
    state: 'Karnataka',
    shortDescription: 'Food and accommodation fee reimbursement scholarship for post-matric undergraduate students from low-income families.',
    fullDescription: 'Vidyasiri scheme provides monthly financial assistance for hostel and food expenses for students pursuing post-matric courses who belong to SC/ST/OBC categories and whose family annual income is within the prescribed limits.',
    targetSegments: ['student'],
    benefitType: 'subsidy',
    benefitSummary: '₹15,000 per annum for food and hostel stipend.',
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
    eligibilitySummaryPlain: 'Open to Karnataka post-matric students from families earning under ₹2.5 lakh per year.',
    requiredDocuments: [
      { label: 'Income Certificate', howToObtain: 'Apply via Nadakacheri e-portal or Taluk office', mandatory: true },
      { label: 'Caste Certificate', howToObtain: 'Apply via Nadakacheri e-portal', mandatory: true },
      { label: 'Aadhaar Card', howToObtain: 'UIDAI official portal', mandatory: true },
      { label: 'College Admission Receipt', howToObtain: 'Request from your college administration', mandatory: true }
    ],
    applicationMode: 'online',
    officialPortalUrl: 'https://ssp.postmatric.karnataka.gov.in',
    applicationFields: [
      { fieldName: 'SATS / Student ID', instructions: 'Enter official State Student ID', mandatory: true },
      { fieldName: 'College Name', instructions: 'Select college from dropdown menu', mandatory: true }
    ],
    commonMistakes: ['Mismatch between Aadhaar name and college records', 'Submitting expired income certificate'],
    deadline: new Date('2026-10-31'),
    status: 'open',
    translations: {
      hi: {
        name: 'कर्नाटक विद्यासिरी छात्रवृत्ति',
        shortDescription: 'कम आय वाले परिवारों के छात्रों के लिए भोजन और छात्रावास शुल्क प्रतिपूर्ति छात्रवृत्ति।',
        eligibilitySummaryPlain: 'कर्नाटक के उन छात्रों के लिए जिनकी पारिवारिक वार्षिक आय 2.5 लाख रुपये से कम है।',
        verified: true
      }
    },
    lastVerifiedAt: new Date('2026-07-01'),
    sourceRef: 'Karnataka Gazette Notification No. BCW/VS/2026',
    extractionConfidence: 0.96
  },
  {
    name: 'PM-KISAN (Pradhan Mantri Kisan Samman Nidhi)',
    slug: 'pm-kisan-samman-nidhi',
    department: 'Ministry of Agriculture & Farmers Welfare',
    level: 'central',
    state: null,
    shortDescription: 'Direct income support of ₹6,000 per year for all landholding farmer families across India.',
    fullDescription: 'Under the PM-KISAN scheme, financial benefit of ₹6000 per year is provided to all landholding farmer families, payable in three equal installments of ₹2000 each every four months directly into bank accounts.',
    targetSegments: ['farmer'],
    benefitType: 'cash',
    benefitSummary: '₹6,000 per year in 3 equal installments of ₹2,000.',
    eligibilityRules: {
      state: [],
      ageMin: 18,
      ageMax: null,
      incomeMax: null,
      occupationCategory: ['farmer'],
      genderRestriction: null,
      categoryRestriction: ['General', 'OBC', 'SC', 'ST', 'EWS'],
      additionalConditions: [
        { field: 'landOwnershipAcres', operator: 'gte', value: 0.1 }
      ]
    },
    eligibilitySummaryPlain: 'All landholding farmer families with cultivable landholding in their name.',
    requiredDocuments: [
      { label: 'Aadhaar Card', howToObtain: 'UIDAI portal', mandatory: true },
      { label: 'Land Holding Ownership Papers (Khatauni)', howToObtain: 'State Revenue / Bhulekh portal', mandatory: true },
      { label: 'Bank Passbook with IFSC', howToObtain: 'Bank branch', mandatory: true }
    ],
    applicationMode: 'online',
    officialPortalUrl: 'https://pmkisan.gov.in',
    applicationFields: [
      { fieldName: 'Aadhaar Number', instructions: '12-digit Aadhaar number', mandatory: true },
      { fieldName: 'Land Registration ID', instructions: 'As printed on state revenue land records', mandatory: true }
    ],
    commonMistakes: ['Aadhaar name mismatch with bank record', 'Failure to complete eKYC'],
    deadline: null,
    status: 'rolling',
    translations: {
      hi: {
        name: 'प्रधानमंत्री किसान सम्मान निधि (PM-KISAN)',
        shortDescription: 'भारत के सभी भूमिधारक किसान परिवारों के लिए प्रति वर्ष ₹6,000 की प्रत्यक्ष आय सहायता।',
        eligibilitySummaryPlain: 'उन सभी किसान परिवारों के लिए जिनके नाम पर खेती योग्य भूमि दर्ज है।',
        verified: true
      }
    },
    lastVerifiedAt: new Date('2026-07-15'),
    sourceRef: 'Ministry of Agriculture Govt of India Gazette 2026',
    extractionConfidence: 0.99
  },
  {
    name: 'Pradhan Mantri MUDRA Yojana (PMMY) - Tarun / Kishore',
    slug: 'pm-mudra-yojana',
    department: 'Department of Financial Services, Ministry of Finance',
    level: 'central',
    state: null,
    shortDescription: 'Collateral-free business loans up to ₹10 lakh for micro and small enterprises, artisans, and women entrepreneurs.',
    fullDescription: 'PMMY provides loans up to 10 lakh to non-corporate, non-farm small/micro enterprises. Loans are classified into Shishu (up to ₹50,000), Kishore (above ₹50,000 to ₹5 lakh) and Tarun (above ₹5 lakh to ₹10 lakh).',
    targetSegments: ['msme', 'women'],
    benefitType: 'loan',
    benefitSummary: 'Collateral-free low-interest micro business loans up to ₹10,000,000.',
    eligibilityRules: {
      state: [],
      ageMin: 18,
      ageMax: 65,
      incomeMax: null,
      occupationCategory: ['entrepreneur', 'business_owner', 'artisan'],
      genderRestriction: null,
      categoryRestriction: ['General', 'OBC', 'SC', 'ST', 'EWS'],
      additionalConditions: []
    },
    eligibilitySummaryPlain: 'Non-farm micro enterprise owners, shopkeepers, artisans, and women entrepreneurs.',
    requiredDocuments: [
      { label: 'Identity & Address Proof', howToObtain: 'Aadhaar / Voter ID / Passport', mandatory: true },
      { label: 'Business Enterprise Proof / Registration', howToObtain: 'Udyam Registration Portal', mandatory: true },
      { label: 'Project Report / Business Plan', howToObtain: 'Self-prepared detailing income projection', mandatory: true }
    ],
    applicationMode: 'both',
    officialPortalUrl: 'https://www.mudra.org.in',
    applicationFields: [
      { fieldName: 'Udyam Registration Number', instructions: 'From official MSME Udyam Portal', mandatory: false },
      { fieldName: 'Proposed Loan Amount', instructions: 'Amount in INR up to 10,000,000', mandatory: true }
    ],
    commonMistakes: ['Applying for farm agriculture production instead of allied business', 'Incomplete project report'],
    deadline: null,
    status: 'rolling',
    translations: {
      hi: {
        name: 'प्रधानमंत्री मुद्रा योजना (PMMY)',
        shortDescription: 'सूक्ष्म और लघु उद्यमों तथा महिला उद्यमियों के लिए ₹10 लाख तक का बिना गारंटी व्यावसायिक ऋण।',
        eligibilitySummaryPlain: 'गैर-कॉर्पोरेट, गैर-कृषि सूक्ष्म उद्यम स्वामियों और नए उद्यमियों के लिए।',
        verified: true
      }
    },
    lastVerifiedAt: new Date('2026-06-20'),
    sourceRef: 'Ministry of Finance PMMY Guidelines',
    extractionConfidence: 0.95
  },
  {
    name: 'Indira Gandhi National Old Age Pension Scheme (IGNOAPS)',
    slug: 'ignoaps-senior-citizen-pension',
    department: 'Ministry of Rural Development, Govt of India',
    level: 'central',
    state: null,
    shortDescription: 'Monthly social security pension for BPL senior citizens aged 60 years and above.',
    fullDescription: 'IGNOAPS is a non-contributory pension scheme for Indian citizens aged 60 years or above living below the poverty line. Eligible beneficiaries aged 60-79 receive ₹200-₹500/month (supplemented by state contribution), while those 80+ receive ₹500/month.',
    targetSegments: ['senior_citizen'],
    benefitType: 'cash',
    benefitSummary: 'Monthly financial assistance pension credited directly to bank account.',
    eligibilityRules: {
      state: [],
      ageMin: 60,
      ageMax: null,
      incomeMax: 120000,
      occupationCategory: [],
      genderRestriction: null,
      categoryRestriction: ['General', 'OBC', 'SC', 'ST', 'EWS'],
      additionalConditions: [
        { field: 'category', operator: 'equals', value: 'BPL' }
      ]
    },
    eligibilitySummaryPlain: 'Citizens aged 60+ belonging to Below Poverty Line (BPL) households.',
    requiredDocuments: [
      { label: 'BPL Ration Card', howToObtain: 'State Food and Civil Supplies Department', mandatory: true },
      { label: 'Age Proof Certificate', howToObtain: 'Aadhaar / Voter ID / Birth Certificate', mandatory: true },
      { label: 'Bank Account Passbook', howToObtain: 'Bank branch', mandatory: true }
    ],
    applicationMode: 'both',
    officialPortalUrl: 'https://nsap.nic.in',
    applicationFields: [
      { fieldName: 'BPL Card Number', instructions: 'Enter valid BPL ration card number', mandatory: true }
    ],
    commonMistakes: ['Lack of age proof document', 'Incomplete bank account details'],
    deadline: null,
    status: 'rolling',
    translations: {
      hi: {
        name: 'इंद्रा गांधी राष्ट्रीय वृद्धावस्था पेंशन योजना (IGNOAPS)',
        shortDescription: '60 वर्ष और उससे अधिक आयु के बीपीएल वरिष्ठ नागरिकों के लिए मासिक सामाजिक सुरक्षा पेंशन।',
        eligibilitySummaryPlain: 'गरीबी रेखा से नीचे (BPL) जीवन यापन करने वाले 60 वर्ष या उससे अधिक आयु के नागरिक।',
        verified: true
      }
    },
    lastVerifiedAt: new Date('2026-05-10'),
    sourceRef: 'National Social Assistance Programme Guidelines 2026',
    extractionConfidence: 0.94
  }
];

export const seedDatabase = async () => {
  try {
    await connectDB();
    logger.info('Clearing existing database collections for seed...');
    await SchemeModel.deleteMany({});
    await UserModel.deleteMany({});
    await CitizenProfileModel.deleteMany({});

    logger.info('Inserting real government schemes...');
    const createdSchemes = await SchemeModel.insertMany(realSchemes);
    logger.info(`Inserted ${createdSchemes.length} schemes.`);

    logger.info('Creating test user & profile...');
    const passwordHash = await bcrypt.hash('password123', 10);
    const testUser = await UserModel.create({
      phone: '9876543210',
      email: 'citizen@example.com',
      passwordHash,
      preferredLanguage: 'en',
      refreshTokenVersion: 0
    });

    const testProfile = await CitizenProfileModel.create({
      userId: testUser._id,
      state: 'Karnataka',
      district: 'Bengaluru Urban',
      age: 20,
      gender: 'male',
      occupationCategory: 'student',
      incomeBand: '<2.5L',
      educationLevel: 'undergraduate',
      category: 'General',
      disabilityStatus: false
    });

    logger.info(`Seeded Test User ID: ${testUser._id} with Profile ID: ${testProfile._id}`);
    logger.info('Database seeding completed successfully!');
  } catch (error) {
    logger.error({ error }, 'Database seeding failed');
    process.exit(1);
  } finally {
    await disconnectDB();
  }
};

seedDatabase();
