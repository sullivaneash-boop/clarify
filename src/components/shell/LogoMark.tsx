import { cn } from '../../lib/utils/cn';

type LogoMarkProps = {
  className?: string;
};

export function LogoMark({ className }: LogoMarkProps) {
  return (
    <img
      src="/brand/clarify-icon-128.png"
      alt=""
      aria-hidden="true"
      className={cn('h-9 w-9 rounded-lg object-cover', className)}
    />
  );
}
