import crypto from 'crypto';
import * as db from './database';

const ALL_DOMAINS = [
  'logical-reasoning',
  'fact-checking',
  'perspective-diveness',
  'assumption-detection',
  'bias-detection',
  'risk-analysis',
  'socratic'
];

const CONTENT_SIGNALS: Record<string, { domains: string[]; weight: number }> = {
  'always': { domains: ['logical-reasoning'], weight: 0.8 },
  'never': { domains: ['logical-reasoning'], weight: 0.8 },
  'must': { domains: ['logical-reasoning', 'assumption-detection'], weight: 0.7 },
  'should': { domains: ['assumption-detection', 'perspective-diversity'], weight: 0.6 },
  'everyone': { domains: ['logical-reasoning'], weight: 0.8 },
  'nobody': { domains: ['logical-reasoning'], weight: 0.8 },
  'certainly': { domains: ['logical-reasoning'], weight: 0.6 },
  'definitely': { domains: ['logical-reasoning'], weight: 0.6 },
  'fact': { domains: ['fact-checking'], weight: 0.9 },
  'true': { domains: ['fact-checking'], weight: 0.7 },
  'actually': { domains: ['fact-checking'], weight: 0.6 },
  'research': { domains: ['fact-checking'], weight: 0.9 },
  'study': { domains: ['fact-checking'], weight: 0.9 },
  'percent': { domains: ['fact-checking'], weight: 0.9 },
  'percentage': { domains: ['fact-checking'], weight: 0.9 },
  'statistic': { domains: ['fact-checking'], weight: 0.9 },
  'data': { domains: ['fact-checking'], weight: 0.7 },
  'recommend': { domains: ['perspective-diversity', 'risk-analysis'], weight: 0.8 },
  'suggest': { domains: ['perspective-diversity', 'risk-analysis'], weight: 0.8 },
  'best': { domains: ['perspective-diversity', 'risk-analysis'], weight: 0.7 },
  'solution': { domains: ['risk-analysis', 'perspective-diversity'], weight: 0.6 },
  'risk': { domains: ['risk-analysis'], weight: 0.9 },
  'danger': { domains: ['risk-analysis'], weight: 0.9 },
  'problem': { domains: ['risk-analysis'], weight: 0.6 },
  'concern': { domains: ['risk-analysis'], weight: 0.7 },
  'assume': { domains: ['assumption-detection'], weight: 0.9 },
  'presume': { domains: ['assumption-detection'], weight: 0.9 },
  'given': { domains: ['assumption-detection'], weight: 0.7 },
  'if only': { domains: ['assumption-detection'], weight: 0.7 },
  'bias': { domains: ['bias-detection'], weight: 0.9 },
  'unfair': { domains: ['bias-detection'], weight: 0.9 },
  'one-sided': { domains: ['bias-detection'], weight: 0.9 },
  'why': { domains: ['socratic'], weight: 0.8 },
  'how': { domains: ['socratic'], weight: 0.6 },
  'what if': { domains: ['socratic'], weight: 0.8 },
  'consider': { domains: ['socratic'], weight: 0.7 },
  'think about': { domains: ['socratic'], weight: 0.7 },
  'question': { domains: ['socratic'], weight: 0.6 }
};

export function generateInputHash(aiResponse: string, userQuestion: string): string {
  const combined = aiResponse.substring(0, 1000) + '|' + (userQuestion || '');
  return crypto.createHash('sha256').update(combined).digest('hex').substring(0, 16);
}

export function extractKeywords(text: string): string[] {
  const words = text.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 3);
  
  return Array.from(new Set(words));
}

interface DomainScore {
  domain: string;
  score: number;
  source: 'keyword' | 'signal' | 'learned';
}

export function detectDomains(aiResponse: string, userQuestion?: string): string[] {
  const combinedText = `${aiResponse} ${userQuestion || ''}`.toLowerCase();
  const keywords = extractKeywords(combinedText);
  const scores: Map<string, DomainScore> = new Map();
  
  db.initializeDefaultMappings();
  
  keywords.forEach(keyword => {
    const mappings = db.getDomainMappings(keyword);
    mappings.forEach(mapping => {
      const existing = scores.get(mapping.domain);
      if (existing) {
        existing.score += mapping.weight;
        existing.source = 'learned';
      } else {
        scores.set(mapping.domain, {
          domain: mapping.domain,
          score: mapping.weight,
          source: 'learned'
        });
      }
    });
  });
  
  Object.entries(CONTENT_SIGNALS).forEach(([signal, info]) => {
    if (combinedText.includes(signal)) {
      info.domains.forEach(domain => {
        const existing = scores.get(domain);
        if (existing) {
          existing.score += info.weight;
        } else {
          scores.set(domain, {
            domain,
            score: info.weight,
            source: 'signal'
          });
        }
      });
    }
  });
  
  scores.set('logical-reasoning', {
    domain: 'logical-reasoning',
    score: (scores.get('logical-reasoning')?.score || 0) + 0.3,
    source: 'signal'
  });
  
  scores.set('assumption-detection', {
    domain: 'assumption-detection',
    score: (scores.get('assumption-detection')?.score || 0) + 0.2,
    source: 'signal'
  });
  
  const sortedDomains = Array.from(scores.values())
    .sort((a, b) => b.score - a.score);
  
  const topDomains = sortedDomains.slice(0, 5)
    .filter(s => s.score > 0.2)
    .map(s => s.domain);
  
  if (topDomains.length < 2) {
    return ['logical-reasoning', 'assumption-detection', ...topDomains].slice(0, 3);
  }
  
  return topDomains;
}

export function learnFromInteraction(
  aiResponse: string,
  userQuestion: string,
  detectedDomains: string[],
  promptEnhancement: string
): void {
  const inputHash = generateInputHash(aiResponse, userQuestion);
  const inputPreview = aiResponse.substring(0, 200);
  
  detectedDomains.forEach(domain => {
    db.addDomainPattern(
      domain,
      inputHash,
      inputPreview,
      detectedDomains,
      promptEnhancement
    );
  });
  
  const keywords = extractKeywords(`${aiResponse} ${userQuestion || ''}`);
  keywords.slice(0, 10).forEach(keyword => {
    detectedDomains.forEach(domain => {
      db.addDomainMapping(keyword, domain, 0.5);
    });
  });
}

export function recordFeedback(opinionId: string, helpful: boolean, domainsApplied: string): void {
  db.addFeedback(opinionId, helpful, domainsApplied);
}

export function getLearnedDomains(): string[] {
  const patterns = db.getAllDomainMappings();
  return Array.from(new Set(patterns.map(p => p.domain)));
}

export default {
  generateInputHash,
  extractKeywords,
  detectDomains,
  learnFromInteraction,
  recordFeedback,
  getLearnedDomains
};
