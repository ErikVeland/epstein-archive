import React from 'react';
import { cn } from '../../utils/cn';
import s from './Skeleton.module.css';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

export function Skeleton({ className, ...props }: SkeletonProps) {
  return <div className={cn(s.root, className)} {...props} />;
}
