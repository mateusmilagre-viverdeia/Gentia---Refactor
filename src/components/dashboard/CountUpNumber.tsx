import React, { useEffect, useRef, useState } from 'react';
import { motion, useSpring, useTransform } from 'framer-motion';
import { formatarMoeda, formatarPercentual, formatarNumero } from '@/utils/formatters';

interface CountUpNumberProps {
  value: number;
  duration?: number;
  format: 'currency' | 'percentage' | 'number';
  className?: string;
  startOnView?: boolean;
  decimals?: number;
}

export const CountUpNumber: React.FC<CountUpNumberProps> = ({
  value,
  duration = 2000,
  format,
  className = '',
  startOnView = true,
  decimals = 2
}) => {
  const [isInView, setIsInView] = useState(!startOnView);
  const ref = useRef<HTMLSpanElement>(null);

  const spring = useSpring(0, {
    duration,
    bounce: 0,
  });

  const display = useTransform(spring, (current) => {
    if (format === 'currency') {
      return formatarMoeda(current);
    } else if (format === 'percentage') {
      return formatarPercentual(current, decimals);
    } else {
      return formatarNumero(Math.round(current));
    }
  });

  useEffect(() => {
    if (!startOnView) {
      spring.set(value);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !isInView) {
          setIsInView(true);
        }
      },
      { threshold: 0.1 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => {
      if (ref.current) {
        observer.unobserve(ref.current);
      }
    };
  }, [startOnView, isInView]);

  useEffect(() => {
    if (isInView) {
      spring.set(value);
    }
  }, [isInView, value, spring]);

  return (
    <motion.span ref={ref} className={className}>
      {display}
    </motion.span>
  );
};
