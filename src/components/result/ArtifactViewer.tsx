import { Code2, FileText, FolderTree, ListChecks, ScrollText } from 'lucide-react';
import type { ResultArtifact } from '../../lib/interview/schema';
import type { ResultTab } from '../../stores/useInterviewStore';
import { Tabs } from '../ui/Tabs';
import { cn } from '../../lib/utils/cn';

type ArtifactViewerProps = {
  artifact: ResultArtifact;
  selectedTab: ResultTab;
  onTabChange: (tab: ResultTab) => void;
};

const tabs = [
  { value: 'overview', label: 'Overview', icon: <FileText className="h-4 w-4" /> },
  { value: 'prompt', label: 'Build Prompt', icon: <Code2 className="h-4 w-4" /> },
  { value: 'plan', label: 'Plan', icon: <ListChecks className="h-4 w-4" /> },
  { value: 'files', label: 'Files', icon: <FolderTree className="h-4 w-4" /> },
  { value: 'spec', label: 'Spec', icon: <ScrollText className="h-4 w-4" /> },
] satisfies Array<{ value: ResultTab; label: string; icon: JSX.Element }>;

export function ArtifactViewer({ artifact, selectedTab, onTabChange }: ArtifactViewerProps) {
  return (
    <section className="rounded-panel border border-border bg-surface shadow-soft">
      <div className="border-b border-border p-4">
        <Tabs value={selectedTab} items={tabs} onChange={onTabChange} />
      </div>
      <div className="p-4">
        {selectedTab === 'overview' ? <MarkdownBlock content={artifact.sections.overview} /> : null}
        {selectedTab === 'prompt' ? <MarkdownBlock content={artifact.sections.buildPrompt} /> : null}
        {selectedTab === 'plan' ? <MarkdownBlock content={artifact.sections.plan} /> : null}
        {selectedTab === 'spec' ? <CodeBlock content={artifact.sections.specJson} /> : null}
        {selectedTab === 'files' ? <FilesView artifact={artifact} /> : null}
      </div>
    </section>
  );
}

function MarkdownBlock({ content }: { content: string }) {
  return (
    <div className="prose-lite max-h-[58vh] overflow-auto rounded-xl border border-border bg-surface-inset p-4 text-sm leading-relaxed text-text-muted">
      {content.split('\n').map((line, index) => {
        const key = `${index}-${line}`;
        if (line.startsWith('# ')) {
          return (
            <h2 key={key} className="mb-3 mt-1 text-2xl font-semibold text-text">
              {line.replace('# ', '')}
            </h2>
          );
        }
        if (line.startsWith('## ')) {
          return (
            <h3 key={key} className="mb-2 mt-5 text-base font-semibold text-accent-strong">
              {line.replace('## ', '')}
            </h3>
          );
        }
        if (line.startsWith('- ')) {
          return (
            <p key={key} className="pl-4">
              {line}
            </p>
          );
        }
        if (!line.trim()) return <div key={key} className="h-2" />;
        return <p key={key}>{line}</p>;
      })}
    </div>
  );
}

function CodeBlock({ content }: { content: string }) {
  return (
    <pre className="max-h-[58vh] overflow-auto rounded-xl border border-border bg-surface-inset p-4 text-xs leading-relaxed text-text">
      <code>{content}</code>
    </pre>
  );
}

function FilesView({ artifact }: { artifact: ResultArtifact }) {
  return (
    <div className="grid gap-3">
      {artifact.files.map((file) => (
        <details
          key={file.path}
          className={cn('rounded-xl border border-border bg-surface-inset p-4 text-sm text-text-muted')}
        >
          <summary className="cursor-pointer font-medium text-text">{file.path}</summary>
          <pre className="mt-3 max-h-72 overflow-auto rounded-lg border border-border bg-bg p-3 text-xs leading-relaxed text-text">
            <code>{file.content}</code>
          </pre>
        </details>
      ))}
    </div>
  );
}
