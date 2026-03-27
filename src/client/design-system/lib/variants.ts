import { cn } from './cn';

type VariantRecord = Record<string, Record<string, string>>;

type VariantSelection<T extends VariantRecord> = {
  [K in keyof T]?: keyof T[K];
};

interface VariantDefinition<T extends VariantRecord> {
  base?: string;
  variants?: T;
  defaults?: VariantSelection<T>;
}

export function defineVariants<T extends VariantRecord>({
  base = '',
  variants = {} as T,
  defaults = {} as VariantSelection<T>,
}: VariantDefinition<T>) {
  return (selection: VariantSelection<T> = {}, className?: string) => {
    const resolvedSelection = { ...defaults, ...selection } as VariantSelection<T>;
    const resolvedClasses = Object.entries(variants).map(([variantName, optionMap]) => {
      const selectedOption = resolvedSelection[variantName as keyof T];
      if (!selectedOption) {
        return '';
      }

      return optionMap[selectedOption as string] ?? '';
    });

    return cn(base, ...resolvedClasses, className);
  };
}
