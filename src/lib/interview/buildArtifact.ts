import { createId } from '../utils/ids';
import { toTitle } from '../utils/format';
import type { BuildJob, BuildSpec, ResultArtifact, ResultFile } from './schema';

function list(items: string[], fallback: string) {
  if (items.length === 0) return `- ${fallback}`;
  return items.map((item) => `- ${item}`).join('\n');
}

function assumptionList(spec: BuildSpec) {
  const ledger = spec.assumptionLedger ?? [];
  if (ledger.length === 0) return list(spec.assumptions, 'No extra assumptions beyond the locked spec.');
  return ledger
    .map(
      (assumption) =>
        `- ${assumption.statement} Basis: ${assumption.basis}. Risk: ${assumption.risk}. Affects: ${
          assumption.affectsBuild.length > 0 ? assumption.affectsBuild.join(', ') : 'general scope'
        }.`,
    )
    .join('\n');
}

function inline(items: string[], fallback: string) {
  return items.length > 0 ? items.join(', ') : fallback;
}

function sentenceFragment(value: string | null | undefined, fallback: string) {
  const source = (value ?? fallback).trim().replace(/[.!?]+$/, '');
  return source.charAt(0).toLowerCase() + source.slice(1);
}

function recommendedStack(spec: BuildSpec) {
  if (spec.buildType === 'spreadsheet') return 'Spreadsheet model first, with a React prototype only if needed later.';
  if (spec.buildType === 'automation') return 'React control surface plus a future workflow runner adapter.';
  return 'Vite, React, TypeScript, Tailwind CSS, Zustand, and Zod.';
}

function titleFor(spec: BuildSpec) {
  if (spec.projectName) return `${spec.projectName} build package`;
  if (spec.businessType) return `${spec.businessType} ${toTitle(spec.buildType)} package`;
  return `${toTitle(spec.buildType)} build package`;
}

function tradeoffs(spec: BuildSpec) {
  const readiness = spec.governorReadiness;
  const lines = [
    `- Output recommendation: ${readiness?.recommendedOutput ?? spec.outputType ?? 'not selected yet'}.`,
    `- Readiness status: ${readiness?.status ?? (spec.readiness.requiredFieldsComplete ? 'ready' : 'needs_interview')}.`,
  ];
  if (readiness?.softGaps.length) lines.push(...readiness.softGaps.map((gap) => `- Soft gap: ${gap}`));
  if (readiness?.hardBlockers.length) lines.push(...readiness.hardBlockers.map((blocker) => `- Blocker: ${blocker}`));
  return lines.join('\n');
}

function virtualSchema(spec: BuildSpec) {
  const entityNames = spec.dataToTrack.length > 0 ? spec.dataToTrack : ['Item'];
  return `import { z } from 'zod';

export const buildSpecSchema = z.object({
  buildType: z.literal('${spec.buildType}'),
  primaryUser: z.string(),
  mainGoal: z.string(),
  features: z.array(z.string()),
  constraints: z.array(z.string()),
});

export const trackedEntities = ${JSON.stringify(entityNames, null, 2)} as const;
`;
}

export function generateResultArtifact(spec: BuildSpec, buildJob: BuildJob, iterationNote?: string): ResultArtifact {
  const title = titleFor(spec);
  const overview = `# ${title}

## Plain-English Summary
Build a ${toTitle(spec.buildType).toLowerCase()} for ${spec.primaryUser ?? 'the primary user'} that helps them ${sentenceFragment(spec.mainGoal, 'complete the main job')}.

## Project Summary
Build a ${toTitle(spec.buildType).toLowerCase()} for ${spec.primaryUser ?? 'the primary user'} that helps them ${sentenceFragment(spec.mainGoal, 'complete the main job')}.

## User Goal
${spec.mainGoal ?? 'TBD'}

## Target Users
${spec.primaryUser ?? 'TBD'}

## MVP Scope
Ship the smallest useful version as a local-first, testable product surface. The first version should focus on ${inline(
    spec.coreFeatures,
    'the core workflow confirmed during the interview',
  )}.

## Core Workflows
${list(spec.coreFeatures, 'Define the first core workflow before building.')}

## Data Model
${list(spec.dataToTrack, 'Start with a local spec object and add entities after data needs are confirmed.')}

## Auth And Roles
${list(spec.userRoles, 'Single unauthenticated local user for the prototype.')}

## Integrations
${list(spec.integrations, 'None required for the local prototype.')}

## Must-Not-Do List
${list(spec.mustNotDo, 'Anything that requires paid services, real auth, billing, API keys, or production data.')}

## Assumptions
${assumptionList(spec)}

## Tradeoffs
${tradeoffs(spec)}

## Next Steps
- Wire the local interview engine to a server-side LLM adapter when ready.
- Persist specs and build jobs to a database after the local flow is validated.
- Add real auth, billing, and integrations only after the first workflow is proven.
${iterationNote ? `\n## Latest Iteration\n- ${iterationNote}` : ''}`;

  const buildPrompt = `# One-Shot Build Prompt

You are building ${title}. Use ${recommendedStack(spec)}

## Product Intent
- Build type: ${toTitle(spec.buildType)}
- Primary user: ${spec.primaryUser ?? 'TBD'}
- Main goal: ${spec.mainGoal ?? 'TBD'}
- Output expected: ${spec.outputType ? toTitle(spec.outputType) : 'TBD'}

## First Version Scope
${list(spec.coreFeatures, 'Define the smallest useful core workflow before building.')}

## Core Workflows
${list(spec.coreFeatures, 'Confirm the workflow before adding secondary features.')}

## Data To Track
${list(spec.dataToTrack, 'Avoid persistent production data until the model is confirmed.')}

## Roles
${list(spec.userRoles, 'Single unauthenticated local user for the prototype.')}

## Integrations
${list(spec.integrations, 'None required for the local prototype.')}

## Design Direction
${list(spec.designPreferences, 'Precise, serious, usable interface with no generic AI gloss.')}

## Constraints
${list(spec.technicalConstraints, 'Run locally without secrets.')}

## Do Not
${list(spec.mustNotDo, 'Do not hardcode secrets. Do not require paid services.')}

## File Structure
- src/app/App.tsx
- src/components/
- src/lib/
- src/stores/
- README_LOCAL.md
- USER_ACTION_REQUIRED.md

## Acceptance Criteria
- The app runs locally without API keys, billing, Supabase, or OAuth.
- Core user actions are interactive, not static mockups.
- State survives refresh where appropriate.
- Empty, loading, error, and iteration states are handled.
- Write USER_ACTION_REQUIRED.md for blockers, missing secrets, paid services, and deployment needs.
`;

  const plan = `# Implementation Plan

## User Stories
- As ${spec.primaryUser ?? 'a user'}, I can understand what this product does and take the first important action.
- As the owner, I can see the data and decisions that shape the build.
- As a future developer, I can wire real services without rewriting the UI flow.

## Data Model
${list(spec.dataToTrack, 'Start with a local spec object and add entities after data needs are confirmed.')}

## UI Sections
- Primary workflow surface for ${spec.primaryUser ?? 'the user'}
- Admin/spec review surface
- Empty states and validation states
- Result or completion state

## Implementation Phases
- Phase 1: Local state, schema, and deterministic workflow.
- Phase 2: Real persistence and server-side adapters.
- Phase 3: Auth, billing, integrations, and deployment hardening.

## Edge Cases
- User changes audience after scope is drafted.
- User requests login after previously excluding it.
- User asks for a spreadsheet instead of a product UI.
- Required paid integration is unavailable locally.

## Assumptions And Tradeoffs
${assumptionList(spec)}

${tradeoffs(spec)}

## Future Version Ideas
- Add real persistence after the local workflow is accepted.
- Add authenticated ownership only when user roles are confirmed.
- Add integrations after failure behavior and recovery paths are specified.

## Testing Checklist
- Start the flow from an empty state.
- Refresh mid-flow and confirm local state persists.
- Exercise the main action and validation errors.
- Submit iteration feedback and confirm the package updates.
- Confirm no secrets are required to run locally.
`;

  const files: ResultFile[] = [
    {
      path: 'DESIGN.md',
      language: 'markdown',
      content: `# Design Direction\n\n${list(spec.designPreferences, 'Use a restrained, readable product interface.')}\n`,
    },
    {
      path: 'IMPLEMENTATION_PLAN.md',
      language: 'markdown',
      content: plan,
    },
    {
      path: 'BUILD_PROMPT.md',
      language: 'markdown',
      content: buildPrompt,
    },
    {
      path: 'USER_ACTION_REQUIRED.md',
      language: 'markdown',
      content:
        '# User Action Required\n\nNo user action is required for the local prototype. Future production wiring may need API keys, auth credentials, billing setup, database configuration, and deployment settings.\n',
    },
    {
      path: 'schema.ts',
      language: 'typescript',
      content: virtualSchema(spec),
    },
    {
      path: 'README_LOCAL.md',
      language: 'markdown',
      content: '# Local README\n\nRun locally, test the main workflow, then wire backend services later.\n',
    },
  ];

  const specJson = JSON.stringify(spec, null, 2);

  return {
    id: createId('artifact'),
    specId: spec.id,
    buildJobId: buildJob.id,
    title,
    type: 'prompt_pack',
    content: [overview, buildPrompt, plan].join('\n\n---\n\n'),
    sections: {
      overview,
      buildPrompt,
      plan,
      specJson,
    },
    files,
    createdAt: new Date().toISOString(),
  };
}
