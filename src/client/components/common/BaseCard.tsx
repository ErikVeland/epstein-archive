import React from 'react';
import s from './BaseCard.module.css';

interface BaseCardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export const BaseCard: React.FC<BaseCardProps> = ({ children, className = '', onClick }) => {
  return (
    <div onClick={onClick} className={`${s.card} ${onClick ? s.cardClickable : ''} ${className}`}>
      {children}
    </div>
  );
};
