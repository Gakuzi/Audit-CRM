import { useRef, useEffect, useState, CSSProperties } from 'react';

interface SwipeConfig {
    onSwipeLeft?: () => void;
    onSwipeRight?: () => void;
    threshold?: number;
    revealWidth?: number;
}

export const useSwipe = ({ onSwipeLeft, onSwipeRight, threshold = 80, revealWidth = 140 }: SwipeConfig) => {
    const elementRef = useRef<HTMLDivElement>(null);
    const [translateX, setTranslateX] = useState(0);
    const [isRevealed, setIsRevealed] = useState(false);
    const [isAnimating, setIsAnimating] = useState(false);
    
    const startX = useRef(0);
    const currentX = useRef(0);
    const isSwiping = useRef(false);

    useEffect(() => {
        const element = elementRef.current;
        if (!element) return;

        const handleTouchStart = (e: TouchEvent) => {
            if (isAnimating) return;
            startX.current = e.touches[0].clientX;
            isSwiping.current = true;
            element.style.transition = 'none';
        };

        const handleTouchMove = (e: TouchEvent) => {
            if (!isSwiping.current || isAnimating) return;
            currentX.current = e.touches[0].clientX;
            const deltaX = currentX.current - startX.current;
            
            // Allow left swipe to reveal, and right swipe for action
            if (deltaX < 0) { // Swiping left
                const newTranslateX = isRevealed ? deltaX - revealWidth : deltaX;
                setTranslateX(Math.max(newTranslateX, -revealWidth - 20)); // Allow overswipe
            } else if (deltaX > 0 && !isRevealed) { // Swiping right
                 setTranslateX(Math.min(deltaX, threshold + 20)); // Allow overswipe
            }
        };

        const handleTouchEnd = () => {
            if (!isSwiping.current || isAnimating) return;
            isSwiping.current = false;
            const deltaX = currentX.current - startX.current;
            
            element.style.transition = 'transform 0.3s ease';
            setIsAnimating(true);
            setTimeout(() => setIsAnimating(false), 300);

            if (deltaX < -threshold) { // Swipe left complete
                setTranslateX(-revealWidth);
                setIsRevealed(true);
                onSwipeLeft?.();
            } else if (deltaX > threshold && !isRevealed) { // Swipe right complete
                setTranslateX(threshold); // Show feedback
                setTimeout(() => {
                    onSwipeRight?.();
                    setTranslateX(0); // Animate back after action
                }, 300);
            } else { // Swipe cancelled
                setTranslateX(0);
                setIsRevealed(false);
            }
        };
        
        const handleClickOutside = (e: MouseEvent) => {
            if (isRevealed && element && !element.contains(e.target as Node)) {
                setIsAnimating(true);
                setTimeout(() => setIsAnimating(false), 300);
                setTranslateX(0);
                setIsRevealed(false);
            }
        };

        element.addEventListener('touchstart', handleTouchStart, { passive: true });
        element.addEventListener('touchmove', handleTouchMove, { passive: true });
        element.addEventListener('touchend', handleTouchEnd);
        document.addEventListener('click', handleClickOutside);

        return () => {
            element.removeEventListener('touchstart', handleTouchStart);
            element.removeEventListener('touchmove', handleTouchMove);
            element.removeEventListener('touchend', handleTouchEnd);
            document.removeEventListener('click', handleClickOutside);
        };
    }, [isRevealed, onSwipeLeft, onSwipeRight, threshold, revealWidth, isAnimating]);
    
    const style: CSSProperties = {
        transform: `translateX(${translateX}px)`,
    };

    return { ref: elementRef, style, isRevealed };
};
