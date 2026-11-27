"use client";

import { useState, useEffect, useCallback, RefObject } from "react";

export type DropdownPosition = {
  top?: number;
  bottom?: number;
  left: number;
  width: number;
  maxListHeight: number;
};

/**
 * Computes viewport-clamped fixed coordinates for a portaled dropdown menu
 * so it never clips inside overflow-auto modals or overflows mobile screens.
 */
export function useDropdownPosition(
  isOpen: boolean,
  triggerRef: RefObject<HTMLElement | null>,
  menuRef: RefObject<HTMLElement | null>,
  minWidth = 300,
) {
  const [position, setPosition] = useState<DropdownPosition | null>(null);

  const updatePosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const margin = 12;
    const searchHeaderReserve = 68;

    const isMobile = vw < 640;
    const width = isMobile
      ? vw - margin * 2
      : Math.min(Math.max(rect.width, minWidth), vw - margin * 2);

    const left = isMobile
      ? margin
      : Math.min(Math.max(rect.left, margin), vw - width - margin);

    const spaceBelow = vh - rect.bottom - margin;
    const spaceAbove = rect.top - margin;

    if (spaceBelow >= 220 || spaceBelow >= spaceAbove) {
      setPosition({
        top: rect.bottom + 6,
        left,
        width,
        maxListHeight: Math.max(140, Math.min(300, spaceBelow - searchHeaderReserve)),
      });
    } else {
      setPosition({
        bottom: vh - rect.top + 6,
        left,
        width,
        maxListHeight: Math.max(140, Math.min(300, spaceAbove - searchHeaderReserve)),
      });
    }
  }, [triggerRef, minWidth]);

  useEffect(() => {
    if (!isOpen) {
      setPosition(null);
      return;
    }

    updatePosition();

    const handleScroll = (event: Event) => {
      // Ignore scrolls originating inside the dropdown menu itself
      if (menuRef.current && menuRef.current.contains(event.target as Node)) {
        return;
      }
      updatePosition();
    };

    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", handleScroll, true);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", handleScroll, true);
    };
  }, [isOpen, updatePosition, menuRef]);

  return position;
}
