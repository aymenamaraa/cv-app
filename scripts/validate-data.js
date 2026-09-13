import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_PATH = path.resolve(__dirname, '../public/data.json');

console.log('🔍 Validating public/data.json...');

if (!fs.existsSync(DATA_PATH)) {
  console.error('❌ Error: public/data.json does not exist!');
  process.exit(1);
}

let data;
try {
  const content = fs.readFileSync(DATA_PATH, 'utf-8');
  data = JSON.parse(content);
} catch (err) {
  console.error('❌ JSON Syntax Error in public/data.json:');
  console.error(`   ${err.message}`);
  process.exit(1);
}

const REQUIRED_LANGUAGES = ['fr', 'en'];
const REQUIRED_SECTIONS = [
  'ui',
  'seo',
  'person',
  'contact',
  'summary',
  'expertise',
  'digitalSkills',
  'experience',
  'education',
  'languages'
];
const REQUIRED_PERSON_FIELDS = ['firstName', 'lastName', 'role', 'nationality'];

let errors = [];

for (const lang of REQUIRED_LANGUAGES) {
  if (!data[lang]) {
    errors.push(`Missing root language key: "${lang}"`);
    continue;
  }

  for (const section of REQUIRED_SECTIONS) {
    if (!data[lang][section]) {
      errors.push(`Missing section "${section}" in language "${lang}"`);
    }
  }

  if (data[lang]?.person) {
    for (const field of REQUIRED_PERSON_FIELDS) {
      if (!data[lang].person[field]) {
        errors.push(`Missing person field "${field}" in language "${lang}"`);
      }
    }
  }

  if (data[lang]?.experience) {
    if (!Array.isArray(data[lang].experience) || data[lang].experience.length === 0) {
      errors.push(`"experience" must be a non-empty array in language "${lang}"`);
    }
  }

  if (data[lang]?.education) {
    if (!Array.isArray(data[lang].education) || data[lang].education.length === 0) {
      errors.push(`"education" must be a non-empty array in language "${lang}"`);
    }
  }

  if (data[lang]?.languages) {
    if (!data[lang].languages.motherTongue) {
      errors.push(`Missing "motherTongue" under "languages" in "${lang}"`);
    }
    if (!Array.isArray(data[lang].languages.otherLanguages)) {
      errors.push(`"otherLanguages" must be an array under "languages" in "${lang}"`);
    }
  }
}

if (errors.length > 0) {
  console.error(`❌ Validation failed with ${errors.length} error(s):`);
  errors.forEach((err) => console.error(`   - ${err}`));
  process.exit(1);
}

console.log('✅ Validation successful: public/data.json is valid Europass schema (FR & EN).');
