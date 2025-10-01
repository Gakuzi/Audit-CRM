import { useRef, useEffect, useState, CSSProperties } from 'react';

interface SwipeConfig {
    onSwipeLeftAction?: () => void;
    onSwipeRightAction?: () => void;
    leftRevealWidth?: number;
    rightRevealWidth?: number;
    threshold?: number;
}

export const useSwipe = ({ 
    onSwipeLeftAction, 
    onSwipeRightAction, 
    leftRevealWidth = 0, 
    rightRevealWidth = 0, 
    threshold = 60 
}: SwipeConfig) => {
    const elementRef = useRef<HTMLDivElement>(null);
    const [translateX, setTranslateX] = useState(0);
    const [isRevealed, setIsRevealed] = useState<'left' | 'right' | false>(false);
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
            currentX.current = e.touches[0].clientX; // Reset currentX
            isSwiping.current = true;
            element.style.transition = 'none';
        };

        const handleTouchMove = (e: TouchEvent) => {
            if (!isSwiping.current || isAnimating) return;
            currentX.current = e.touches[0].clientX;
            const deltaX = currentX.current - startX.current;
            
            // Swiping right (revealing left content)
            if (deltaX > 0) {
                const newTranslateX = isRevealed === 'right' ? deltaX - rightRevealWidth : deltaX;
                if (leftRevealWidth > 0) {
                    setTranslateX(Math.min(newTranslateX, leftRevealWidth + 20)); // Allow overswipe
                } else {
                    setTranslateX(Math.min(newTranslateX, threshold + 20));
                }
            } 
            // Swiping left (revealing right content)
            else if (deltaX < 0) {
                const newTranslateX = isRevealed === 'left' ? deltaX + leftRevealWidth : deltaX;
                 if (rightRevealWidth > 0) {
                    setTranslateX(Math.max(newTranslateX, -rightRevealWidth - 20)); // Allow overswipe
                } else {
                    setTranslateX(Math.max(newTranslateX, -threshold - 20));
                }
            }
        };

        const handleTouchEnd = () => {
            if (!isSwiping.current || isAnimating) return;
            isSwiping.current = false;
            const deltaX = currentX.current - startX.current;
            
            element.style.transition = 'transform 0.3s ease';
            setIsAnimating(true);
            setTimeout(() => setIsAnimating(false), 300);

            // Check for right swipe
            if (deltaX > threshold) {
                if (leftRevealWidth > 0) {
                    setTranslateX(leftRevealWidth);
                    setIsRevealed('left');
                } else {
                    onSwipeRightAction?.();
                    setTranslateX(0); // Animate back after action
                    setIsRevealed(false);
                }
            } 
            // Check for left swipe
            else if (deltaX < -threshold) {
                if (rightRevealWidth > 0) {
                    setTranslateX(-rightRevealWidth);
                    setIsRevealed('right');
                } else {
                    onSwipeLeftAction?.();
                    setTranslateX(0); // Animate back after action
                    setIsRevealed(false);
                }
            } 
            // No swipe action, return to original state
            else {
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
    }, [isRevealed, leftRevealWidth, rightRevealWidth, onSwipeLeftAction, onSwipeRightAction, threshold, isAnimating]);
    
    const style: CSSProperties = {
        transform: `translateX(${translateX}px)`,
    };

    return { ref: elementRef, style, isRevealed };
};