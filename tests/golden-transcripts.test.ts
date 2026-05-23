import assert from 'node:assert/strict';
import { generateResultArtifact } from '../src/lib/interview/buildArtifact';
import { processInterviewTurn } from '../src/lib/interview/controller';
import { runSpecGovernor } from '../src/lib/interview/governor/apply';
import { assessGovernorReadiness } from '../src/lib/interview/governor/readiness';
import { createEmptySpec, type BuildJob, type BuildSpec } from '../src/lib/interview/schema';
import type { LLMProvider } from '../src/lib/llm/provider';

function op(path: string, value: unknown, confidence = 0.9) {
  return { op: 'set', path, value, confidence };
}

function baseSpec() {
  return createEmptySpec();
}

function fakeProvider(patchOperations: ReturnType<typeof op>[]): LLMProvider {
  return {
    name: 'fake',
    async extractSpecUpdates() {
      return { operations: patchOperations, summary: 'fixture patch' };
    },
    async proposeNextQuestion() {
      throw new Error('Question model intentionally unavailable.');
    },
    async summarizeReadiness() {
      throw new Error('Summary model intentionally unavailable.');
    },
  };
}

async function run() {
  {
    const governed = runSpecGovernor(
      baseSpec(),
      {
        operations: [
          op('/buildType', 'client portal', 0.9),
          op('/primaryUser', 'detailing customers', 0.88),
          op('/mainGoal', 'let customers request services', 0.88),
          op('/outputType', 'Client portal/internal dashboard', 0.92),
        ],
        summary: 'messy fixture',
      },
      { source: 'model_inferred', sourceMessageId: 'msg_messy' },
    );

    assert.equal(governed.spec.buildType, 'client_portal');
    assert.equal(governed.spec.outputType, null);
    assert.ok(governed.decisions.some((decision) => decision.decision === 'rerouted'));
    assert.equal(governed.readiness.status, 'blocked');
    assert.match(governed.nextQuestion ?? '', /end|build prompt|implementation plan|prototype/i);
  }

  {
    const spec = baseSpec();
    spec.outputType = 'prototype';
    spec.fieldMetadata = {
      '/outputType': {
        source: 'user_confirmed',
        confidence: 1,
        evidence: ['User confirmed prototype.'],
        sourceMessageId: 'msg_confirm',
        updatedAt: new Date().toISOString(),
      },
    };
    const governed = runSpecGovernor(
      spec,
      { operations: [op('/outputType', 'code_files', 0.95)], summary: 'contradiction fixture' },
      { source: 'model_inferred', sourceMessageId: 'msg_contra' },
    );

    assert.equal(governed.spec.outputType, 'prototype');
    assert.equal(governed.conflicts.length, 1);
    assert.equal(governed.decisions[0].decision, 'needs_confirmation');
    assert.equal(governed.readiness.status, 'blocked');
  }

  {
    const response = await processInterviewTurn({
      sessionId: 'spec_fixture',
      message: 'whatever (((( bad json equivalent',
      currentSpec: baseSpec(),
      recentMessages: [],
      provider: {
        ...fakeProvider([]),
        async extractSpecUpdates() {
          throw new Error('Invalid JSON from provider.');
        },
      },
    });

    assert.equal(response.provider, 'fake');
    assert.match(response.assistantMessage.content, /What kind|What should Clarify produce|Who will use|main outcome/i);
    assert.equal(response.updatedSpec.buildType, 'unknown');
    assert.match(response.specPatch.summary, /not usable/i);
  }

  {
    const spec = baseSpec();
    spec.buildType = 'automation';
    spec.primaryUser = 'ops team';
    spec.mainGoal = 'clean incoming lead records';
    spec.outputType = 'implementation_plan';
    spec.integrations = [];
    const readiness = assessGovernorReadiness(spec);

    assert.ok(['ready', 'ready_with_assumptions', 'needs_interview', 'blocked'].includes(readiness.status));
    assert.equal(readiness.recommendedOutput, 'implementation_plan');
    assert.ok(Array.isArray(readiness.hardBlockers));
  }

  {
    const spec = baseSpec();
    spec.buildType = 'internal_tool';
    // @ts-expect-error deliberate bad fixture proves build package should not depend on raw chat.
    spec.buildType = 'business_system';
    spec.primaryUser = 'support team';
    spec.mainGoal = 'triage refund requests';
    spec.outputType = 'build_prompt';
    spec.dataToTrack = ['Refund requests', 'Customers', 'Resolution status'];
    spec.assumptionLedger = [
      {
        id: 'assumption_test',
        statement: 'Refund approvals are manual in the MVP.',
        basis: 'No payment provider is confirmed.',
        risk: 'medium',
        affectsBuild: ['/integrations', '/workflow'],
        askBeforeBuild: false,
        createdAt: new Date().toISOString(),
      },
    ];
    const job: BuildJob = {
      id: 'job_test',
      specId: spec.id,
      status: 'complete',
      activeStep: 0,
      steps: [],
      artifactId: null,
      error: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const artifact = generateResultArtifact(spec as BuildSpec, job);

    assert.match(artifact.content, /Plain-English Summary/);
    assert.match(artifact.content, /Data Model/);
    assert.match(artifact.content, /One-Shot Build Prompt/);
    assert.match(artifact.content, /Refund approvals are manual/);
    assert.doesNotMatch(artifact.content, /raw chat/i);
  }
}

run()
  .then(() => {
    console.log('Golden transcript governor tests passed.');
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
