import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { defineCommand } from 'citty';
import { SKILL_BODY, SKILL_DESCRIPTION, SKILL_NAME } from './skills/mcptap-skill.js';
import { highlighter, logger } from './utils/logger.js';
import { isNonInteractive, prompt } from './utils/prompt.js';

const AGENTS_MD_MARKER = '<!-- mcptap-skill -->';

type AgentTarget = {
  id: 'claude-code' | 'cursor' | 'agents-md';
  displayName: string;
  hint: string;
  detect: (cwd: string) => boolean;
  filePath: (cwd: string) => string;
  render: () => string;
  mergeMode: 'replace' | 'append-marker';
};

const TARGETS: AgentTarget[] = [
  {
    id: 'claude-code',
    displayName: 'Claude Code',
    hint: 'writes .claude/skills/mcptap.md',
    detect: (cwd) =>
      existsSync(join(cwd, '.claude')) ||
      existsSync(join(cwd, 'CLAUDE.md')),
    filePath: (cwd) => join(cwd, '.claude', 'skills', `${SKILL_NAME}.md`),
    render: () =>
      `---\nname: ${SKILL_NAME}\ndescription: ${SKILL_DESCRIPTION}\n---\n\n${SKILL_BODY}`,
    mergeMode: 'replace',
  },
  {
    id: 'cursor',
    displayName: 'Cursor',
    hint: 'writes .cursor/rules/mcptap.mdc',
    detect: (cwd) =>
      existsSync(join(cwd, '.cursor')) ||
      existsSync(join(cwd, '.cursorrules')),
    filePath: (cwd) => join(cwd, '.cursor', 'rules', `${SKILL_NAME}.mdc`),
    render: () =>
      `---\ndescription: ${SKILL_DESCRIPTION}\nglobs: **/*.ts,**/*.mjs,**/*.js\nalwaysApply: false\n---\n\n${SKILL_BODY}`,
    mergeMode: 'replace',
  },
  {
    id: 'agents-md',
    displayName: 'AGENTS.md (universal)',
    hint: 'appends a section to AGENTS.md (or creates it)',
    detect: () => true,
    filePath: (cwd) => join(cwd, 'AGENTS.md'),
    render: () =>
      `${AGENTS_MD_MARKER}\n\n${SKILL_BODY}\n\n<!-- /mcptap-skill -->`,
    mergeMode: 'append-marker',
  },
];

type InstallOptions = {
  yes?: boolean;
  dryRun?: boolean;
};

export const installCommand = defineCommand({
  meta: {
    name: 'install',
    description:
      'Install the mcptap skill into your coding agents (Claude Code, Cursor, AGENTS.md).',
  },
  args: {
    yes: {
      type: 'boolean',
      description: 'Skip prompts, install for every detected agent',
      default: false,
    },
    'dry-run': {
      type: 'boolean',
      description: 'Show what would be written without writing files',
      default: false,
    },
  },
  async run({ args }) {
    await runInstall({ yes: args.yes, dryRun: args['dry-run'] });
  },
});

export async function runInstall(opts: InstallOptions = {}): Promise<void> {
  const cwd = process.cwd();
  logger.break();
  logger.log(`  ${highlighter.bold('mcptap')} ${highlighter.dim('install')}`);
  logger.break();

  const detected = TARGETS.filter((t) => t.detect(cwd));
  if (detected.length === 0) {
    logger.error('  No coding agents detected in this directory.');
    logger.dim('    Looked for: .claude/, .cursor/, CLAUDE.md, .cursorrules');
    logger.dim('    Pass --yes to install AGENTS.md anyway.');
    logger.break();
    process.exit(2);
  }

  let chosen: AgentTarget[];
  if (opts.yes || isNonInteractive()) {
    chosen = detected;
  } else {
    const { selected } = await prompt({
      type: 'multiselect',
      name: 'selected',
      message: 'Install mcptap skill into which agents?',
      hint: 'Space to toggle, Enter to confirm',
      instructions: false,
      min: 1,
      choices: detected.map((t) => ({
        title: t.displayName,
        description: t.hint,
        value: t.id,
        selected: true,
      })),
    });
    const ids = new Set<string>((selected as string[]) ?? []);
    chosen = detected.filter((t) => ids.has(t.id));
    if (chosen.length === 0) {
      logger.dim('  Nothing selected. No changes written.');
      logger.break();
      return;
    }
  }

  for (const target of chosen) {
    const filePath = target.filePath(cwd);
    const relPath = relative(cwd, filePath);
    const exists = existsSync(filePath);
    const action = mergeAction(target, filePath, exists);

    if (opts.dryRun) {
      logger.log(`  ${highlighter.info('•')} ${action} ${highlighter.dim(relPath)} (dry run)`);
      continue;
    }

    mkdirSync(dirname(filePath), { recursive: true });
    if (target.mergeMode === 'append-marker' && exists) {
      const current = readFileSync(filePath, 'utf8');
      const next = upsertMarker(current, target.render());
      writeFileSync(filePath, next, 'utf8');
    } else {
      writeFileSync(filePath, target.render(), 'utf8');
    }
    logger.log(`  ${highlighter.success('✓')} ${action} ${highlighter.dim(relPath)}`);
  }

  logger.break();
  logger.log(
    `  ${highlighter.dim('→')} The agent will now use mcptap. Try: ${highlighter.bold('"test my MCP server"')}`,
  );
  logger.break();
}

function mergeAction(target: AgentTarget, filePath: string, exists: boolean): string {
  if (!exists) return 'create';
  if (target.mergeMode === 'append-marker') return 'update section in';
  return 'overwrite';
}

function upsertMarker(content: string, section: string): string {
  const startIdx = content.indexOf(AGENTS_MD_MARKER);
  if (startIdx === -1) {
    // First time: append a blank line + the section.
    const sep = content.endsWith('\n') ? '\n' : '\n\n';
    return `${content}${sep}${section}\n`;
  }
  // Replace the existing marker block.
  const endTag = '<!-- /mcptap-skill -->';
  const endIdx = content.indexOf(endTag, startIdx);
  if (endIdx === -1) {
    // Marker present but never closed — replace from marker to end of file.
    return `${content.slice(0, startIdx).trimEnd()}\n\n${section}\n`;
  }
  const before = content.slice(0, startIdx).trimEnd();
  const after = content.slice(endIdx + endTag.length).trimStart();
  const middle = after.length > 0 ? `\n\n${after}` : '\n';
  return `${before}\n\n${section}${middle}`;
}
