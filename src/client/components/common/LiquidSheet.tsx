import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, useDragControls, useAnimation } from 'framer-motion';
import type { PanInfo } from 'framer-motion';
import { cn } from '../../utils/cn';
import { useScrollLock } from '../../hooks/useScrollLock';
import s from './LiquidSheet.module.css';

interface LiquidSheetProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  className?: string;
}

export const LiquidSheet: React.FC<LiquidSheetProps> = ({
  isOpen,
  onClose,
  children,
  title,
  className,
}) => {
  const controls = useAnimation();
  const dragControls = useDragControls();
  const sheetRef = useRef<HTMLDivElement>(null);
  useScrollLock(isOpen);

  useEffect(() => {
    if (isOpen) {
      controls.start('visible');
    } else {
      controls.start('hidden');
    }
  }, [isOpen, controls]);

  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const shouldClose = info.velocity.y > 200 || info.offset.y > 150;
    if (shouldClose) {
      onClose();
    } else {
      controls.start('visible');
    }
  };

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={s.backdrop}
            onClick={onClose}
          />
          <motion.div
            ref={sheetRef}
            initial="hidden"
            animate={controls}
            exit="hidden"
            variants={{
              hidden: { y: '100%', transition: { type: 'spring', damping: 25, stiffness: 200 } },
              visible: { y: 0, transition: { type: 'spring', damping: 25, stiffness: 200 } },
            }}
            drag="y"
            dragDirectionLock
            dragControls={dragControls}
            dragListener={false}
            dragConstraints={{ top: 0 }}
            dragElastic={{ top: 0.05, bottom: 0.5 }}
            onDragEnd={handleDragEnd}
            className={cn(s.sheet, className)}
          >
            <div className={s.handleContainer} onPointerDown={(e) => dragControls.start(e)}>
              <div className={s.handle} />
            </div>
            {title && (
              <div className={s.header}>
                <h2 className={s.title}>{title}</h2>
              </div>
            )}
            <div className={s.content}>{children}</div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
};
