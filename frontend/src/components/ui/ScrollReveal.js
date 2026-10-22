import React, { useEffect, useRef, useState } from 'react';

/**
 * ScrollReveal Component
 * Animates children as they scroll into view, with fallbacks for keyboard navigation,
 * reduced motion preferences, safety timers, and deep linking so content is never permanently hidden.
 */
export default function ScrollReveal({
  children,
  className = '',
  delay = 0,
  duration = 'duration-1000',
  threshold = 0.05,
  rootMargin = '50px 0px 0px 0px',
  fallbackDelay = null,
  direction = 'up' // 'up', 'down', 'left', 'right', 'none'
}) {
  const [isVisible, setIsVisible] = useState(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        return true;
      }
    }
    return false;
  });

  const elementRef = useRef(null);

  useEffect(() => {
    if (isVisible) return;

    if (elementRef.current && typeof window !== 'undefined') {
      const rect = elementRef.current.getBoundingClientRect();
      if (rect.top <= (window.innerHeight || document.documentElement.clientHeight) + 100) {
        setIsVisible(true);
        return;
      }
    }

    // Do not reveal every section on a timer: that finishes the animation
    // before the visitor has scrolled to it. IntersectionObserver is the
    // normal reveal trigger; the no-observer branch below remains the
    // accessibility fallback.
    const fallbackTimer = typeof fallbackDelay === 'number' && fallbackDelay > 0
      ? setTimeout(() => setIsVisible(true), fallbackDelay + delay)
      : null;

    if (typeof IntersectionObserver === 'undefined') {
      setIsVisible(true);
      if (fallbackTimer) clearTimeout(fallbackTimer);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          if (fallbackTimer) clearTimeout(fallbackTimer);
          if (elementRef.current) {
            observer.unobserve(elementRef.current);
          }
        }
      },
      {
        threshold,
        rootMargin,
      }
    );

    const currentRef = elementRef.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (fallbackTimer) clearTimeout(fallbackTimer);
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [threshold, rootMargin, fallbackDelay, delay, isVisible]);

  // Determine transition offset classes based on direction
  const getDirectionClasses = () => {
    switch (direction) {
      case 'up':
        return 'translate-y-8';
      case 'down':
        return '-translate-y-8';
      case 'left':
        return 'translate-x-8';
      case 'right':
        return '-translate-x-8';
      case 'none':
      default:
        return '';
    }
  };

  return (
    <div
      ref={elementRef}
      onFocusCapture={() => setIsVisible(true)}
      className={`transition-all ${duration} ease-out will-change-transform ${
        isVisible
          ? 'opacity-100 translate-y-0 translate-x-0 scale-100 blur-0'
          : `opacity-0 scale-[0.98] blur-[0.5px] ${getDirectionClasses()}`
      } ${className}`}
      style={{
        transitionDelay: `${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

