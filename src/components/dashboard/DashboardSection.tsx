import React, { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface DashboardSectionProps {
  id: string;
  title?: string;
  children: ReactNode;
  className?: string;
  showInSummary?: boolean;
}

export const DashboardSection: React.FC<DashboardSectionProps> = ({
  id,
  title,
  children,
  className = '',
  showInSummary = true
}) => {
  return (
    <motion.section
      id={id}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={cn('space-y-6', className)}
    >
      {title && (
        <h2 className="text-2xl font-bold text-foreground">
          {title}
        </h2>
      )}
      {children}
    </motion.section>
  );
};
