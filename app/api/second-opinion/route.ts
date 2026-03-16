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
    const body = await request.json();
    const { aiResponse, userQuestion, platform, url, chatName } = body;

    if (!aiResponse) {
      return NextResponse.json(
        { error: 'AI response is required' },
        { status: 400 }
      );
    }

    const opinion = await generateSecondOpinion(aiResponse, userQuestion);

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
      { error: 'Failed to generate second opinion' },
      { status: 500 }
    );
  }
}

async function generateSecondOpinion(aiResponse: string, userQuestion?: string) {
  const questionContext = userQuestion ? `\n\nThe user's original question was: "${userQuestion}"` : '';
  
  const systemPrompt = `You are a critical thinking partner. Your job is to provide genuinely DIFFERENT perspectives on AI responses that challenge groupthink and confirmation bias.
  
  CRITICAL REQUIREMENTS:
  - Focus specifically on the CONTENT of the AI response
  - Identify specific claims, recommendations, or conclusions in the AI response
  - Provide alternative viewpoints that are RELEVANT to those specific points
  - Don't give generic advice - make it specific to what was actually said
  
  Output ONLY valid JSON with this exact structure:
  {
    "summary": ["A specific alternative view on point 1", "A different angle on point 2", "A counter-perspective on point 3", "A relevant consideration the AI missed", "A question that challenges the AI's conclusion"],
    "alternativePerspectives": "2-3 paragraphs specifically addressing what the AI claimed",
    "assumptions": "2-3 paragraphs on specific assumptions the AI made",
    "considerations": "2-3 paragraphs on additional factors specific to this situation"
  }`;

  const userPrompt = `Analyze this AI response and provide a different perspective.

AI Response: ${aiResponse.substring(0, 3000)}${userQuestion ? '\n\nUser Question: ' + userQuestion : ''}`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY || '',
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 1000,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }]
      })
    });

    if (response.ok) {
      const data = await response.json();
      const content = data.content?.[0]?.text || '';
      
      try {
        const parsed = JSON.parse(content);
        return parsed;
      } catch {
        return parseStructuredResponse(content);
      }
    }
  } catch (error) {
    console.error('AI API error:', error);
  }

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
  return {
    summary: [
      "Consider whether all alternative approaches were explored",
      "Think about who might have different perspectives on this topic",
      "Consider what additional context might be relevant",
      "Think about the long-term implications of this approach",
      "Consider what questions remain unanswered"
    ],
    alternativePerspectives: `While the response provides useful information, there are several angles worth exploring${q}. Different stakeholders might emphasize different aspects of this topic. For example, someone with technical expertise might focus on implementation details, while a business perspective might prioritize ROI and timeline. Consider what perspective would be most valuable for your specific situation.`,
    assumptions: `Every response makes assumptions about context that may or may not be accurate. Consider what assumptions might be embedded in this response - about your expertise level, your goals, your constraints, or your industry. These assumptions could shape the advice in ways that may not align with your specific situation.`,
    considerations: `Beyond the immediate response, there are often additional factors worth considering. These might include: resource constraints you face, timeline pressures, stakeholder buy-in requirements, technical dependencies, and potential unintended consequences. Also consider what follow-up questions this response might raise and what additional information would help you make a more informed decision.`
  };
}

export async function GET() {
  return NextResponse.json({
    opinions: opinionsDb.reverse().slice(0, 50),
    total: opinionsDb.length
  }, {
    headers: {
      'Access-Control-Allow-Origin': '*',
    }
  });
}
