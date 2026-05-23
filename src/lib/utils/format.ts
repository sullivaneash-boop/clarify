export function formatDateTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

export function toTitle(value: string | null | undefined) {
  if (!value) return 'Needed';
  return value
    .replace(/_/g, ' ')
    .split(' ')
    .map((part: string) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}
