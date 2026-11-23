import { useEffect, useRef, useState } from "react";

export function useScrollDirectionHeader(keepVisible = false) {
  const [isVisible, setIsVisible] = useState(true);
  const headerRef = useRef<HTMLElement>(null);
  const lastScrollYRef = useRef(0);

  useEffect(() => {
    lastScrollYRef.current = window.scrollY;

    function handleScroll() {
      const currentY = Math.max(0, window.scrollY);
      const movement = currentY - lastScrollYRef.current;
      const shouldStayVisible = keepVisible
        || currentY <= 12
        || Boolean(headerRef.current?.contains(document.activeElement));

      if (shouldStayVisible) {
        setIsVisible(true);
        lastScrollYRef.current = currentY;
      } else if (movement >= 6) {
        setIsVisible(false);
        lastScrollYRef.current = currentY;
      } else if (movement <= -6) {
        setIsVisible(true);
        lastScrollYRef.current = currentY;
      }
    }

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [keepVisible]);

  return { headerRef, isVisible };
}
