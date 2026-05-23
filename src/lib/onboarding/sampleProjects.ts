import type { SampleProject } from './schema';

export const SAMPLE_PROJECTS: SampleProject[] = [
  {
    id: 'local-service',
    title: 'Local service booking page',
    oneLine: 'A landing page that turns local traffic into booked appointments.',
    whatYoullSee: 'Watch Clarify catch the payment decision before it builds the wrong flow.',
    seed: {
      source: 'sample',
      sampleId: 'local-service',
      initialPrompt:
        'I run a mobile car detailing business. I want a landing page where people can see my packages and book a time slot.',
      partialSpec: [
        {
          id: 'goal',
          label: 'Goal',
          value: 'Turn local traffic into booked detailing appointments',
          status: 'draft',
        },
        {
          id: 'primary-user',
          label: 'Primary user',
          value: 'Car owners in my service area booking a detail',
          status: 'draft',
        },
        {
          id: 'core-surfaces',
          label: 'Core surfaces',
          value: 'Hero + packages, booking flow, confirmation',
          status: 'draft',
        },
        {
          id: 'booking-model',
          label: 'Booking model',
          value: 'undecided (pay-now vs. hold-and-collect)',
          status: 'unknown',
        },
        {
          id: 'service-radius',
          label: 'Service radius',
          value: 'unknown',
          status: 'unknown',
        },
      ],
      firstQuestion:
        "Do you want to take payment when they book, or just hold the slot and collect on-site? That one choice decides whether we need a payment provider at all - and it's the difference between a one-day build and a one-week one.",
      outputType: 'undecided',
      userContext: null,
    },
  },
  {
    id: 'client-portal',
    title: 'Client portal',
    oneLine: 'A login area where clients see their projects, invoices, and files.',
    whatYoullSee: 'Watch it separate "status page" from "permissions system" - a much bigger build.',
    seed: {
      source: 'sample',
      sampleId: 'client-portal',
      initialPrompt:
        'I run a small agency. I want a portal where my clients can log in and see the status of their projects, invoices, and files.',
      partialSpec: [
        {
          id: 'goal',
          label: 'Goal',
          value: "Cut down 'where are we at?' emails with a self-serve client view",
          status: 'draft',
        },
        {
          id: 'primary-user',
          label: 'Primary user',
          value: 'Existing clients, low technical skill',
          status: 'draft',
        },
        {
          id: 'core-surfaces',
          label: 'Core surfaces',
          value: 'Login, project status, invoices, files',
          status: 'draft',
        },
        {
          id: 'visibility-model',
          label: 'Visibility model',
          value: 'undecided (per-project vs. fixed template)',
          status: 'unknown',
        },
        {
          id: 'account-creation',
          label: 'Account creation',
          value: 'unknown (who invites clients?)',
          status: 'unknown',
        },
      ],
      firstQuestion:
        "Who decides what each client can see - you, per project, or a fixed template every client gets? If it's per-project, we're building a permissions system, and that's a much bigger product than a status page.",
      outputType: 'undecided',
      userContext: null,
    },
  },
  {
    id: 'lead-cleanup',
    title: 'Lead list cleanup',
    oneLine: 'Turn a messy spreadsheet of leads into a clean, deduped list.',
    whatYoullSee: 'Watch it surface the one rule that makes or breaks every cleanup tool.',
    seed: {
      source: 'sample',
      sampleId: 'lead-cleanup',
      initialPrompt:
        'My sales team has a messy spreadsheet of leads - duplicates, missing fields, inconsistent formatting. I want something that cleans it up automatically.',
      partialSpec: [
        {
          id: 'goal',
          label: 'Goal',
          value: 'Turn a messy lead export into a clean, deduped list',
          status: 'draft',
        },
        {
          id: 'primary-user',
          label: 'Primary user',
          value: 'Ops/sales person who lives in spreadsheets',
          status: 'draft',
        },
        {
          id: 'core-surfaces',
          label: 'Core surfaces',
          value: 'Upload, review proposed changes, export',
          status: 'draft',
        },
        {
          id: 'dedupe-rule',
          label: 'Dedupe rule',
          value: 'undecided (newest vs. most-complete vs. manual)',
          status: 'unknown',
        },
        {
          id: 'cadence',
          label: 'Cadence',
          value: 'unknown (run-once vs. recurring)',
          status: 'unknown',
        },
      ],
      firstQuestion:
        "When two rows look like the same lead but disagree, which one wins - newest, most complete, or do you decide each time? 'Decide each time' sounds safe, but it's exactly what makes people abandon cleanup tools halfway through.",
      outputType: 'undecided',
      userContext: null,
    },
  },
];

export function getSampleProject(id: string) {
  return SAMPLE_PROJECTS.find((project) => project.id === id) ?? null;
}
