import React, { useEffect, useRef, useState } from 'react';

/**
 * ScrollReveal Component
 * Animates children as they scroll into view, mimicking premium platforms like Stay Vista.
 */
export default function ScrollReveal({
  children,
  className = '',
  delay = 0,
  duration = 'duration-1000',
  threshold = 0.05,
  rootMargin = '0px 0px -60px 0px',
  direction = 'up' // 'up', 'down', 'left', 'right', 'none'
}) {
  const [isVisible, setIsVisible] = useState(false);
  const elementRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          // Once visible, stop observing to keep element visible on scroll back up
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
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [threshold, rootMargin]);

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
