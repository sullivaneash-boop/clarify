import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function makeId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

export function titleFromPrompt(prompt: string) {
  const cleaned = prompt
    .replace(/^i\s+(want|need|would like)\s+to\s+build\s+/i, '')
    .replace(/^build\s+/i, '')
    .trim();

  if (!cleaned) return 'Untitled build';

  return cleaned
    .split(/\s+/)
    .slice(0, 7)
    .join(' ')
    .replace(/[.?!]$/g, '');
}

