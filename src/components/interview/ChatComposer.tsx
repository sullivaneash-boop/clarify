import { SendHorizontal } from 'lucide-react';
import { Button } from '../ui/Button';
import { Textarea } from '../ui/Textarea';

type ChatComposerProps = {
  value: string;
  disabled?: boolean;
  placeholder?: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
};

export function ChatComposer({
  value,
  disabled,
  placeholder = 'Answer in plain English...',
  onChange,
  onSubmit,
}: ChatComposerProps) {
  return (
    <div className="border-t border-border bg-bg-soft p-3">
      <div className="flex items-end gap-2 rounded-[14px] border border-border bg-surface p-2 shadow-soft">
        <Textarea
          autoFocus
          value={value}
          disabled={disabled}
          placeholder={placeholder}
          className="min-h-12 flex-1 border-0 bg-transparent py-2 text-sm shadow-none focus:ring-0"
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              onSubmit();
            }
          }}
        />
        <Button
          type="button"
          variant="primary"
          size="icon"
          aria-label="Send answer"
          disabled={disabled || value.trim().length === 0}
          onClick={onSubmit}
        >
          <SendHorizontal className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
