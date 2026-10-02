"use client";
import {
  useState,
  useEffect,
  type ElementType,
  type HTMLAttributes,
  type PointerEvent,
  type ReactNode,
} from "react";
import { createElement } from "react";

import { motion } from "motion/react";
import { cn } from "@/lib/utils";

type Direction = "TOP" | "LEFT" | "BOTTOM" | "RIGHT";

const isFinePointer = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(hover: hover) and (pointer: fine)").matches;

export function HoverBorderGradient({
  children,
  containerClassName,
  className,
  as: Tag = "button",
  duration = 1,
  clockwise = true,
  ...props
}: {
  children?: ReactNode;
  as?: ElementType;
  containerClassName?: string;
  className?: string;
  duration?: number;
  clockwise?: boolean;
} & HTMLAttributes<HTMLElement>) {
  const [hovered, setHovered] = useState<boolean>(false);
  const [touchActive, setTouchActive] = useState<boolean>(false);
  const [direction, setDirection] = useState<Direction>("TOP");

  const active = hovered || touchActive;

  useEffect(() => {
    if (active) return;

    const directions: Direction[] = ["TOP", "LEFT", "BOTTOM", "RIGHT"];
    const interval = setInterval(() => {
      setDirection((prevState) => {
        const currentIndex = directions.indexOf(prevState);
        const nextIndex = clockwise
          ? (currentIndex - 1 + directions.length) % directions.length
          : (currentIndex + 1) % directions.length;
        return directions[nextIndex];
      });
    }, duration * 1000);

    return () => clearInterval(interval);
  }, [active, duration, clockwise]);

  // Brief touch highlight — auto-clears without sticky hover or timer refs
  useEffect(() => {
    if (!touchActive) return;
    const id = window.setTimeout(() => setTouchActive(false), 1100);
    return () => window.clearTimeout(id);
  }, [touchActive]);

  const handleMouseEnter = () => {
    if (isFinePointer()) setHovered(true);
  };

  const handleMouseLeave = () => {
    setHovered(false);
  };

  const handlePointerDown = (e: PointerEvent<HTMLElement>) => {
    if (e.pointerType === "mouse") return;
    setTouchActive(true);
  };

  const movingMap: Record<Direction, string> = {
    TOP: "radial-gradient(20.7% 50% at 50% 0%, rgba(103, 232, 249, 0.85) 0%, rgba(34, 211, 238, 0) 100%)",
    LEFT: "radial-gradient(16.6% 43.1% at 0% 50%, rgba(96, 165, 250, 0.8) 0%, rgba(59, 130, 246, 0) 100%)",
    BOTTOM:
      "radial-gradient(20.7% 50% at 50% 100%, rgba(34, 211, 238, 0.75) 0%, rgba(34, 211, 238, 0) 100%)",
    RIGHT:
      "radial-gradient(16.2% 41.2% at 100% 50%, rgba(56, 189, 248, 0.8) 0%, rgba(14, 165, 233, 0) 100%)",
  };

  const highlight =
    "radial-gradient(75% 181.15942028985506% at 50% 50%, #22d3ee 0%, rgba(37, 99, 235, 0) 100%)";

  return createElement(
    Tag,
    {
      ...props,
      onMouseEnter: handleMouseEnter,
      onMouseLeave: handleMouseLeave,
      onPointerDown: handlePointerDown,
      className: cn(
        "relative flex rounded-full border content-center bg-black/20 hover:bg-black/10 transition duration-500 dark:bg-white/20 items-center flex-col flex-nowrap gap-10 h-min justify-center overflow-visible p-px decoration-clone w-fit",
        containerClassName
      ),
    },
    <div
      className={cn(
        "relative z-10 w-auto rounded-[inherit] bg-black px-4 py-2 text-white",
        className
      )}
    >
      {children}
    </div>,
    <motion.div
      className={cn(
        "pointer-events-none absolute inset-0 z-0 flex-none overflow-hidden rounded-[inherit]"
      )}
      style={{
        filter: "blur(2px)",
        position: "absolute",
        width: "100%",
        height: "100%",
      }}
      initial={{ background: movingMap[direction] }}
      animate={{
        background: active
          ? [movingMap[direction], highlight]
          : movingMap[direction],
      }}
      transition={{ ease: "linear", duration: duration ?? 1 }}
    />,
    <div className="pointer-events-none absolute inset-[2px] z-[1] flex-none rounded-[inherit] bg-[rgba(13,21,38,0.98)]" />
  );
}
