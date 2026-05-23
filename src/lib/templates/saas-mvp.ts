import type { DecisionOption, JSONPatch, Question, SpecDoc, SpecLine } from '../schemas';
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

export function createInitialSpec(initialPrompt: string): SpecDoc {
  const projectName = titleFromPrompt(initialPrompt);

  return {
    projectName,
    oneLiner: initialPrompt.trim(),
    users: [],
    features: [
      {
        id: 'feature_initial_hypothesis',
        text: 'Guided product architecture interview',
        confidence: 'assumed',
        sourceQuestionId: 'initial',
        tags: ['scope', 'ux'],
      },
    ],
    dataModel: [],
    architecture: {
      auth: 'tbd',
      realtime: false,
      offline: false,
      payments: 'tbd',
      deployment: 'vercel',
      confidence: {
        auth: 'assumed',
        realtime: 'assumed',
        offline: 'assumed',
        payments: 'assumed',
        deployment: 'default',
      },
    },
    integrations: [],
    outOfScope: [],
    risks: [
      {
        id: 'risk_initial_ambiguity',
        text: 'Initial idea needs architecture decisions before implementation',
        confidence: 'assumed',
        sourceQuestionId: 'initial',
        tags: ['risk'],
      },
    ],
    openQuestions: [],
  };
}

const q1 = 'q_intent_confirmation';
const q2 = 'q_primary_user';
const q3 = 'q_account_model';
const q4 = 'q_core_workflow';
const q5 = 'q_data_model';
const q6 = 'q_collaboration';
const q7 = 'q_payments';
const q8 = 'q_v1_scope';

export const saasMvpQuestions: Question[] = [
  {
    id: q1,
    type: 'intent-confirm',
    responseMode: 'options-or-custom',
    title: 'Let me confirm the build direction.',
    whyItMatters: 'This locks the first product hypothesis before architecture choices compound.',
    importance: 'critical',
    readinessWeight: 12,
    recommendedOptionId: 'intent_yes',
    smartDefaultRationale:
      'Not sure is fine. Keep the current direction unless a core user or workflow is clearly wrong.',
    options: [
      option('intent_yes', "Yes, that's right", 'This means: keep the current hypothesis and move to architecture.', ['scope'], 3, [
        { op: 'replace', path: '/oneLiner', value: 'Client portal for a small agency' },
        {
          op: 'add',
          path: '/features/-',
          value: line('feature_client_portal', 'Client-facing portal for requests, updates, and deliverables', q1, [
            'scope',
            'ux',
          ]),
        },
      ]),
      option(
        'intent_close',
        'Close, needs adjustment',
        'This means: keep the portal shape but preserve one open product clarification.',
        ['scope', 'risk'],
        4,
        [
          {
            op: 'add',
            path: '/openQuestions/-',
            value: line('open_intent_adjustment', 'Clarify the exact product direction before build handoff', q1, [
              'scope',
              'risk',
            ]),
          },
        ],
      ),
      option('intent_rewrite', 'No, rewrite it', 'This means: pause architecture until the product promise is rewritten.', ['risk'], 7, [
        {
          op: 'add',
          path: '/risks/-',
          value: line('risk_direction_unstable', 'Product direction is not stable enough for implementation', q1, ['risk']),
        },
        {
          op: 'add',
          path: '/openQuestions/-',
          value: line('open_rewrite_direction', 'Rewrite the one-liner before generating build tasks', q1, ['scope']),
        },
      ]),
    ],
  },
  {
    id: q2,
    type: 'fork',
    responseMode: 'unsure-allowed',
    title: 'Who needs to use this first?',
    whyItMatters: 'This changes auth, permissions, data ownership, and the first build path.',
    importance: 'critical',
    readinessWeight: 16,
    recommendedOptionId: 'user_me',
    smartDefaultRationale:
      "Not sure is fine. For a first version, start with 'Just me' unless other people truly need accounts on day one.",
    options: [
      option('user_me', 'Just me', 'This means: fastest build, no roles, simpler data.', ['auth', 'data-model'], 2, [
        { op: 'add', path: '/users/-', value: line('user_owner', 'Single owner/operator', q2, ['auth']) },
        { op: 'replace', path: '/architecture/auth', value: 'single-user' },
        { op: 'replace', path: '/architecture/confidence/auth', value: 'locked' },
      ]),
      option('user_team', 'My team', 'This means: shared workspace, roles, and permissions.', ['auth', 'data-model'], 5, [
        { op: 'add', path: '/users/-', value: line('user_team_member', 'Internal team members', q2, ['auth', 'ux']) },
        {
          op: 'add',
          path: '/dataModel/-',
          value: line('data_workspace_members', 'Workspace members and roles', q2, ['data-model', 'auth']),
        },
        { op: 'replace', path: '/architecture/auth', value: 'magic-link' },
        { op: 'replace', path: '/architecture/confidence/auth', value: 'locked' },
      ]),
      option('user_customers', 'My customers', 'This means: public-facing auth and onboarding.', ['auth', 'ux'], 6, [
        { op: 'add', path: '/users/-', value: line('user_customer', 'Customer portal users', q2, ['auth', 'ux']) },
        {
          op: 'add',
          path: '/features/-',
          value: line('feature_customer_onboarding', 'Customer onboarding and account access', q2, ['auth', 'ux']),
        },
        { op: 'replace', path: '/architecture/auth', value: 'magic-link' },
        { op: 'replace', path: '/architecture/confidence/auth', value: 'locked' },
      ]),
      option(
        'user_clients',
        'Multiple client accounts',
        'This means: multi-tenant architecture from day one.',
        ['architecture', 'data-model', 'risk'],
        9,
        [
          { op: 'add', path: '/users/-', value: line('user_client_account', 'Client account users', q2, ['auth', 'ux']) },
          {
            op: 'add',
            path: '/dataModel/-',
            value: line('data_client_tenants', 'Client accounts with tenant-scoped records', q2, [
              'data-model',
              'architecture',
            ]),
          },
          {
            op: 'add',
            path: '/risks/-',
            value: line('risk_multitenancy', 'Tenant boundaries must be modeled before implementation', q2, [
              'architecture',
              'risk',
            ]),
          },
          { op: 'replace', path: '/architecture/auth', value: 'magic-link' },
          { op: 'replace', path: '/architecture/confidence/auth', value: 'locked' },
        ],
      ),
    ],
  },
  {
    id: q3,
    type: 'tradeoff',
    responseMode: 'unsure-allowed',
    title: 'Does this need login on day one?',
    whyItMatters: 'Auth changes onboarding, data ownership, deployment work, and what can be safely shipped first.',
    importance: 'critical',
    readinessWeight: 14,
    recommendedOptionId: 'login_magic',
    smartDefaultRationale:
      'For a client portal, private magic links are the safest v1 default: low friction, controlled access, and enough identity.',
    options: [
      option('login_none', 'No login', 'This means: fastest prototype, but no private client data.', ['auth', 'scope'], 2, [
        { op: 'replace', path: '/architecture/auth', value: 'none' },
        { op: 'replace', path: '/architecture/confidence/auth', value: 'locked' },
        {
          op: 'add',
          path: '/outOfScope/-',
          value: line('scope_no_private_data', 'Private client-specific data in v1', q3, ['scope', 'auth']),
        },
      ]),
      option('login_magic', 'Private magic link', 'This means: lightweight secure access without password flows.', ['auth'], 4, [
        { op: 'replace', path: '/architecture/auth', value: 'magic-link' },
        { op: 'replace', path: '/architecture/confidence/auth', value: 'locked' },
        {
          op: 'add',
          path: '/features/-',
          value: line('feature_magic_link_access', 'Private magic-link sign-in', q3, ['auth', 'ux']),
        },
        {
          op: 'add',
          path: '/dataModel/-',
          value: line('data_users_sessions', 'Users and access sessions', q3, ['data-model', 'auth']),
        },
      ]),
      option('login_full', 'Full user accounts', 'This means: profile, password or OAuth, settings, and recovery flows.', ['auth', 'risk'], 8, [
        { op: 'replace', path: '/architecture/auth', value: 'credentials' },
        { op: 'replace', path: '/architecture/confidence/auth', value: 'locked' },
        {
          op: 'add',
          path: '/features/-',
          value: line('feature_full_accounts', 'Full account registration and profile management', q3, ['auth', 'ux']),
        },
        {
          op: 'add',
          path: '/risks/-',
          value: line('risk_account_surface_area', 'Full auth adds recovery, settings, and security surface area', q3, [
            'auth',
            'risk',
          ]),
        },
      ]),
    ],
  },
  {
    id: q4,
    type: 'fork',
    responseMode: 'options-or-custom',
    title: 'What is the main loop users repeat?',
    whyItMatters: 'The repeated loop becomes the primary navigation, empty states, and data model center.',
    importance: 'high',
    readinessWeight: 13,
    recommendedOptionId: 'loop_submit',
    smartDefaultRationale:
      'For a client portal, start with request submission unless the product is mainly reporting or document delivery.',
    options: [
      option('loop_submit', 'Submit request', 'This means: intake forms, status, and owner follow-up.', ['ux', 'data-model'], 5, [
        {
          op: 'add',
          path: '/features/-',
          value: line('feature_submit_request', 'Client request intake flow', q4, ['ux', 'scope']),
        },
        {
          op: 'add',
          path: '/dataModel/-',
          value: line('data_requests', 'Requests with status, owner, priority, and timestamps', q4, ['data-model']),
        },
      ]),
      option('loop_track', 'Track progress', 'This means: status board, updates, and client-visible history.', ['ux'], 5, [
        {
          op: 'add',
          path: '/features/-',
          value: line('feature_progress_tracking', 'Client-visible progress tracking', q4, ['ux']),
        },
        {
          op: 'add',
          path: '/dataModel/-',
          value: line('data_status_updates', 'Status updates and activity history', q4, ['data-model']),
        },
      ]),
      option('loop_generate', 'Generate output', 'This means: prompt input, generated artifacts, and review state.', ['ux', 'data-model'], 6, [
        {
          op: 'add',
          path: '/features/-',
          value: line('feature_generate_output', 'AI-assisted output generation workflow', q4, ['ux', 'scope']),
        },
        {
          op: 'add',
          path: '/dataModel/-',
          value: line('data_generated_outputs', 'Generated outputs with prompt, version, and approval status', q4, [
            'data-model',
          ]),
        },
      ]),
      option('loop_records', 'Manage records', 'This means: CRUD screens, filters, details, and audit trail.', ['data-model', 'ux'], 6, [
        {
          op: 'add',
          path: '/features/-',
          value: line('feature_manage_records', 'Record management with list and detail views', q4, ['ux', 'scope']),
        },
        {
          op: 'add',
          path: '/dataModel/-',
          value: line('data_records', 'Primary records with owner, state, and metadata', q4, ['data-model']),
        },
      ]),
    ],
  },
  {
    id: q5,
    type: 'tradeoff',
    responseMode: 'unsure-allowed',
    title: 'What needs to be saved?',
    whyItMatters: 'Persistence decides whether this is a lightweight workflow or a real application with migrations.',
    importance: 'high',
    readinessWeight: 12,
    recommendedOptionId: 'save_client_project',
    smartDefaultRationale:
      'For a client portal, save client/project records. It keeps the model aligned with the business boundary.',
    options: [
      option('save_none', 'Nothing persistent', 'This means: simpler build, but no history or account state.', ['data-model'], 1, [
        {
          op: 'add',
          path: '/outOfScope/-',
          value: line('scope_persistence', 'Persistent application data in v1', q5, ['data-model', 'scope']),
        },
      ]),
      option('save_basic', 'Basic records', 'This means: one central table with statuses and timestamps.', ['data-model'], 4, [
        {
          op: 'add',
          path: '/dataModel/-',
          value: line('data_basic_records', 'Basic records with status and timestamps', q5, ['data-model']),
        },
      ]),
      option('save_user_owned', 'User-owned records', 'This means: records belong to users and need access checks.', ['data-model', 'auth'], 6, [
        {
          op: 'add',
          path: '/dataModel/-',
          value: line('data_user_owned_records', 'User-owned records with access rules', q5, ['data-model', 'auth']),
        },
      ]),
      option(
        'save_client_project',
        'Client/project records',
        'This means: clients, projects, requests, and deliverables become first-class entities.',
        ['data-model', 'architecture'],
        7,
        [
          {
            op: 'add',
            path: '/dataModel/-',
            value: line('data_clients_projects', 'Clients, projects, requests, and deliverables', q5, [
              'data-model',
              'architecture',
            ]),
          },
          {
            op: 'add',
            path: '/features/-',
            value: line('feature_project_context', 'Project-scoped client workspace', q5, ['ux', 'scope']),
          },
        ],
      ),
    ],
  },
  {
    id: q6,
    type: 'tradeoff',
    responseMode: 'unsure-allowed',
    title: 'Will more than one person touch the same item?',
    whyItMatters: 'Collaboration determines comments, roles, notifications, and conflict complexity.',
    importance: 'high',
    readinessWeight: 11,
    recommendedOptionId: 'collab_review',
    smartDefaultRationale:
      'Use review-only collaboration for v1. It captures client feedback without building a full realtime product.',
    options: [
      option('collab_none', 'No', 'This means: fewer states, no comments, and simpler ownership.', ['scope'], 2, [
        {
          op: 'add',
          path: '/outOfScope/-',
          value: line('scope_collaboration', 'Multi-user collaboration in v1', q6, ['scope']),
        },
      ]),
      option('collab_review', 'Review only', 'This means: clients can review updates without editing the source item.', ['ux'], 4, [
        {
          op: 'add',
          path: '/features/-',
          value: line('feature_review_flow', 'Client review state for requests and deliverables', q6, ['ux']),
        },
      ]),
      option('collab_comment', 'Comment/approve', 'This means: comment threads, approvals, and notifications.', ['ux', 'data-model'], 6, [
        {
          op: 'add',
          path: '/features/-',
          value: line('feature_comments_approvals', 'Comments and approvals on client items', q6, ['ux']),
        },
        {
          op: 'add',
          path: '/dataModel/-',
          value: line('data_comments_approvals', 'Comments, approvals, and notification events', q6, ['data-model']),
        },
      ]),
      option('collab_full', 'Full collaboration', 'This means: concurrent editing, roles, and audit history.', ['architecture', 'risk'], 9, [
        { op: 'replace', path: '/architecture/realtime', value: true },
        { op: 'replace', path: '/architecture/confidence/realtime', value: 'locked' },
        {
          op: 'add',
          path: '/risks/-',
          value: line('risk_full_collaboration', 'Full collaboration adds realtime and permission complexity', q6, [
            'architecture',
            'risk',
          ]),
        },
      ]),
    ],
  },
  {
    id: q7,
    type: 'tradeoff',
    responseMode: 'unsure-allowed',
    title: 'Does money move through this product?',
    whyItMatters: 'Payments affect onboarding, legal surface area, environment variables, and test flows.',
    importance: 'medium',
    readinessWeight: 9,
    recommendedOptionId: 'pay_none',
    smartDefaultRationale:
      'Use no payments for the first client portal unless checkout is the core reason the portal exists.',
    options: [
      option('pay_none', 'No payments', 'This means: billing stays outside the first build.', ['billing', 'scope'], 1, [
        { op: 'replace', path: '/architecture/payments', value: 'none' },
        { op: 'replace', path: '/architecture/confidence/payments', value: 'locked' },
        {
          op: 'add',
          path: '/outOfScope/-',
          value: line('scope_payments', 'Payments and billing workflows in v1', q7, ['billing', 'scope']),
        },
      ]),
      option('pay_external', 'External payment link', 'This means: link out to Stripe, Square, or invoice payment.', ['billing'], 3, [
        { op: 'replace', path: '/architecture/payments', value: 'other' },
        { op: 'replace', path: '/architecture/confidence/payments', value: 'locked' },
        {
          op: 'add',
          path: '/integrations/-',
          value: line('integration_external_payment', 'External payment link or invoice system', q7, ['billing', 'integration']),
        },
      ]),
      option('pay_checkout', 'In-app checkout', 'This means: Stripe checkout, webhook handling, and payment state.', ['billing', 'integration'], 6, [
        { op: 'replace', path: '/architecture/payments', value: 'stripe' },
        { op: 'replace', path: '/architecture/confidence/payments', value: 'locked' },
        {
          op: 'add',
          path: '/integrations/-',
          value: line('integration_stripe_checkout', 'Stripe Checkout with webhook-backed payment state', q7, [
            'billing',
            'integration',
          ]),
        },
      ]),
      option('pay_subscription', 'Subscription billing', 'This means: plans, entitlements, portal access, and renewals.', ['billing', 'risk'], 8, [
        { op: 'replace', path: '/architecture/payments', value: 'stripe' },
        { op: 'replace', path: '/architecture/confidence/payments', value: 'locked' },
        {
          op: 'add',
          path: '/features/-',
          value: line('feature_subscription_billing', 'Subscription billing and customer portal access', q7, [
            'billing',
            'ux',
          ]),
        },
        {
          op: 'add',
          path: '/risks/-',
          value: line('risk_subscription_complexity', 'Subscription billing adds entitlement and renewal edge cases', q7, [
            'billing',
            'risk',
          ]),
        },
      ]),
    ],
  },
  {
    id: q8,
    type: 'scope',
    responseMode: 'unsure-allowed',
    title: 'What should v1 avoid?',
    whyItMatters: 'A clear negative scope keeps the handoff buildable and protects the first implementation from drift.',
    importance: 'high',
    readinessWeight: 13,
    recommendedOptionId: 'avoid_realtime',
    smartDefaultRationale:
      'Avoid realtime for v1 unless the product breaks without live updates. Polling or refresh states are usually enough.',
    options: [
      option('avoid_auth', 'Avoid auth', 'This means: demo or internal-only build with no private client data.', ['auth', 'scope'], 4, [
        {
          op: 'add',
          path: '/outOfScope/-',
          value: line('scope_avoid_auth', 'Authentication and account management in v1', q8, ['auth', 'scope']),
        },
      ]),
      option('avoid_payments', 'Avoid payments', 'This means: no checkout, plans, invoices, or webhooks in v1.', ['billing', 'scope'], 3, [
        {
          op: 'add',
          path: '/outOfScope/-',
          value: line('scope_avoid_payments', 'Payments, subscriptions, and billing webhooks in v1', q8, [
            'billing',
            'scope',
          ]),
        },
      ]),
      option('avoid_realtime', 'Avoid realtime', 'This means: simpler state model with refresh and notification basics.', ['architecture', 'scope'], 3, [
        { op: 'replace', path: '/architecture/realtime', value: false },
        { op: 'replace', path: '/architecture/confidence/realtime', value: 'locked' },
        {
          op: 'add',
          path: '/outOfScope/-',
          value: line('scope_avoid_realtime', 'Realtime collaboration and live presence in v1', q8, [
            'architecture',
            'scope',
          ]),
        },
      ]),
      option('avoid_integrations', 'Avoid integrations', 'This means: no third-party sync until the main loop is proven.', ['integration', 'scope'], 4, [
        {
          op: 'add',
          path: '/outOfScope/-',
          value: line('scope_avoid_integrations', 'Third-party integrations and sync in v1', q8, [
            'integration',
            'scope',
          ]),
        },
      ]),
    ],
  },
];

