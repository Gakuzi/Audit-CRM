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
            currentX.current = e.touches[0].clientX;
            isSwiping.current = true;
            element.style.transition = 'none';
        };

        const handleTouchMove = (e: TouchEvent) => {
            if (!isSwiping.current || isAnimating) return;
            currentX.current = e.touches[0].clientX;
            const deltaX = currentX.current - startX.current;
            
            if (deltaX > 0) { // Swiping right
                const newTranslateX = isRevealed === 'right' ? deltaX - rightRevealWidth : deltaX;
                setTranslateX(leftRevealWidth > 0 ? Math.min(newTranslateX, leftRevealWidth + 20) : Math.min(newTranslateX, threshold + 20));
            } 
            else if (deltaX < 0) { // Swiping left
                const newTranslateX = isRevealed === 'left' ? deltaX + leftRevealWidth : deltaX;
                setTranslateX(rightRevealWidth > 0 ? Math.max(newTranslateX, -rightRevealWidth - 20) : Math.max(newTranslateX, -threshold - 20));
            }
        };

        const handleTouchEnd = () => {
            if (!isSwiping.current || isAnimating) return;
            isSwiping.current = false;
            const deltaX = currentX.current - startX.current;
            
            element.style.transition = 'transform 0.3s ease';
            setIsAnimating(true);
            setTimeout(() => setIsAnimating(false), 300);

            if (deltaX > threshold) { // Right swipe
                if (leftRevealWidth > 0 && !isRevealed) {
                    onSwipeRightAction?.();
                }
                setTranslateX(0);
                setIsRevealed(false);
            } 
            else if (deltaX < -threshold) { // Left swipe
                if (rightRevealWidth > 0) {
                    setTranslateX(-rightRevealWidth);
                    setIsRevealed('right');
                } else {
                    onSwipeLeftAction?.();
                    setTranslateX(0);
                    setIsRevealed(false);
                }
            } 
            else { // No action, return to original state
                setTranslateX(isRevealed === 'left' ? leftRevealWidth : isRevealed === 'right' ? -rightRevealWidth : 0);
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
        touchAction: 'pan-y',
    };

    return { ref: elementRef, style, isRevealed };
};
