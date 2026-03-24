import { NextRequest, NextResponse } from 'next/server';
import * as patternManager from '../../../lib/3rdOpinion-skill/learning/pattern-manager';
import * as promptEnhancer from '../../../lib/3rdOpinion-skill/learning/prompt-enhancer';

const opinionsDb: Array<{
  id: string;
  aiResponse: string;
  userQuestion: string;
  chatName: string;
  opinion: {
    summary: string[];
    alternativePerspectives: string;
    assumptions: string;
    considerations: string;
    domainsApplied?: string[];
    suggestedQuestions?: string[];
  };
  platform: string;
  createdAt: string;
  creditsUsed: number;
}> = [];

export async function POST(request: NextRequest) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
  
  if (request.method === 'OPTIONS') {
    return new NextResponse(null, { headers: corsHeaders });
  }
  
  try {
    console.log('🔔 API ENDPOINT HIT');
    const body = await request.json();
    console.log('📝 Request body received');
    
    const { aiResponse, userQuestion, platform, url, chatName, apiKey, provider } = body;

    console.log('=== API REQUEST RECEIVED ===');
    console.log('Full body keys:', Object.keys(body));
    console.log('Provider from client:', provider);
    console.log('API key from client:', apiKey ? 'YES (' + apiKey.substring(0, 10) + '...)' : 'NO');
    console.log('User question:', userQuestion ? userQuestion.substring(0, 50) + '...' : 'none');
    console.log('AI response length:', aiResponse?.length || 0);

    if (!aiResponse) {
      return NextResponse.json(
        { error: 'AI response is required' },
        { status: 400 }
      );
    }

    const opinion = await generateThirdOpinion(aiResponse, userQuestion, apiKey, provider);

    const savedOpinion = {
      id: Date.now().toString(),
      aiResponse,
      userQuestion: userQuestion || '',
      chatName: chatName || 'Untitled Chat',
      opinion,
      platform,
      createdAt: new Date().toISOString(),
      creditsUsed: 1
    };
    opinionsDb.push(savedOpinion);

    patternManager.learnFromInteraction(
      aiResponse,
      userQuestion,
      opinion.domainsApplied || [],
      promptEnhancer.extractPromptEnhancement(aiResponse, opinion.domainsApplied || [])
    );

    return NextResponse.json({
      success: true,
      opinion,
      opinionId: savedOpinion.id
    }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
      }
    });
  } catch (error) {
    console.error('Third Opinion error:', error);
    return NextResponse.json(
      { error: 'Failed to generate third opinion', details: String(error), envKeyExists: !!process.env.MINIMAX_API_KEY, envKeyPrefix: process.env.MINIMAX_API_KEY ? process.env.MINIMAX_API_KEY.substring(0, 15) : 'none' },
      { status: 500 }
    );
  }
}

async function generateThirdOpinion(aiResponse: string, userQuestion?: string, apiKey?: string, provider?: string) {
  const detectedDomains = patternManager.detectDomains(aiResponse, userQuestion);
  
  console.log('=== DETECTED DOMAINS ===');
  console.log('Domains:', detectedDomains);

  const prompt = promptEnhancer.buildPrompt(aiResponse, userQuestion || '', detectedDomains);

  // Use user-provided key if available, otherwise fall back to env
  // Provider determines which API to call
  const userProvidedKey = apiKey || '';
  const userProvider = provider || 'minimax'; // default to minimax since it works
  
  // Get keys from environment as fallback
  const envAnthropicKey = process.env.ANTHROPIC_API_KEY || '';
  const envMinimaxKey = process.env.MINIMAX_API_KEY || '';
  
  // Determine which key to use based on provider
  let effectiveKey = '';
  let useAnthropic = false;
  
  if (userProvidedKey.length > 10) {
    // User provided a key - use it based on provider
    effectiveKey = userProvidedKey;
    useAnthropic = userProvider === 'anthropic';
  } else if (envAnthropicKey.length > 10) {
    // No user key, try env anthropic
    effectiveKey = envAnthropicKey;
    useAnthropic = true;
  } else if (envMinimaxKey.length > 10) {
    // No anthropic, try env minimax
    effectiveKey = envMinimaxKey;
    useAnthropic = false;
  } else {
    // No valid keys - will use fallback
    effectiveKey = '';
    useAnthropic = false;
  }
  
  console.log('=== API KEY DEBUG ===');
  console.log('User provider:', userProvider);
  console.log('User key length:', userProvidedKey.length);
  console.log('Use Anthropic:', useAnthropic);
  console.log('Effective key:', effectiveKey ? effectiveKey.substring(0, 10) + '...' : 'NONE');
  
  const useMinimax = !useAnthropic && effectiveKey.length > 10;

  console.log('=== GENERATING THIRD OPINION ===');
  console.log('Using Anthropic:', !!useAnthropic);
  console.log('Using Minimax:', !!useMinimax);

  if (useAnthropic && effectiveKey) {
    console.log('Trying Anthropic API...');
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);
      
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': effectiveKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-3-haiku-20240307',
          max_tokens: 1024,
          messages: [{ role: 'user', content: prompt }]
        }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      console.log('Anthropic response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('Anthropic response received');
        const content = data.content?.[0]?.text || '';
        
        try {
          const parsed = JSON.parse(content);
          console.log('Successfully parsed Anthropic response');
          return {
            ...parsed,
            domainsApplied: detectedDomains
          };
        } catch {
          console.log('Failed to parse Anthropic JSON, trying to extract...');
          return parseStructuredResponse(content, detectedDomains);
        }
      } else {
        const errorText = await response.text();
        console.error('Anthropic API error:', response.status, errorText);
      }
    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.error('Anthropic API timed out');
      } else {
        console.error('Anthropic API exception:', error);
      }
    }
  }

  if (useMinimax && effectiveKey) {
    console.log('Trying Minimax API (Anthropic-compatible)...');
    console.log('Minimax key prefix:', effectiveKey.substring(0, 15));
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      console.log('Making Minimax request to api.minimax.io/anthropic...');
      
      const mmResponse = await fetch('https://api.minimax.io/anthropic/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': effectiveKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'MiniMax-M2.7',
          max_tokens: 1024,
          messages: [
            { role: 'user', content: prompt }
          ]
        }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      console.log('Minimax response status:', mmResponse.status);
      
      if (mmResponse.ok) {
        const data = await mmResponse.json();
        console.log('Minimax response received');
        
        let content = '';
        if (data.content && Array.isArray(data.content)) {
          for (const block of data.content) {
            if (block.type === 'text') {
              content += block.text + ' ';
            }
          }
        }
        content = content.trim();
        
        if (content) {
          try {
            const parsed = JSON.parse(content);
            console.log('Successfully parsed Minimax response');
            return {
              ...parsed,
              domainsApplied: detectedDomains
            };
          } catch {
            console.log('Failed to parse Minimax JSON, trying to extract...');
            return parseStructuredResponse(content, detectedDomains);
          }
        }
      } else {
        const errorText = await mmResponse.text();
        console.error('Minimax API error:', mmResponse.status, errorText);
        if (mmResponse.status === 401 || mmResponse.status === 403) {
          console.log('Invalid API key, using fallback');
        }
      }
    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.error('Minimax API timed out');
      } else {
        console.error('Minimax API exception:', error);
      }
    }
  }

  console.log('=== USING 3RD OPINION FALLBACK ===');
  return generateFallbackOpinion(aiResponse, userQuestion, detectedDomains);
}

function parseStructuredResponse(content: string, detectedDomains: string[]) {
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        ...parsed,
        domainsApplied: detectedDomains
      };
    } catch {
      // Continue to fallback
    }
  }
  
  return generateFallbackOpinion(content);
}

function generateFallbackOpinion(aiResponse: string, userQuestion?: string, detectedDomains: string[] = []) {
  const q = userQuestion ? ` about "${userQuestion}"` : '';
  const responsePreview = aiResponse.substring(0, 200);
  
  return {
    summary: [
      `Consider whether the AI's recommendation "${responsePreview}..." fully addresses your actual need`,
      "What assumptions is the AI making about your context that might not apply?",
      "What alternative approaches might work better for your specific situation?",
      "What potential drawbacks or risks did the AI not mention?",
      "What questions should you ask to validate this advice?"
    ],
    alternativePerspectives: `The AI provided a response starting with "${responsePreview}...". From a critical thinking perspective, consider: (1) The AI may be optimizing for a generic use case, not your specific needs. (2) Alternative solutions might exist that weren't mentioned. (3) The AI's training data may influence its recommendations in ways not visible to you. (4) Consider who might disagree with this approach and why.${q}`,
    assumptions: `Every AI response contains implicit assumptions: (1) Assumptions about your expertise level - the response may be too basic or too advanced. (2) Assumptions about your constraints - resources, timeline, or tools you have access to. (3) Assumptions about your goals - the AI may optimize for different outcomes than you want. (4) Assumptions about context - the AI doesn't know your specific situation.`,
    considerations: `Beyond the immediate response, consider: (1) What edge cases might break this solution? (2) What are the long-term implications? (3) What alternative perspectives exist? (4) What would change your mind about this advice? (5) What follow-up questions would help validate this guidance?`,
    domainsApplied: detectedDomains.length > 0 ? detectedDomains : ['logical-reasoning', 'assumption-detection'],
    suggestedQuestions: [
      "What would need to be true for this advice to be wrong?",
      "Who might disagree with this perspective?",
      "What is the AI not telling me?",
      "What are the tradeoffs?",
      "What additional context would change this advice?"
    ]
  };
}

export async function GET() {
  return NextResponse.json({
    opinions: opinionsDb.reverse().slice(0, 50),
    total: opinionsDb.length,
    debug: {
      hasAnthropicKey: !!process.env.ANTHROPIC_API_KEY,
      hasMinimaxKey: !!process.env.MINIMAX_API_KEY,
      minimaxKeyPrefix: process.env.MINIMAX_API_KEY ? process.env.MINIMAX_API_KEY.substring(0, 10) : 'none'
    }
  }, {
    headers: {
      'Access-Control-Allow-Origin': '*',
    }
  });
}
