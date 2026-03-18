import * as db from './database';

interface PromptComponents {
  core: string;
  domains: string[];
  learned: string[];
}

const CORE_PROMPT = `You are a critical thinking analyst providing a third opinion on AI responses. Your role is to help users think deeper about AI-generated content, not to dismiss it.

CRITICAL REQUIREMENTS:
- Be specific to the content being analyzed
- Reference specific claims, phrases, or recommendations from the AI response
- Provide constructive insights that help the user think deeper
- Apply relevant critical thinking frameworks
- Identify what the AI might have missed

Output ONLY valid JSON with this exact structure:
{
  "summary": ["A specific insight on point 1", "A different angle on point 2", "A counter-perspective on point 3", "A relevant consideration the AI missed", "A question that challenges the AI's conclusion"],
  "alternativePerspectives": "2-3 paragraphs on alternative viewpoints specific to what the AI claimed",
  "assumptions": "2-3 paragraphs on specific assumptions the AI made",
  "considerations": "2-3 paragraphs on additional factors specific to this situation",
  "domainsApplied": ["domain1", "domain2", "domain3"],
  "suggestedQuestions": ["Question 1", "Question 2", "Question 3"]
}`;

const DOMAIN_PROMPTS: Record<string, string> = {
  'logical-reasoning': `LOGICAL REASONING: Analyze for logical fallacies (ad hominem, straw man, false dichotomy, slippery slope, circular reasoning, hasty generalization). Check if conclusions follow from premises. Look for absolute language (always, never, must) that signals potential overreach.`,

  'fact-checking': `FACT CHECKING: Identify specific factual claims, statistics, or data points. Note what can be verified vs what cannot. Consider if information is current. Look for proper sourcing.`,

  'perspective-diversity': `PERSPECTIVE DIVERSITY: Identify what viewpoints might be missing. Consider different cultural, economic, or contextual perspectives. What other stakeholders might disagree? What alternatives weren't considered?`,

  'assumption-detection': `ASSUMPTION DETECTION: Identify hidden assumptions about the user's context, expertise level, resources, or constraints. What must be true for this advice to work? What is the AI not asking about?`,

  'bias-detection': `BIAS DETECTION: Look for framing that favors one perspective. Note emotional language, selective presentation, or appeals to authority. How might this be biased?`,

  'risk-analysis': `RISK ANALYSIS: What could go wrong? What are the tradeoffs? What edge cases might break this? What is the opportunity cost?`,

  'socratic': `SOCRATIC QUESTIONING: Generate probing questions that deepen thinking. Challenge assumptions. Surface what isn't being asked.`
};

export function buildPrompt(
  aiResponse: string,
  userQuestion: string,
  detectedDomains: string[]
): string {
  const domainSections = detectedDomains
    .filter(d => DOMAIN_PROMPTS[d])
    .map(d => DOMAIN_PROMPTS[d])
    .join('\n\n');

  const learnedPatterns = getLearnedEnhancements(detectedDomains);

  const userPrompt = `Analyze this AI response using critical thinking frameworks.

AI RESPONSE TO ANALYZE:
${aiResponse.substring(0, 3000)}

${userQuestion ? `USER'S ORIGINAL QUESTION:\n${userQuestion}\n` : ''}

APPLY THESE DOMAINS:
${domainSections}

${learnedPatterns.length > 0 ? `\nLEARNED PATTERNS (from past interactions):\n${learnedPatterns.join('\n')}\n` : ''}

Be specific to the content above. Your analysis should help the user think deeper about this specific AI response.`;

  return `${CORE_PROMPT}\n\n${userPrompt}`;
}

function getLearnedEnhancements(detectedDomains: string[]): string[] {
  const patterns = db.getEffectivePatterns(0.5);
  
  const relevantPatterns = patterns
    .filter(p => detectedDomains.includes(p.domain))
    .sort((a, b) => b.effectivenessScore - a.effectivenessScore)
    .slice(0, 3);

  return relevantPatterns.map(p => {
    const domains = p.detectedDomains.join(', ');
    return `[${domains}] ${p.promptEnhancement.substring(0, 100)}`;
  });
}

export function extractPromptEnhancement(aiResponse: string, detectedDomains: string[]): string {
  const domainList = detectedDomains.join(', ');
  const responsePreview = aiResponse.substring(0, 150);
  return `Domains: ${domainList} | Response: ${responsePreview}...`;
}

export function validateDomains(domains: string[]): string[] {
  const validDomains = Object.keys(DOMAIN_PROMPTS);
  return domains.filter(d => validDomains.includes(d));
}

export default {
  buildPrompt,
  extractPromptEnhancement,
  validateDomains
};
