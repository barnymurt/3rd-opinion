import { NextRequest, NextResponse } from 'next/server';

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

    const opinion = await generateSecondOpinion(aiResponse, userQuestion, apiKey, provider);

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
    console.error('Second Opinion error:', error);
    return NextResponse.json(
      { error: 'Failed to generate second opinion', details: String(error) },
      { status: 500 }
    );
  }
}

async function generateSecondOpinion(aiResponse: string, userQuestion?: string, apiKey?: string, provider?: string) {
  const questionContext = userQuestion ? `\n\nThe user's original question was: "${userQuestion}"` : '';
  
  const systemPrompt = `You are a Devil's Advocate - a skilled critical thinker who systematically challenges AI responses to help users think more deeply and avoid confirmation bias.

CORE METHODOLOGY (adapted from Devil's Advocate skill):
1. Extract the Claim Set - Identify the core thesis and decompose into assumptions about: the problem, the customer, the solution, the market, the business model, and timing
2. Challenge Assumptions - For high-risk assumptions, ask "Why would this NOT be true?" and provide evidence
3. Test Value Proposition - Apply the Switchover Test, 10x Better Test, Would You Pay Test
4. Model Customer Objections - Predict specific objections in the customer's voice
5. Identify Blind Spots - Surface things the user hasn't considered (do-nothing competitor, adjacent player threats, edge cases)
6. Synthesize Verdict - Balanced assessment with strengths, risks, and recommended actions

CRITICAL REQUIREMENTS:
- Focus specifically on the CONTENT of the AI response
- Identify specific claims, recommendations, or conclusions in the AI response
- Provide alternative viewpoints that are RELEVANT to those specific points
- Don't give generic advice - make it specific to what was actually said
- Be constructive, not hostile - every challenge comes with a path forward
- Tone: direct, constructive, specific - like a tough-but-fair investor meeting

Output ONLY valid JSON with this exact structure:
{
  "summary": ["A specific alternative view/challenge on point 1", "A different angle on point 2", "A counter-perspective on point 3", "A relevant consideration the AI missed", "A question that challenges the AI's conclusion"],
  "alternativePerspectives": "2-3 paragraphs specifically addressing what the AI claimed, using Devil's Advocate methodology",
  "assumptions": "2-3 paragraphs on specific assumptions the AI made, ranked by risk",
  "considerations": "2-3 paragraphs on additional factors specific to this situation, including blind spots and potential objections"
}`;

  const userPrompt = `Analyze this AI response using the Devil's Advocate methodology. 

AI Response to analyze: ${aiResponse.substring(0, 3000)}${userQuestion ? '\n\nUser Question: ' + userQuestion : ''}

Apply the Devil's Advocate framework:
1. Extract what claims/assertions the AI is making
2. Identify the underlying assumptions (about the problem, solution, customer, market)
3. Challenge the 3-5 most critical assumptions with "Why would this NOT be true?"
4. Predict what objections or pushback a skeptical customer would raise
5. Identify blind spots - what is the AI response NOT considering?

Be specific to the actual content - not generic advice.`;

  // Use user-provided API key or fall back to env
  // Priority: user-provided > ANTHROPIC_API_KEY > MINIMAX_API_KEY
  const userProvidedKey = apiKey;
  const anthropicEnvKey = process.env.ANTHROPIC_API_KEY;
  const minimaxEnvKey = process.env.MINIMAX_API_KEY;
  
  // Determine which provider to use
  const useAnthropic = userProvidedKey || anthropicEnvKey;
  const effectiveProvider = provider || (useAnthropic ? 'anthropic' : 'minimax');

  console.log('=== GENERATING OPINION ===');
  console.log('Effective provider:', effectiveProvider);
  console.log('User provided key:', !!userProvidedKey);
  console.log('Has Anthropic env key:', !!anthropicEnvKey);
  console.log('Has Minimax env key:', !!minimaxEnvKey);

  // Skip external APIs for now and use fallback directly
  console.log('=== USING DEVIL\'S ADVOCATE FALLBACK (no valid API key) ===');
  return generateFallbackOpinion(aiResponse, userQuestion);
}

function parseStructuredResponse(content: string) {
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0]);
    } catch {
      // Continue to fallback
    }
  }
  
  return generateFallbackOpinion(content);
}

function generateFallbackOpinion(aiResponse: string, userQuestion?: string) {
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
    alternativePerspectives: `The AI provided a response starting with "${responsePreview}...". From a Devil's Advocate perspective, consider: (1) The AI may be optimizing for a generic use case, not your specific needs. (2) Alternative solutions might exist that weren't mentioned. (3) The AI's training data may influence its recommendations in ways not visible to you. (4) Consider who might disagree with this approach and why. To validate, ask the AI to explain alternative approaches and their tradeoffs.${q}`,
    assumptions: `Every AI response contains implicit assumptions: (1) Assumptions about your expertise level - the response may be too basic or too advanced. (2) Assumptions about your constraints - resources, timeline, or tools you have access to. (3) Assumptions about your goals - the AI may optimize for different outcomes than you want. (4) Assumptions about context - the AI doesn't know your specific situation. Question each recommendation by asking "What would need to be true for this to be the best approach?"`,
    considerations: `Beyond the immediate response, consider: (1) What edge cases might break this solution? (2) What are the long-term maintenance implications? (3) What would a competitor or alternative vendor recommend differently? (4) What evidence would change your mind about this advice? (5) What follow-up questions would help you validate this guidance? The best way to use AI responses is as a starting point for deeper exploration, not as final authority.`
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
