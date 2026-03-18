# Assumption Detection Domain

Identifies hidden premises, unstated context, and implicit assumptions in AI responses.

## What to Look For

### Types of Assumptions

**About the User**
- Expertise level (beginner vs expert)
- Resources available (time, money, tools)
- Goals and priorities
- Constraints and limitations

**About the Context**
- Geographic location
- Industry/domain
- Company size/resources
- Technical infrastructure

**About the Problem**
- Problem definition
- Success criteria
- Scope boundaries
- Stakeholder buy-in

**About the Solution**
- Feasibility assumptions
- Effectiveness assumptions
- Adoption assumptions
- Sustainability assumptions

## Trigger Indicators

Look for:
- Recommendations without explaining why
- Solutions presented as obvious
- "You should" statements
- Assumed agreement with premise
- Missing "if" conditions

## Analysis Questions

1. What must be true for this advice to work?
2. What is the AI assuming about me/my situation?
3. What context is being assumed that might not apply?
4. What would change if these assumptions were wrong?
5. What constraints is the AI not asking about?

## Domain Weight Factors

Increase when:
- Response gives direct advice
- Makes recommendations
- Assumes particular situation
- Uses prescriptive language

Decrease when:
- Response asks clarifying questions
- Presents options without assumptions
- Acknowledges what it doesn't know
- Purely informational content

## Common Hidden Assumptions

- User has technical knowledge
- User has time/resources mentioned
- The problem is defined correctly
- The proposed solution fits the context
- User has authority to implement changes
- Long-term view is appropriate
- Same solution works for all cases
