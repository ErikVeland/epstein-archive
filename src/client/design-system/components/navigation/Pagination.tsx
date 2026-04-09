import * as React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../../lib';
import { Button } from '../Button';
import './Pagination.css';

export interface PaginationProps extends React.HTMLAttributes<HTMLDivElement> {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  previousLabel?: string;
  nextLabel?: string;
}

export function Pagination({
  className,
  page,
  totalPages,
  onPageChange,
  previousLabel = 'Previous page',
  nextLabel = 'Next page',
  ...props
}: PaginationProps) {
  const previousDisabled = page <= 1;
  const nextDisabled = page >= totalPages;

  return (
    <div className={cn('ds-pagination', className)} {...props}>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        aria-label={previousLabel}
        disabled={previousDisabled}
        onClick={() => onPageChange(Math.max(1, page - 1))}
      >
        <ChevronLeft size={16} />
      </Button>
      <p className="ds-paginationText">
        Page {page} of {Math.max(totalPages, 1)}
      </p>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        aria-label={nextLabel}
        disabled={nextDisabled}
        onClick={() => onPageChange(Math.min(totalPages, page + 1))}
      >
        <ChevronRight size={16} />
      </Button>
    </div>
  );
}
