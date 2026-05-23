import type { ReactNode, SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement>;

function BaseIcon({ children, ...props }: IconProps & { children: ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
      {children}
    </svg>
  );
}

export function PromptFrameIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <rect x="3.5" y="5" width="17" height="14" rx="3" />
      <path d="M7.5 9.5h9" />
      <path d="M7.5 13h5.5" />
      <circle cx="17.5" cy="13.2" r="1" />
    </BaseIcon>
  );
}

export function InterviewLoopIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M7 7.5h6.5l-1.8-1.8" />
      <path d="M17 16.5h-6.5l1.8 1.8" />
      <path d="M16.5 7.8a5 5 0 0 1 1.5 3.6" />
      <path d="M7.5 16.2A5 5 0 0 1 6 12.6" />
      <circle cx="12" cy="12" r="2.2" />
    </BaseIcon>
  );
}

export function BuildPlanIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M7 4.5h7l3 3V19a1.5 1.5 0 0 1-1.5 1.5H7A1.5 1.5 0 0 1 5.5 19V6A1.5 1.5 0 0 1 7 4.5Z" />
      <path d="M14 4.8V8h3.1" />
      <path d="M8.2 11.2h7.2" />
      <path d="M8.2 14.1h7.2" />
      <path d="M8.2 17h4.6" />
    </BaseIcon>
  );
}
