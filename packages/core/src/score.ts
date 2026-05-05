import { encode } from 'gpt-tokenizer';
import type { Tool } from './types.js';

// Tool-description quality scoring.
//
// Scores are deterministic and produced from heuristics — no LLM call.
// The intent: surface concrete, actionable issues that hurt LLM tool selection.
// Token counts are approximate (cl100k_base via gpt-tokenizer); they're a
// useful trend signal even when the production model uses a different tokenizer.

export const SCORE_SCHEMA_VERSION = 1 as const;

export type ScoreIssueCode =
  | 'NO_DESCRIPTION'
  | 'DESCRIPTION_TOO_SHORT'
  | 'DESCRIPTION_TOO_LONG'
  | 'VAGUE_OPENING'
  | 'UNDESCRIBED_ARGS'
  | 'NO_REQUIRED_FIELD'
  | 'OVERSIZED'
  | 'LARGE';

export type ScoreIssue = {
  code: ScoreIssueCode;
  penalty: number;
  message: string;
};

export type ToolScore = {
  name: string;
  score: number;
  tokens: number;
  issues: ScoreIssue[];
};

export type ScoreReport = {
  schema_version: typeof SCORE_SCHEMA_VERSION;
  slug: string;
  generated_at: string;
  tools: ToolScore[];
  summary: {
    average: number;
    total_tokens: number;
    tool_count: number;
  };
};

const VAGUE_OPENING_RE =
  /^(this tool|handles|manages|various|misc|something|stuff|do |does )/i;

export function scoreTools(tools: Tool[]): ToolScore[] {
  return tools.map(scoreTool);
}

export function buildScoreReport(slug: string, tools: Tool[]): ScoreReport {
  const scores = scoreTools(tools);
  const total = scores.reduce((s, t) => s + t.score, 0);
  const totalTokens = scores.reduce((s, t) => s + t.tokens, 0);
  const average = scores.length > 0 ? Math.round(total / scores.length) : 0;
  return {
    schema_version: SCORE_SCHEMA_VERSION,
    slug,
    generated_at: new Date().toISOString(),
    tools: scores,
    summary: {
      average,
      total_tokens: totalTokens,
      tool_count: scores.length,
    },
  };
}

function scoreTool(tool: Tool): ToolScore {
  const issues: ScoreIssue[] = [];
  let points = 100;

  const description = (tool.description ?? '').trim();

  // Description presence (worth 25)
  if (description.length === 0) {
    issues.push({
      code: 'NO_DESCRIPTION',
      penalty: 25,
      message: 'tool has no description',
    });
    points -= 25;
  } else {
    // Description length (15 max for too-short, 10 for too-long)
    if (description.length < 20) {
      issues.push({
        code: 'DESCRIPTION_TOO_SHORT',
        penalty: 15,
        message: `description is only ${description.length} chars (recommend 20–500)`,
      });
      points -= 15;
    } else if (description.length > 500) {
      issues.push({
        code: 'DESCRIPTION_TOO_LONG',
        penalty: 10,
        message: `description is ${description.length} chars (recommend 20–500)`,
      });
      points -= 10;
    }

    // Vague phrases (10)
    if (VAGUE_OPENING_RE.test(description)) {
      issues.push({
        code: 'VAGUE_OPENING',
        penalty: 10,
        message: 'description starts with vague phrasing',
      });
      points -= 10;
    }
  }

  // Argument descriptions (25 max, scaled by ratio of undescribed args)
  const inputSchema = (tool.inputSchema ?? {}) as {
    type?: string;
    properties?: Record<string, { description?: string }>;
    required?: string[];
  };
  const props = inputSchema.properties
    ? Object.entries(inputSchema.properties)
    : [];
  if (props.length > 0) {
    const undescribed = props.filter(
      ([, def]) => !def?.description || def.description.trim().length === 0,
    );
    if (undescribed.length > 0) {
      const penalty = Math.round((25 * undescribed.length) / props.length);
      const names = undescribed.map(([k]) => k).join(', ');
      issues.push({
        code: 'UNDESCRIBED_ARGS',
        penalty,
        message: `${undescribed.length} of ${props.length} args missing description: ${names}`,
      });
      points -= penalty;
    }

    // required[] declared (5)
    if (inputSchema.required === undefined) {
      issues.push({
        code: 'NO_REQUIRED_FIELD',
        penalty: 5,
        message: 'inputSchema.required[] is not declared (ambiguous which args are mandatory)',
      });
      points -= 5;
    }
  }

  // Token cost
  const tokens = countTokens(tool);
  if (tokens > 300) {
    issues.push({
      code: 'OVERSIZED',
      penalty: 15,
      message: `tool definition uses ~${tokens} tokens (recommend <300)`,
    });
    points -= 15;
  } else if (tokens > 200) {
    issues.push({
      code: 'LARGE',
      penalty: 5,
      message: `tool definition uses ~${tokens} tokens (recommend <200)`,
    });
    points -= 5;
  }

  return {
    name: tool.name,
    score: Math.max(0, points),
    tokens,
    issues,
  };
}

function countTokens(tool: Tool): number {
  const payload = JSON.stringify({
    name: tool.name,
    description: tool.description ?? '',
    inputSchema: tool.inputSchema ?? {},
  });
  return encode(payload).length;
}
