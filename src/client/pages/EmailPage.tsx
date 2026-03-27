import React from 'react';
import EmailClient from '../components/email/EmailClient';

export const EmailPage: React.FC = () => {
  return (
    <div className="min-w-0 overflow-hidden h-[calc(100dvh-9.5rem)] min-h-[320px] md:h-[calc(100dvh-12.5rem)] md:min-h-[600px]">
      <EmailClient />
    </div>
  );
};
