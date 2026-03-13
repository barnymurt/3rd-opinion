import { NextRequest, NextResponse } from 'next/server';

const opinionsDb: Array<{
  id: string;
  aiResponse: string;
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
  try {
    const body = await request.json();
    const { aiResponse, platform, url } = body;

    if (!aiResponse) {
      return NextResponse.json(
        { error: 'AI response is required' },
        { status: 400 }
      );
    }

    const opinion = await generateSecondOpinion(aiResponse);

    const savedOpinion = {
      id: Date.now().toString(),
      aiResponse,
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
    });
  } catch (error) {
    console.error('Second Opinion error:', error);
    return NextResponse.json(
      { error: 'Failed to generate second opinion' },
      { status: 500 }
    );
  }
}

async function generateSecondOpinion(aiResponse: string) {
  const systemPrompt = `You are a balanced thinking partner. Your goal is to provide constructive alternative perspectives on AI outputs WITHOUT being negative or creating anxiety.
  
  IMPORTANT TONE GUIDELINES:
  - Be constructive, not confrontational
  - Offer perspectives that help the user think more broadly
  - Avoid words like "wrong", "mistake", "error", "fear", "worry", "danger"
  - Use phrases like "consider", "also think about", "another angle", "alternative perspective"
  - Frame challenges as "here's another way to look at this"
  
  Focus on:
  - Alternative angles the AI might have missed
  - Different stakeholder perspectives
  - Potential edge cases
  - Additional context that could be relevant
  - Questions the AI didn't address
  
  Output ONLY valid JSON with this exact structure:
  {
    "summary": ["point 1", "point 2", "point 3", "point 4", "point 5"],
    "alternativePerspectives": "2-3 paragraphs exploring different angles",
    "assumptions": "2-3 paragraphs on what assumptions might be being made",
    "considerations": "2-3 paragraphs on additional factors to consider"
  }`;

  const userPrompt = `Provide a balanced second opinion on this AI response:\n\n${aiResponse}`;

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

  return generateFallbackOpinion(aiResponse);
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

function generateFallbackOpinion(aiResponse: string) {
  return {
    summary: [
      "Consider whether all alternative approaches were explored",
      "Think about who might have different perspectives on this topic",
      "Consider what additional context might be relevant",
      "Think about the long-term implications of this approach",
      "Consider what questions remain unanswered"
    ],
    alternativePerspectives: `While the response provides useful information, there are several angles worth exploring. Different stakeholders might emphasize different aspects of this topic. For example, someone with technical expertise might focus on implementation details, while a business perspective might prioritize ROI and timeline. Consider what perspective would be most valuable for your specific situation.`,
    assumptions: `Every response makes assumptions about context that may or may not be accurate. Consider what assumptions might be embedded in this response - about your expertise level, your goals, your constraints, or your industry. These assumptions could shape the advice in ways that may not align with your specific situation.`,
    considerations: `Beyond the immediate response, there are often additional factors worth considering. These might include: resource constraints you face, timeline pressures, stakeholder buy-in requirements, technical dependencies, and potential unintended consequences. Also consider what follow-up questions this response might raise and what additional information would help you make a more informed decision.`
  };
}

export async function GET() {
  return NextResponse.json({
    opinions: opinionsDb.reverse().slice(0, 50),
    total: opinionsDb.length
  });
}
