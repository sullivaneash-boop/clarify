import {
  BuildPackageSchema,
  ClarifySessionSchema,
  type BuildPackage,
  type BuildReadiness,
  type ClarifySession,
  type Confidence,
  type JSONPatch,
  type Question,
  type SessionSnapshot,
  type UserAnswer,
} from './schemas';
import { applySpecPatch, humanizePatch, validateSpecPatch, withPatchConfidence } from './patch';
import { makeId } from './utils';

export type SessionAction =
  | { type: 'INIT_SESSION'; session: ClarifySession }
  | { type: 'ADD_QUESTION'; question: Question }
  | { type: 'ANSWER_QUESTION'; questionId: string; optionId: string }
  | { type: 'USE_DEFAULT'; questionId: string }
  | { type: 'SUBMIT_CUSTOM'; questionId: string; rawText: string; canonicalText: string; specPatch: JSONPatch[] }
  | { type: 'REVISE_ANSWER'; questionId: string }
  | { type: 'SET_PREVIEW_PATCH'; patch: JSONPatch[] }
  | { type: 'CLEAR_PREVIEW_PATCH' }
  | { type: 'COMPUTE_READINESS' }
  | { type: 'OPEN_REVIEW'; open: boolean }
  | { type: 'GENERATE_PACKAGE'; buildPackage: BuildPackage }
  | { type: 'UNDO' }
  | { type: 'RESET_SESSION'; session: ClarifySession };

function snapshot(session: ClarifySession): SessionSnapshot {
  return {
    spec: session.spec,
    answers: session.answers,
    answeredQuestionIds: session.answeredQuestionIds,
    currentQuestionId: session.currentQuestionId,
    readiness: session.readiness,
  };
}

const readinessRequirements = [
  'buildType',
  'primaryUser',
  'mainThingTrackedOrGoal',
  'firstVersionScope',
  'desiredOutput',
] as const;

function hasValue(value: string | null | undefined) {
  return Boolean(value && value.trim().length > 0);
}

export function missingReadinessRequirements(spec: ClarifySession['spec']) {
  const missing: string[] = [];
  if (spec.buildType === 'unknown') missing.push('Build type');
  if (!hasValue(spec.primaryUser) || spec.primaryUser === 'Not sure yet') missing.push('Primary user');
  if ((!hasValue(spec.mainThingTracked) || spec.mainThingTracked === 'Something else') && !hasValue(spec.mainGoal)) {
    missing.push('Main thing tracked or core goal');
  }
  if (!hasValue(spec.firstVersionScope) || spec.firstVersionScope === 'Not sure yet') missing.push('First version scope');
  if (!spec.desiredOutput) missing.push('Desired output');
  return missing;
}

export function computeReadiness(session: Pick<ClarifySession, 'spec' | 'questions' | 'answeredQuestionIds'>): BuildReadiness {
  const missingRequirements = missingReadinessRequirements(session.spec);
  const decisionsRemaining = missingRequirements.length;
  const ready = decisionsRemaining === 0;
  return {
    ready,
    statusText: ready
      ? 'Ready to review'
      : decisionsRemaining === readinessRequirements.length
        ? 'Not ready yet'
        : `Need ${decisionsRemaining} more decision${decisionsRemaining === 1 ? '' : 's'}`,
    decisionsRemaining,
    missingRequirements,
  };
}

export function getCurrentQuestion(session: ClarifySession) {
  if (!session.currentQuestionId) return null;
  return session.questions.find((question) => question.id === session.currentQuestionId) ?? null;
}

export function getNextQuestionId(session: ClarifySession, answeredQuestionIds = session.answeredQuestionIds) {
  return session.questions.find((question) => !answeredQuestionIds.includes(question.id))?.id ?? null;
}

function capUndoStack(stack: SessionSnapshot[]) {
  return stack.slice(-50);
}

function commitAnswer(
  session: ClarifySession,
  questionId: string,
  label: string,
  patch: JSONPatch[],
  mode: UserAnswer['mode'],
  confidence: Confidence,
  optionId?: string,
  rawText?: string,
  canonicalText?: string,
) {
  const question = session.questions.find((candidate) => candidate.id === questionId);
  if (!question) throw new Error(`Question not found: ${questionId}`);

  const confidentPatch = withPatchConfidence(patch, confidence);
  const dryRun = validateSpecPatch(session.spec, confidentPatch);
  if (!dryRun.ok) throw new Error(dryRun.error);

  const nextSpec = applySpecPatch(session.spec, confidentPatch);
  const answer: UserAnswer = {
    id: makeId('answer'),
    questionId,
    mode,
    optionId,
    label,
    rawText,
    canonicalText,
    confidence,
    specPatch: confidentPatch,
    createdAt: new Date().toISOString(),
  };
  const answeredQuestionIds = Array.from(new Set([...session.answeredQuestionIds, questionId]));
  const partialSession = {
    ...session,
    answeredQuestionIds,
  };
  const nextReadiness = computeReadiness({
    ...session,
    spec: nextSpec,
    answeredQuestionIds,
  });
  const nextSession: ClarifySession = {
    ...session,
    spec: nextSpec,
    answers: [...session.answers.filter((existing) => existing.questionId !== questionId), answer],
    answeredQuestionIds,
    currentQuestionId: getNextQuestionId(partialSession),
    previewPatch: null,
    readiness: nextReadiness,
    phase: nextReadiness.ready
      ? 'confirm'
      : questionId === session.questions[0]?.id
        ? 'interview'
        : session.phase === 'clarify_category'
          ? 'interview'
          : 'interview',
    undoStack: capUndoStack([...session.undoStack, snapshot(session)]),
    lastImpact: {
      id: makeId('impact'),
      questionId,
      answerId: answer.id,
      patch: confidentPatch,
      humanized: humanizePatch(confidentPatch),
      createdAt: answer.createdAt,
    },
  };

  return ClarifySessionSchema.parse(nextSession);
}

export function sessionReducer(session: ClarifySession, action: SessionAction): ClarifySession {
  switch (action.type) {
    case 'INIT_SESSION':
      return ClarifySessionSchema.parse(action.session);

    case 'ADD_QUESTION': {
      const questions = [...session.questions, action.question];
      const next = {
        ...session,
        questions,
        currentQuestionId: session.currentQuestionId ?? action.question.id,
        readiness: computeReadiness({ ...session, questions, answeredQuestionIds: session.answeredQuestionIds }),
      };
      return ClarifySessionSchema.parse(next);
    }

    case 'ANSWER_QUESTION': {
      const question = session.questions.find((candidate) => candidate.id === action.questionId);
      const selected = question?.options.find((option) => option.id === action.optionId);
      if (!question || !selected) throw new Error('Selected option is no longer available.');
      if (selected.disabledReason) throw new Error(selected.disabledReason);

      return commitAnswer(
        session,
        action.questionId,
        selected.label,
        selected.specPatch,
        'option',
        'locked',
        selected.id,
      );
    }

    case 'USE_DEFAULT': {
      const question = session.questions.find((candidate) => candidate.id === action.questionId);
      const selected = question?.options.find((option) => option.id === question.recommendedOptionId);
      if (!question || !selected) throw new Error('Smart default is no longer available.');

      return commitAnswer(
        session,
        action.questionId,
        selected.label,
        selected.specPatch,
        'default',
        'default',
        selected.id,
      );
    }

    case 'SUBMIT_CUSTOM':
      return commitAnswer(
        session,
        action.questionId,
        action.canonicalText,
        action.specPatch,
        'custom',
        'custom',
        undefined,
        action.rawText,
        action.canonicalText,
      );

    case 'REVISE_ANSWER': {
      const answerIndex = session.answers.findIndex((answer) => answer.questionId === action.questionId);
      const previous = answerIndex >= 0 ? session.undoStack[answerIndex] : null;

      if (!previous) {
        return {
          ...session,
          currentQuestionId: action.questionId,
          previewPatch: null,
        };
      }

      return ClarifySessionSchema.parse({
        ...session,
        spec: previous.spec,
        answers: previous.answers,
        answeredQuestionIds: previous.answeredQuestionIds,
        readiness: previous.readiness,
        currentQuestionId: action.questionId,
        previewPatch: null,
        lastImpact: null,
        undoStack: session.undoStack.slice(0, answerIndex),
      });
    }

    case 'SET_PREVIEW_PATCH':
      return {
        ...session,
        previewPatch: action.patch,
      };

    case 'CLEAR_PREVIEW_PATCH':
      return {
        ...session,
        previewPatch: null,
      };

    case 'COMPUTE_READINESS':
      return {
        ...session,
        readiness: computeReadiness(session),
      };

    case 'OPEN_REVIEW':
      return {
        ...session,
        reviewOpen: action.open,
        phase: action.open ? 'confirm' : session.phase,
      };

    case 'GENERATE_PACKAGE':
      return {
        ...session,
        reviewOpen: true,
        phase: 'result',
        buildPackage: BuildPackageSchema.parse(action.buildPackage),
      };

    case 'UNDO': {
      const previous = session.undoStack[session.undoStack.length - 1];
      if (!previous) return session;
      return ClarifySessionSchema.parse({
        ...session,
        spec: previous.spec,
        answers: previous.answers,
        answeredQuestionIds: previous.answeredQuestionIds,
        currentQuestionId: previous.currentQuestionId,
        readiness: previous.readiness,
        previewPatch: null,
        lastImpact: null,
        undoStack: session.undoStack.slice(0, -1),
      });
    }

    case 'RESET_SESSION':
      return ClarifySessionSchema.parse(action.session);

    default:
      return session;
  }
}

export function isBuildReady(session: ClarifySession) {
  return session.readiness.ready;
}
