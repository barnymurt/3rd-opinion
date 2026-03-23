# Second Opinion

**Balance AI's tendency to agree.**

Second Opinion provides critical thinking analysis on AI chat responses, helping you identify assumptions, explore alternative perspectives, and think more deeply about AI-generated advice.

## Overview

AI systems often have a tendency to agree with or validate what users say. This project provides a "third opinion" - structured critical thinking analysis that challenges AI responses through multiple analytical frameworks.

### Key Features

- **Critical Thinking Analysis**: Analyzes AI responses through 7 analytical domains
- **Multi-Platform Support**: Works with ChatGPT, Claude, Gemini, and Perplexity
- **Credit System**: 20 free opinions per month (Pro tier available)
- **Learning System**: Improves analysis based on interaction patterns
- **Browser Extension**: Quick access directly from AI chat interfaces
- **Dashboard**: View history, stats, and manage your account

## Project Structure

```
second-opinion/
├── app/                          # Next.js web application
│   ├── api/second-opinion/       # API route for generating opinions
│   │   └── route.ts
│   ├── second-opinion/           # Main dashboard page
│   │   └── page.tsx
│   ├── layout.tsx
│   └── globals.css
├── extension/                     # Browser extension (Chrome)
│   ├── manifest.json
│   ├── background.js
│   ├── content-script.js
│   ├── content.css
│   └── popup/
│       ├── popup.html
│       └── popup.js
├── lib/3rdOpinion-skill/          # Critical thinking skill system
│   ├── SKILL.md                   # Skill definition
│   ├── references/
│   │   └── framework.md           # Core methodology
│   ├── domains/                  # Analytical domain modules
│   │   ├── logical-reasoning.md
│   │   ├── fact-checking.md
│   │   ├── perspective-diversity.md
│   │   ├── assumption-detection.md
│   │   ├── bias-detection.md
│   │   ├── risk-analysis.md
│   │   └── socratic.md
│   └── learning/                 # Learning system
│       ├── pattern-manager.ts
│       ├── prompt-enhancer.ts
│       └── database.ts
└── data/
    └── 3rdopinion.json            # Pattern storage
```

## Analytical Domains

The system applies 7 critical thinking domains to AI responses:

1. **Logical Reasoning** - Fallacies, coherence, argument validity
2. **Fact Checking** - Claims verification, source credibility, data accuracy
3. **Perspective Diversity** - Alternative viewpoints, cultural/context differences
4. **Assumption Detection** - Hidden premises, unstated context
5. **Bias Detection** - Cognitive biases, framing issues
6. **Risk/Tradeoff Analysis** - What could go wrong, pros/cons
7. **Socratic Questioning** - Probing questions to deepen thinking

## Getting Started

### Prerequisites

- Node.js 18+
- npm or pnpm

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

The web app will be available at `http://localhost:3000`.

### Build

```bash
npm run build
```

### Lint

```bash
npm run lint
```

## Environment Variables

Create a `.env.local` file with the following variables:

```env
ANTHROPIC_API_KEY=your_anthropic_key
MINIMAX_API_KEY=your_minimax_key
```

Both API keys are optional. The system will fall back to a built-in analysis if no API keys are available.

## Browser Extension

The extension is located in the `extension/` directory. To use it:

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the `extension/` directory

The extension supports:
- ChatGPT (chatgpt.com, chat.openai.com)
- Claude (claude.ai)
- Gemini (gemini.google.com)
- Perplexity (perplexity.ai)

## How It Works

1. **Chat with AI** - Have a conversation on any supported platform
2. **Get Prompted** - After 7+ minutes of chatting, you'll be prompted to get a second opinion
3. **View Analysis** - See bullet points summarizing key insights plus detailed analysis including:
   - Alternative perspectives
   - Assumptions the AI made
   - Additional considerations

## API

### POST `/api/second-opinion`

Generate a second opinion for an AI response.

**Request Body:**
```json
{
  "aiResponse": "The AI's response text",
  "userQuestion": "The original user question",
  "platform": "chatgpt",
  "chatName": "Conversation title",
  "apiKey": "optional API key",
  "provider": "anthropic|minimax"
}
```

**Response:**
```json
{
  "success": true,
  "opinion": {
    "summary": ["Key insight 1", "..."],
    "alternativePerspectives": "2-3 paragraphs...",
    "assumptions": "2-3 paragraphs...",
    "considerations": "2-3 paragraphs...",
    "domainsApplied": ["logical-reasoning", "..."],
    "suggestedQuestions": ["Question 1", "..."]
  },
  "opinionId": "unique_id"
}
```

### GET `/api/second-opinion`

Retrieve stored opinions.

## Technology Stack

- **Framework**: Next.js 14
- **UI**: React 18, Tailwind CSS
- **Language**: TypeScript
- **Extension**: Chrome Extension (Manifest V3)

## License

Private - All rights reserved
