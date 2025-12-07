import React, { useEffect, useRef, useState } from 'react';

/**
 * LazySection - A component that only renders its children when visible in viewport
 * Uses Intersection Observer for optimal performance
 */
const LazySection = ({ children, fallback = null, rootMargin = '100px' }) => {
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          // Once loaded, stop observing
          if (sectionRef.current) {
            observer.unobserve(sectionRef.current);
          }
        }
      },
      {
        rootMargin, // Load 100px before entering viewport
        threshold: 0.01
      }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => {
      if (sectionRef.current) {
        observer.unobserve(sectionRef.current);
      }
    };
  }, [rootMargin]);

  return (
    <div ref={sectionRef}>
      {isVisible ? children : fallback}
    </div>
  );
};

export default LazySection;
