import fs from 'fs';
import path from 'path';

const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), 'data', '3rdopinion.json');

interface DomainPattern {
  id: number;
  domain: string;
  inputHash: string;
  inputPreview: string;
  detectedDomains: string[];
  effectivenessScore: number;
  promptEnhancement: string;
  createdAt: string;
}

interface DomainMapping {
  id: number;
  keywords: string;
  domain: string;
  weight: number;
  updatedAt: string;
}

interface Feedback {
  id: number;
  opinionId: string;
  helpful: boolean;
  domainApplied: string;
  createdAt: string;
}

interface Database {
  domainPatterns: DomainPattern[];
  domainMappings: DomainMapping[];
  feedback: Feedback[];
}

let db: Database = {
  domainPatterns: [],
  domainMappings: [],
  feedback: []
};

let initialized = false;

function ensureDataDir(): void {
  const dataDir = path.dirname(DB_PATH);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

function loadDatabase(): void {
  if (initialized) return;
  
  try {
    if (fs.existsSync(DB_PATH)) {
      const data = fs.readFileSync(DB_PATH, 'utf-8');
      db = JSON.parse(data);
    } else {
      db = {
        domainPatterns: [],
        domainMappings: [],
        feedback: []
      };
      saveDatabase();
    }
  } catch (error) {
    console.error('Error loading database:', error);
    db = {
      domainPatterns: [],
      domainMappings: [],
      feedback: []
    };
  }
  initialized = true;
}

function saveDatabase(): void {
  ensureDataDir();
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

export function addDomainPattern(
  domain: string,
  inputHash: string,
  inputPreview: string,
  detectedDomains: string[],
  promptEnhancement: string
): DomainPattern {
  loadDatabase();
  
  const pattern: DomainPattern = {
    id: db.domainPatterns.length + 1,
    domain,
    inputHash,
    inputPreview,
    detectedDomains,
    effectivenessScore: 0.5,
    promptEnhancement,
    createdAt: new Date().toISOString()
  };
  
  db.domainPatterns.push(pattern);
  saveDatabase();
  
  return pattern;
}

export function getDomainPatterns(domain?: string): DomainPattern[] {
  loadDatabase();
  
  if (domain) {
    return db.domainPatterns.filter(p => p.domain === domain);
  }
  
  return db.domainPatterns;
}

export function getPatternsByHash(inputHash: string): DomainPattern[] {
  loadDatabase();
  return db.domainPatterns.filter(p => p.inputHash === inputHash);
}

export function addDomainMapping(keywords: string, domain: string, weight: number = 1.0): DomainMapping {
  loadDatabase();
  
  const existing = db.domainMappings.find(m => m.keywords === keywords && m.domain === domain);
  if (existing) {
    existing.weight = (existing.weight + weight) / 2;
    existing.updatedAt = new Date().toISOString();
    saveDatabase();
    return existing;
  }
  
  const mapping: DomainMapping = {
    id: db.domainMappings.length + 1,
    keywords,
    domain,
    weight,
    updatedAt: new Date().toISOString()
  };
  
  db.domainMappings.push(mapping);
  saveDatabase();
  
  return mapping;
}

export function getDomainMappings(keyword: string): DomainMapping[] {
  loadDatabase();
  
  return db.domainMappings
    .filter(m => keyword.toLowerCase().includes(m.keywords.toLowerCase()))
    .sort((a, b) => b.weight - a.weight);
}

export function getAllDomainMappings(): DomainMapping[] {
  loadDatabase();
  return db.domainMappings;
}

export function addFeedback(
  opinionId: string,
  helpful: boolean,
  domainApplied: string
): Feedback {
  loadDatabase();
  
  const feedback: Feedback = {
    id: db.feedback.length + 1,
    opinionId,
    helpful,
    domainApplied,
    createdAt: new Date().toISOString()
  };
  
  db.feedback.push(feedback);
  
  if (domainApplied) {
    const domains = domainApplied.split(',');
    domains.forEach(d => {
      const patterns = db.domainPatterns.filter(p => p.detectedDomains.includes(d.trim()));
      patterns.forEach(p => {
        p.effectivenessScore = helpful 
          ? Math.min(1, p.effectivenessScore + 0.1)
          : Math.max(0, p.effectivenessScore - 0.1);
      });
    });
  }
  
  saveDatabase();
  
  return feedback;
}

export function getEffectivePatterns(minScore: number = 0.5): DomainPattern[] {
  loadDatabase();
  return db.domainPatterns.filter(p => p.effectivenessScore >= minScore);
}

export function initializeDefaultMappings(): void {
  loadDatabase();
  
  const defaultMappings = [
    { keywords: 'always,never,must,should,everyone,nobody', domain: 'logical-reasoning', weight: 0.9 },
    { keywords: 'fact,true,real,actually,research,study,data,percent,percentage, statistic', domain: 'fact-checking', weight: 0.9 },
    { keywords: 'recommend,suggest,best,should do,need to,you must', domain: 'perspective-diversity', weight: 0.8 },
    { keywords: 'assume,presume,take for granted,given', domain: 'assumption-detection', weight: 0.8 },
    { keywords: 'bias,prejudice,discriminate,unfair,one-sided', domain: 'bias-detection', weight: 0.9 },
    { keywords: 'risk,danger,problem,issue,concern,warn', domain: 'risk-analysis', weight: 0.7 },
    { keywords: 'why,how,what if,consider,think about,question', domain: 'socratic', weight: 0.6 },
    { keywords: 'algorithm,code,function,implement,program', domain: 'logical-reasoning', weight: 0.7 },
    { keywords: 'history,event,date,year,when,happened', domain: 'fact-checking', weight: 0.9 },
    { keywords: 'write,create,story,essay,article', domain: 'perspective-diversity', weight: 0.7 }
  ];
  
  defaultMappings.forEach(m => {
    if (!db.domainMappings.find(existing => existing.keywords === m.keywords && existing.domain === m.domain)) {
      db.domainMappings.push({
        id: db.domainMappings.length + 1,
        ...m,
        updatedAt: new Date().toISOString()
      });
    }
  });
  
  saveDatabase();
}

export default {
  addDomainPattern,
  getDomainPatterns,
  getPatternsByHash,
  addDomainMapping,
  getDomainMappings,
  getAllDomainMappings,
  addFeedback,
  getEffectivePatterns,
  initializeDefaultMappings
};
