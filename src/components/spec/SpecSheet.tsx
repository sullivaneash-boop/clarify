import type { BuildSpec } from '../../lib/interview/schema';
import { Sheet } from '../ui/Sheet';
import { SpecPanel } from './SpecPanel';

type SpecSheetProps = {
  open: boolean;
  spec: BuildSpec;
  changedPaths: string[];
  onOpenChange: (open: boolean) => void;
};

export function SpecSheet({ open, spec, changedPaths, onOpenChange }: SpecSheetProps) {
  return (
    <Sheet open={open} title="Live Spec" onOpenChange={onOpenChange}>
      <SpecPanel spec={spec} changedPaths={changedPaths} compact />
    </Sheet>
  );
}
