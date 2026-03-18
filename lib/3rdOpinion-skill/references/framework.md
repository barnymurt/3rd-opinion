# 3rdOpinion Framework

Core methodology for the 3rdOpinion skill.

## Overview

3rdOpinion provides critical thinking analysis on AI responses through a structured approach that combines multiple domain expertise with learned patterns from past interactions.

## Core Principles

### 1. Domain-Aware Analysis
Not all AI responses need the same type of critique. A factual question needs different analysis than a creative writing request. The skill detects which domains are relevant and applies appropriate frameworks.

### 2. Knowledge Accumulation
Every interaction improves future responses. The skill learns:
- Which domains apply to different types of content
- What prompt patterns are most effective
- What keywords indicate specific domains

### 3. Progressive Depth
Start with core critical thinking, add domain-specific frameworks, then incorporate learned patterns for maximum relevance.

### 4. Constructive Critique
The goal is not to dismiss AI responses but to enhance them. Every critique should help the user think deeper, not just point out flaws.

## Processing Pipeline

```
Input: AI Response + User Question
         │
         ▼
┌─────────────────────┐
│  Domain Detection  │ ◄── Analyze content + learned mappings
└─────────────────────┘
         │
         ▼
┌─────────────────────┐
│  Load Domain       │ ◄── Fetch relevant domain modules
│  Modules           │
└─────────────────────┘
         │
         ▼
┌─────────────────────┐
│  Retrieve Learned  │ ◄── Query patterns from past interactions
│  Patterns          │
└─────────────────────┘
         │
         ▼
┌─────────────────────┐
│  Build Enhanced    │ ◄── Combine core + domains + patterns
│  Prompt            │
└─────────────────────┘
         │
         ▼
┌─────────────────────┐
│  Generate          │ ◄── Send to LLM
│  Analysis          │
└─────────────────────┘
         │
         ▼
┌─────────────────────┐
│  Store Interaction │ ◄── Save for future learning
│  for Learning      │
└─────────────────────┘
         │
         ▼
Output: Structured Critique
```

## Domain Selection Guidelines

### Primary Domains (Apply to Most Responses)
- Logical Reasoning - always valuable
- Assumption Detection - most advice contains assumptions

### Secondary Domains (Apply Based on Content)
- Fact Checking - when claims are made
- Perspective Diversity - when recommendations given
- Risk Analysis - when solutions proposed

### Tertiary Domains (Selective Application)
- Bias Detection - when framing seems one-sided
- Socratic - for important decisions, follow-up questions

## Prompt Construction

### Core Component (Always Included)
```
You are a critical thinking analyst. Analyze the AI response 
using multiple analytical frameworks. Be specific, constructive, 
and focus on helping the user think deeper.
```

### Domain Component (Selected Domains)
For each selected domain, include:
- Domain-specific analysis guidance
- What to look for in this content
- Questions to ask

### Learned Pattern Component
- Effective prompt phrases from past interactions
- Domain combinations that worked well
- Specific language that improved responses

## Output Quality Standards

### Must Include
- Specific references to the AI response content
- Actionable insights, not generic advice
- At least 3 domains applied
- Constructive tone

### Should Include
- Questions for further thought
- Alternative perspectives
- Risk/consideration awareness

### Avoid
- Generic critical thinking advice
- Dismissing the AI response entirely
- Overly negative tone
- Ignoring user context
