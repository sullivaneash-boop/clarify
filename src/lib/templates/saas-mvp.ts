import type { BuildCategory, DecisionOption, JSONPatch, Question, SpecDoc, SpecLine } from '../schemas';
import { titleFromPrompt } from '../utils';

function line(id: string, text: string, sourceQuestionId: string, tags: SpecLine['tags']): SpecLine {
  return {
    id,
    text,
    confidence: 'locked',
    sourceQuestionId,
    tags,
  };
}

function option(
  id: string,
  label: string,
  consequence: string,
  impactTags: DecisionOption['impactTags'],
  scopeWeight: number,
  specPatch: JSONPatch[],
): DecisionOption {
  return {
    id,
    label,
    consequence,
    impactTags,
    scopeWeight,
    specPatch,
  };
}

export function classifyBuildCategory(prompt: string): BuildCategory {
  const normalized = prompt.toLowerCase();

  if (normalized.includes('dashboard') || normalized.includes('internal') || normalized.includes('admin')) {
    return 'internal_dashboard';
  }
  if (normalized.includes('client portal') || normalized.includes('customer portal') || normalized.includes('portal')) {
    return 'client_portal';
  }
  if (normalized.includes('landing') || normalized.includes('marketing page') || normalized.includes('homepage')) {
    return 'landing_page';
  }
  if (normalized.includes('automation') || normalized.includes('workflow') || normalized.includes('zap')) {
    return 'automation';
  }
  if (normalized.includes('spreadsheet') || normalized.includes('sheet') || normalized.includes('excel')) {
    return 'spreadsheet_tool';
  }
  if (normalized.includes('saas') || normalized.includes('mvp') || normalized.includes('app')) {
    return 'saas_mvp';
  }
  return 'unknown';
}

function labelBuildType(buildType: BuildCategory) {
  return buildType.replace(/_/g, ' ');
}

export function createInitialSpec(initialPrompt: string, buildType: BuildCategory): SpecDoc {
  const projectName = titleFromPrompt(initialPrompt);

  return {
    projectName,
    oneLiner: initialPrompt.trim(),
    buildType,
    primaryUser: null,
    mainThingTracked: null,
    mainGoal: null,
    firstVersionScope: null,
    desiredOutput: null,
    users: [],
    features: [],
    dataModel: [],
    architecture: {
      auth: 'tbd',
      realtime: false,
      offline: false,
      payments: 'tbd',
      deployment: 'tbd',
      confidence: {
        auth: 'assumed',
        realtime: 'assumed',
        offline: 'assumed',
        payments: 'assumed',
        deployment: 'assumed',
      },
    },
    integrations: [],
    outOfScope: [],
    risks: [],
    openQuestions: [
      line(
        'open_initial_scope',
        `Need the first version shape for this ${labelBuildType(buildType)} before technical decisions.`,
        'initial',
        ['scope', 'risk'],
      ),
    ],
  };
}

const q1 = 'q_primary_user';
const q2 = 'q_main_thing';
const q3 = 'q_first_version_scope';
const q4 = 'q_desired_output';

function primaryUserQuestionForCategory(buildType: BuildCategory): Question {
  const isInternalDashboard = buildType === 'internal_dashboard';
  const title = isInternalDashboard
    ? 'Internal dashboard can mean a few different things. First, who is this dashboard for?'
    : `${labelBuildType(buildType)} can mean a few different things. Who is this for first?`;
  const whyItMatters = isInternalDashboard
    ? 'This changes whether we need accounts, roles, permissions, or just a simple private admin screen.'
    : 'This changes account model, permissions, navigation, and how much build complexity is needed on day one.';

  return {
    id: q1,
    type: 'fork',
    responseMode: 'options-or-custom',
    title,
    whyItMatters,
    importance: 'high',
    readinessWeight: 30,
    recommendedOptionId: 'user_internal_team',
    smartDefaultRationale: 'If unsure, start with your internal team to keep the first version constrained.',
    options: [
      option('user_just_me', 'Just me', 'Single-owner admin experience. Fastest path, minimal permissions.', ['auth', 'scope'], 2, [
        { op: 'replace', path: '/primaryUser', value: 'Just me' },
        {
          op: 'add',
          path: '/users/-',
          value: line('user_owner', 'Single owner/operator', q1, ['auth']),
        },
        { op: 'replace', path: '/architecture/auth', value: 'single-user' },
      ]),
      option(
        'user_internal_team',
        'My internal team',
        'Shared workspace with team roles and private internal access.',
        ['auth', 'ux'],
        4,
        [
          { op: 'replace', path: '/primaryUser', value: 'My internal team' },
          {
            op: 'add',
            path: '/users/-',
            value: line('user_internal_team', 'Internal team members', q1, ['auth', 'ux']),
          },
          { op: 'replace', path: '/architecture/auth', value: 'magic-link' },
        ],
      ),
      option(
        'user_clients',
        'Clients/customers',
        'Customer-facing accounts and onboarding become part of v1.',
        ['auth', 'ux'],
        6,
        [
          { op: 'replace', path: '/primaryUser', value: 'Clients/customers' },
          {
            op: 'add',
            path: '/users/-',
            value: line('user_customers', 'Client/customer users', q1, ['auth', 'ux']),
          },
          { op: 'replace', path: '/architecture/auth', value: 'magic-link' },
        ],
      ),
      option(
        'user_both',
        'Both team and clients',
        'Two-sided workspace with roles and boundaries between internal and external views.',
        ['auth', 'architecture', 'risk'],
        8,
        [
          { op: 'replace', path: '/primaryUser', value: 'Both team and clients' },
          {
            op: 'add',
            path: '/users/-',
            value: line('user_internal_external', 'Internal team and external client users', q1, ['auth', 'ux']),
          },
          {
            op: 'add',
            path: '/risks/-',
            value: line('risk_roles_permissions', 'Need clear roles and permission boundaries before build.', q1, [
              'auth',
              'risk',
            ]),
          },
          { op: 'replace', path: '/architecture/auth', value: 'magic-link' },
        ],
      ),
      option(
        'user_not_sure',
        'Not sure yet',
        'We can keep moving, but we must lock this before confirming the build plan.',
        ['risk', 'scope'],
        5,
        [
          { op: 'replace', path: '/primaryUser', value: 'Not sure yet' },
          {
            op: 'add',
            path: '/openQuestions/-',
            value: line('open_primary_user', 'Need to confirm who this is for before final build review.', q1, ['risk']),
          },
        ],
      ),
    ],
  };
}

function mainThingQuestionForCategory(buildType: BuildCategory): Question {
  if (buildType === 'internal_dashboard') {
    return {
      id: q2,
      type: 'fork',
      responseMode: 'options-or-custom',
      title: 'What is the main thing this dashboard needs to track?',
      whyItMatters: 'This decides the core data model, workflow, and first set of screens.',
      importance: 'high',
      readinessWeight: 25,
      recommendedOptionId: 'track_projects',
      smartDefaultRationale: 'If unsure, choose the entity that your team updates most often.',
      options: [
        option('track_clients', 'Clients', 'A client-centric dashboard with account and relationship context.', ['data-model'], 4, [
          { op: 'replace', path: '/mainThingTracked', value: 'Clients' },
          {
            op: 'add',
            path: '/dataModel/-',
            value: line('data_clients', 'Client records, status, and ownership', q2, ['data-model']),
          },
        ]),
        option('track_projects', 'Projects', 'Project-centric workflow with milestones, owners, and status.', ['data-model', 'ux'], 5, [
          { op: 'replace', path: '/mainThingTracked', value: 'Projects' },
          {
            op: 'add',
            path: '/dataModel/-',
            value: line('data_projects', 'Projects with milestones, owner, and status', q2, ['data-model']),
          },
        ]),
        option('track_jobs', 'Jobs/orders', 'Operational workflow focused on throughput and fulfillment.', ['data-model'], 5, [
          { op: 'replace', path: '/mainThingTracked', value: 'Jobs/orders' },
          {
            op: 'add',
            path: '/dataModel/-',
            value: line('data_jobs', 'Jobs/orders with lifecycle states', q2, ['data-model']),
          },
        ]),
        option('track_requests', 'Requests', 'Intake and triage flow with status and assignment.', ['data-model', 'ux'], 4, [
          { op: 'replace', path: '/mainThingTracked', value: 'Requests' },
          {
            op: 'add',
            path: '/dataModel/-',
            value: line('data_requests', 'Requests with status, priority, and assignee', q2, ['data-model']),
          },
        ]),
        option('track_leads', 'Leads', 'Pipeline-focused dashboard for qualification and follow-up.', ['data-model'], 4, [
          { op: 'replace', path: '/mainThingTracked', value: 'Leads' },
          {
            op: 'add',
            path: '/dataModel/-',
            value: line('data_leads', 'Leads with stage, source, and owner', q2, ['data-model']),
          },
        ]),
        option(
          'track_payments',
          'Payments/invoices',
          'Financial workflow focused on invoice status and collection.',
          ['billing', 'data-model'],
          6,
          [
            { op: 'replace', path: '/mainThingTracked', value: 'Payments/invoices' },
            {
              op: 'add',
              path: '/dataModel/-',
              value: line('data_payments', 'Invoices and payment status', q2, ['data-model', 'billing']),
            },
          ],
        ),
        option('track_inventory', 'Inventory', 'Stock and movement tracking with quantity visibility.', ['data-model'], 5, [
          { op: 'replace', path: '/mainThingTracked', value: 'Inventory' },
          {
            op: 'add',
            path: '/dataModel/-',
            value: line('data_inventory', 'Inventory items, counts, and movement events', q2, ['data-model']),
          },
        ]),
        option(
          'track_other',
          'Something else',
          'We can continue with a custom model, but we should name the main entity explicitly.',
          ['risk', 'scope'],
          5,
          [
            { op: 'replace', path: '/mainThingTracked', value: 'Something else' },
            {
              op: 'add',
              path: '/openQuestions/-',
              value: line('open_main_entity', 'Need a clear name for the main thing this dashboard tracks.', q2, [
                'risk',
                'scope',
              ]),
            },
          ],
        ),
      ],
    };
  }

  return {
    id: q2,
    type: 'fork',
    responseMode: 'options-or-custom',
    title: 'What is the main thing this first version needs to accomplish?',
    whyItMatters: 'This anchors the first workflow so we do not overbuild around secondary ideas.',
    importance: 'high',
    readinessWeight: 25,
    recommendedOptionId: 'goal_core_workflow',
    smartDefaultRationale: 'Choose the outcome that would make this useful on day one.',
    options: [
      option('goal_core_workflow', 'Run one core workflow end-to-end', 'Focuses v1 on a single repeatable loop.', ['scope', 'ux'], 4, [
        { op: 'replace', path: '/mainGoal', value: 'Run one core workflow end-to-end' },
      ]),
      option('goal_visibility', 'Give visibility into current status', 'Prioritizes dashboards and clear status reporting.', ['ux'], 4, [
        { op: 'replace', path: '/mainGoal', value: 'Give visibility into current status' },
      ]),
      option('goal_reduce_manual', 'Reduce manual work', 'Prioritizes automation and structured inputs/outputs.', ['scope'], 5, [
        { op: 'replace', path: '/mainGoal', value: 'Reduce manual work' },
      ]),
      option('goal_collect_requests', 'Collect and organize requests', 'Prioritizes intake, triage, and ownership.', ['scope', 'data-model'], 4, [
        { op: 'replace', path: '/mainGoal', value: 'Collect and organize requests' },
      ]),
      option('goal_not_sure', 'Not sure yet', 'We can continue, but the plan stays assumption-heavy until this is clear.', ['risk'], 5, [
        { op: 'replace', path: '/mainGoal', value: 'Not sure yet' },
        {
          op: 'add',
          path: '/openQuestions/-',
          value: line('open_main_goal', 'Need a sharper first-version goal before final review.', q2, ['risk']),
        },
      ]),
    ],
  };
}

function firstVersionScopeQuestion(): Question {
  return {
    id: q3,
    type: 'scope',
    responseMode: 'options-or-custom',
    title: 'Let’s define the first version.',
    whyItMatters: 'This sets what we intentionally include now so the build does not sprawl.',
    importance: 'high',
    readinessWeight: 25,
    recommendedOptionId: 'scope_single_workflow',
    smartDefaultRationale: 'A single complete workflow is usually the safest first release.',
    options: [
      option('scope_single_workflow', 'One complete workflow only', 'Smallest usable v1 with clear value.', ['scope'], 3, [
        { op: 'replace', path: '/firstVersionScope', value: 'One complete workflow only' },
        {
          op: 'add',
          path: '/features/-',
          value: line('feature_single_workflow', 'Focused v1 workflow with minimal supporting screens', q3, ['scope']),
        },
      ]),
      option('scope_workflow_plus_reporting', 'Core workflow + reporting', 'Adds analytics/visibility around the core loop.', ['scope', 'data-model'], 5, [
        { op: 'replace', path: '/firstVersionScope', value: 'Core workflow + reporting' },
        {
          op: 'add',
          path: '/features/-',
          value: line('feature_reporting', 'Basic reporting around the core workflow', q3, ['scope', 'ux']),
        },
      ]),
      option('scope_multi_role', 'Multi-role first release', 'Includes permissions and role-based views from day one.', ['auth', 'risk'], 7, [
        { op: 'replace', path: '/firstVersionScope', value: 'Multi-role first release' },
        {
          op: 'add',
          path: '/risks/-',
          value: line('risk_multi_role_scope', 'Multi-role v1 increases complexity and testing surface.', q3, ['risk']),
        },
      ]),
      option('scope_not_sure', 'Not sure yet', 'We can keep clarifying, but scope must be locked before build.', ['risk'], 5, [
        { op: 'replace', path: '/firstVersionScope', value: 'Not sure yet' },
      ]),
    ],
  };
}

function desiredOutputQuestion(): Question {
  return {
    id: q4,
    type: 'tradeoff',
    responseMode: 'options-only',
    title: 'What should Clarify produce as the first output?',
    whyItMatters: 'This determines whether we optimize for build execution, design validation, or implementation planning.',
    importance: 'high',
    readinessWeight: 20,
    recommendedOptionId: 'output_implementation_plan',
    smartDefaultRationale: 'An implementation plan is the safest first output when the product shape is still being refined.',
    options: [
      option('output_implementation_plan', 'Implementation plan', 'Plain-English roadmap with build phases and acceptance criteria.', ['scope'], 3, [
        { op: 'replace', path: '/desiredOutput', value: 'implementation_plan' },
      ]),
      option('output_build_prompt', 'Build prompt', 'A direct prompt package for a coding agent.', ['scope'], 4, [
        { op: 'replace', path: '/desiredOutput', value: 'build_prompt' },
      ]),
      option('output_prototype', 'Prototype', 'UI-first output to validate interaction and flow.', ['ux'], 4, [
        { op: 'replace', path: '/desiredOutput', value: 'prototype' },
      ]),
      option('output_spreadsheet', 'Spreadsheet plan', 'Structured rows/columns model for operations-heavy workflows.', ['data-model'], 4, [
        { op: 'replace', path: '/desiredOutput', value: 'spreadsheet_plan' },
      ]),
    ],
  };
}

export function createInterviewQuestions(buildType: BuildCategory): Question[] {
  return [primaryUserQuestionForCategory(buildType), mainThingQuestionForCategory(buildType), firstVersionScopeQuestion(), desiredOutputQuestion()];
}

