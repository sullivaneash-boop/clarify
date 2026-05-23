import type { ReactNode } from 'react';
import { TopBar } from './TopBar';

type AppShellProps = {
  children: ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="min-h-screen bg-bg text-text">
      <TopBar />
      <main className="min-h-[calc(100vh-64px)]">{children}</main>
    </div>
  );
}
