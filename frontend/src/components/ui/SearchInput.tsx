import { MagnifyingGlass, X } from '@phosphor-icons/react';
import { Input } from './Input';
import { Button } from './Button';
import { ComponentProps } from 'react';

interface SearchInputProps extends Omit<ComponentProps<typeof Input>, 'onChange'> {
  value: string;
  onChange: (value: string) => void;
  isLoading?: boolean;
}

export function SearchInput({ value, onChange, isLoading, className = '', ...props }: SearchInputProps) {
  return (
    <div className={`relative flex items-center ${className}`}>
      <div className="absolute left-3 text-muted-foreground pointer-events-none">
        {isLoading ? (
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
        ) : (
          <MagnifyingGlass size={16} weight="bold" aria-hidden="true" />
        )}
      </div>
      <Input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="pl-9 pr-9"
        {...props}
      />
      {value && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute right-1 h-7 w-7 text-muted-foreground hover:text-foreground"
          onClick={() => onChange('')}
          aria-label="Xóa từ khóa"
        >
          <X size={14} weight="bold" />
        </Button>
      )}
    </div>
  );
}
