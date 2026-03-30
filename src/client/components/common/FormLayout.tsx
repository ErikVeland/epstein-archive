import React from 'react';
import s from './FormLayout.module.css';

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
    <div className={`${s.root} ${className}`}>
      {title && (
        <div className={s.header}>
          <h2 className={s.title}>{title}</h2>
          {description && <p className={s.description}>{description}</p>}
        </div>
      )}
      <form onSubmit={onSubmit} className={s.form}>
        {children}
      </form>
    </div>
  );
};

export default FormLayout;
