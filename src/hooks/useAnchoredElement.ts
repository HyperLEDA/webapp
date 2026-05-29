import { RefObject, useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";

const HIGHLIGHT_DURATION_MS = 2000;

export function useAnchoredElement(id: string): {
  ref: RefObject<HTMLDivElement | null>;
  highlighted: boolean;
} {
  const ref = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const [highlighted, setHighlighted] = useState(false);
  const highlightTimeoutRef = useRef<number | undefined>(undefined);
  const pageHashRef = useRef({ pathname: "", initialHash: "" });

  if (pageHashRef.current.pathname !== location.pathname) {
    pageHashRef.current = {
      pathname: location.pathname,
      initialHash: location.hash,
    };
  }

  const activate = useCallback((scroll: boolean) => {
    window.clearTimeout(highlightTimeoutRef.current);
    setHighlighted(true);
    if (scroll) {
      ref.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
    highlightTimeoutRef.current = window.setTimeout(
      () => setHighlighted(false),
      HIGHLIGHT_DURATION_MS,
    );
  }, []);

  useEffect(() => {
    if (!id || location.hash.slice(1) !== id) return undefined;

    const scroll =
      location.hash === pageHashRef.current.initialHash &&
      pageHashRef.current.initialHash !== "";
    const timer = window.setTimeout(() => activate(scroll), 0);
    return () => window.clearTimeout(timer);
  }, [location.hash, location.pathname, id, activate]);

  useEffect(() => () => window.clearTimeout(highlightTimeoutRef.current), []);

  return { ref, highlighted };
}
