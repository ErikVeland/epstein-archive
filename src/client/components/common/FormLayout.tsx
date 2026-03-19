import React from 'react';

interface FormLayoutProps {
  title?: string;
  description?: string;
  children: React.ReactNode;
  onSubmit?: (e: React.FormEvent) => void;
  className?: string;
}

const FormLayout: React.FC<FormLayoutProps> = ({
  title,
  description,
  children,
  onSubmit,
  className = '',
}) => {
  return (
    <div
      className={`bg-[var(--glass-bg)] rounded-[var(--radius-xl)] border border-[var(--glass-border)] p-6 ${className}`}
    >
      {title && (
        <div className="mb-6">
          <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">{title}</h2>
          {description && <p className="text-[var(--text-muted)]">{description}</p>}
        </div>
      )}
      <form onSubmit={onSubmit} className="space-y-6">
        {children}
      </form>
    </div>
  );
};

export default FormLayout;
