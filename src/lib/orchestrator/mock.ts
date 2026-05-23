import { createInitialSpec, saasMvpQuestions } from '../templates/saas-mvp';
import { computeReadiness } from '../session';
import {
  BuildPackageSchema,
  ClarifySessionSchema,
  type BuildPackage,
  type ClarifySession,
  type JSONPatch,
  type Question,
} from '../schemas';
import { makeId, titleFromPrompt } from '../utils';

export function createInitialSession(initialPrompt: string): ClarifySession {
  const spec = createInitialSpec(initialPrompt);
  const session: ClarifySession = {
    id: makeId('session'),
    initialPrompt,
    projectName: titleFromPrompt(initialPrompt),
    questions: saasMvpQuestions,
    currentQuestionId: saasMvpQuestions[0]?.id ?? null,
    answeredQuestionIds: [],
    answers: [],
    spec,
    previewPatch: null,
    readiness: {
      score: 0,
      answeredWeight: 0,
      totalWeight: saasMvpQuestions.reduce((sum, question) => sum + question.readinessWeight, 0),
      missingHighImpact: saasMvpQuestions.filter(
        (question) => question.importance === 'critical' || question.importance === 'high',
      ),
    },
    undoStack: [],
    lastImpact: null,
    reviewOpen: false,
    buildPackage: null,
  };

  return ClarifySessionSchema.parse({
    ...session,
    readiness: computeReadiness(session),
  });
}

export async function getNextQuestion(session: ClarifySession): Promise<Question | null> {
  return (
    session.questions.find((question) => !session.answeredQuestionIds.includes(question.id)) ??
    Promise.resolve(null)
  );
}

export async function canonicalizeCustomAnswer(
  question: Question,
  text: string,
): Promise<{ canonicalText: string; specPatch: JSONPatch[] }> {
  const trimmed = text.trim();
  const readable = trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
  const baseId = `custom_${question.id}`;

  return {
    canonicalText: `We read this as: ${readable}`,
    specPatch: [
      {
        op: 'add',
        path: '/openQuestions/-',
        value: {
          id: `${baseId}_open`,
          text: `${question.title} Custom answer: ${readable}`,
          confidence: 'custom',
          sourceQuestionId: question.id,
          tags: ['scope', 'risk'],
        },
      },
      {
        op: 'add',
        path: '/risks/-',
        value: {
          id: `${baseId}_risk`,
          text: 'Custom answer needs canonical product interpretation before implementation',
          confidence: 'custom',
          sourceQuestionId: question.id,
          tags: ['risk'],
        },
      },
    ],
  };
}

function listLines(lines: { text: string; confidence: string }[]) {
  if (!lines.length) return '- None specified';
  return lines.map((line) => `- ${line.text} (${line.confidence})`).join('\n');
}

export async function generateBuildPackage(session: ClarifySession): Promise<BuildPackage> {
  const { spec } = session;
  const markdown = `# Codex handoff: ${spec.projectName}

## Product direction
${spec.oneLiner}

## Users
${listLines(spec.users)}

## Core features
${listLines(spec.features)}

## Data model
${listLines(spec.dataModel)}

## Architecture
- Auth: ${spec.architecture.auth} (${spec.architecture.confidence.auth})
- Realtime: ${spec.architecture.realtime ? 'yes' : 'no'} (${spec.architecture.confidence.realtime})
- Offline: ${spec.architecture.offline ? 'yes' : 'no'} (${spec.architecture.confidence.offline})
- Payments: ${spec.architecture.payments} (${spec.architecture.confidence.payments})
- Deployment: ${spec.architecture.deployment} (${spec.architecture.confidence.deployment})

## Integrations
${listLines(spec.integrations)}

## Out of scope
${listLines(spec.outOfScope)}

## Risks and revisit
${listLines([...spec.risks, ...spec.openQuestions])}

## Build instruction
Build the v1 prototype from this contract. Keep scope constrained to the locked/default decisions. Flag every custom or assumed line before implementing it.`;

  return BuildPackageSchema.parse({
    id: makeId('package'),
    sessionId: session.id,
    markdown,
    spec,
    generatedAt: new Date().toISOString(),
  });
}

