---
name: 3rd-opinion
description: Critical thinking skill that provides third opinion analysis on AI responses. Use when user wants to validate, critique, or get alternative perspectives on AI-generated content. Analyzes the AI response using multiple critical thinking domains, learns from interactions to improve over time, and applies domain-specific frameworks based on content analysis. Distinct from Devil's Advocate (product/SaaS focused) - this skill handles broad, general AI responses across all domains.
---

# 3rdOpinion Skill

Provide critical thinking analysis on any AI response. This skill analyzes AI outputs through multiple critical thinking domains, draws on learned patterns from past interactions, and provides nuanced critique that goes beyond simple prompting.

## Core Philosophy

- **Not just a prompt**: Builds knowledge from every interaction
- **Domain-aware**: Applies appropriate critical thinking frameworks based on content
- **Contextual**: Uses learned patterns to improve relevance
- **Structured**: Consistent output format that users can act on

## When to Use This Skill

Use when:
- User asks for feedback on AI response quality
- User wants alternative perspectives on AI advice
- User questions AI accuracy or completeness
- User seeks deeper analysis of AI output
- Any critique/validation of AI-generated content is needed

Do NOT use for:
- Product/SaaS analysis (use Devil's Advocate skill instead)
- General conversation without AI content to analyze

## Supported Domains

This skill operates across 7 critical thinking domains:

1. **Logical Reasoning** - Fallacies, coherence, argument validity
2. **Fact Checking** - Claims verification, source credibility, data accuracy
3. **Perspective Diversity** - Alternative viewpoints, cultural/context differences
4. **Assumption Detection** - Hidden premises, unstated context
5. **Bias Detection** - Cognitive biases, framing issues
6. **Risk/Tradeoff Analysis** - What could go wrong, pros/cons
7. **Socratic Questioning** - Probing questions to deepen thinking

See [domains/](domains/) for detailed domain-specific prompts and heuristics.

## Workflow

### Step 1: Domain Detection

Analyze both the AI response AND user question to determine which domains are most relevant:

```
Detection Process:
1. Extract keywords from AI response
2. Extract keywords from user question
3. Query learned domain mappings
4. Analyze content signals (e.g., "always/never" → logical reasoning)
5. Weight and rank domains
6. Return top 3-5 domains
```

See [learning/pattern-manager.js](learning/pattern-manager.js) for detection logic.

### Step 2: Load Domain Modules

For each detected domain, load the appropriate domain module from [domains/](domains/):
- logical-reasoning.md
- fact-checking.md
- perspective-diversity.md
- assumption-detection.md
- bias-detection.md
- risk-analysis.md
- socratic.md

### Step 3: Retrieve Learned Patterns

Query the knowledge base for similar past interactions:
- Check [learning/prompt-enhancer.js](learning/prompt-enhancer.js)
- Retrieve effective prompt patterns for detected domains
- Incorporate into final prompt

### Step 4: Build Enhanced Prompt

Construct the analysis prompt using:
- Core critical thinking instructions
- Relevant domain modules
- Learned patterns from past interactions
- Specific guidance for the detected domains

### Step 5: Generate Analysis

Send to LLM with the enhanced prompt, receive structured critique.

### Step 6: Store for Learning

After response is delivered, store the interaction:
- Input (AI response + question)
- Detected domains
- Prompt patterns used
- (Later: user feedback for effectiveness scoring)

## Output Format

Always return structured JSON:

```json
{
  "summary": ["Key insight 1", "Key insight 2", "Key insight 3", "Key insight 4", "Key insight 5"],
  "alternativePerspectives": "2-3 paragraphs on alternative viewpoints",
  "assumptions": "2-3 paragraphs on detected assumptions",
  "considerations": "2-3 paragraphs on additional factors to consider",
  "domainsApplied": ["domain1", "domain2", "domain3"],
  "suggestedQuestions": ["Question 1", "Question 2", "Question 3"]
}
```

## Learning System

The skill improves over time through:

1. **Pattern Storage**: Every interaction is stored with detected domains
2. **Keyword Mapping**: Learn which keywords map to which domains
3. **Prompt Enhancement**: Build effective prompt combinations from past successes
4. **Feedback Integration**: (Future) User thumbs up/down refines recommendations

See [learning/](learning/) for implementation details.

## References

- Core methodology: [references/framework.md](references/framework.md)
- Domain modules: [domains/](domains/)
