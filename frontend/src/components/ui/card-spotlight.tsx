"use client";

import { useMotionValue, motion, useMotionTemplate } from "motion/react";
import {
  useEffect,
  useRef,
  useState,
  type HTMLAttributes,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { CanvasRevealEffect } from "@/components/ui/canvas-reveal-effect";
import { cn } from "@/lib/utils";

const isFinePointer = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(hover: hover) and (pointer: fine)").matches;

export const CardSpotlight = ({
  children,
  radius = 350,
  color = "#262626",
  className,
  ...props
}: {
  radius?: number;
  color?: string;
  children: ReactNode;
} & HTMLAttributes<HTMLDivElement>) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const touchTimer = useRef<number | null>(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const [isHovering, setIsHovering] = useState(false);
  const [isCoarse, setIsCoarse] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(hover: hover) and (pointer: fine)");
    const sync = () => setIsCoarse(!mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  // Soft centered ambient mask on touch devices (no sticky hover)
  useEffect(() => {
    if (!isCoarse || !rootRef.current) return;
    const { width, height } = rootRef.current.getBoundingClientRect();
    mouseX.set(width * 0.38);
    mouseY.set(height * 0.42);
  }, [isCoarse, mouseX, mouseY]);

  useEffect(() => {
    return () => {
      if (touchTimer.current) window.clearTimeout(touchTimer.current);
    };
  }, []);

  function handleMouseMove({
    currentTarget,
    clientX,
    clientY,
  }: ReactMouseEvent<HTMLDivElement>) {
    if (!isFinePointer()) return;
    const { left, top } = currentTarget.getBoundingClientRect();
    mouseX.set(clientX - left);
    mouseY.set(clientY - top);
  }

  const handleMouseEnter = () => {
    if (!isFinePointer()) return;
    setIsHovering(true);
  };

  const handleMouseLeave = () => {
    if (!isFinePointer()) return;
    setIsHovering(false);
  };

  const handlePointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "mouse") return;
    const { left, top } = e.currentTarget.getBoundingClientRect();
    mouseX.set(e.clientX - left);
    mouseY.set(e.clientY - top);
    setIsHovering(true);
    if (touchTimer.current) window.clearTimeout(touchTimer.current);
    touchTimer.current = window.setTimeout(() => {
      setIsHovering(false);
      touchTimer.current = null;
    }, 1400);
  };

  const maskImage = useMotionTemplate`
    radial-gradient(
      ${radius}px circle at ${mouseX}px ${mouseY}px,
      white,
      transparent 80%
    )
  `;

  // Desktop: only on hover. Mobile: soft ambient always + full on tap.
  const layerOpacity = isHovering ? 1 : isCoarse ? 0.38 : 0;
  const showCanvas = isHovering;

  return (
    <div
      ref={rootRef}
      className={cn(
        "group/spotlight p-10 rounded-md relative border border-neutral-800 bg-black dark:border-neutral-800",
        className
      )}
      {...props}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onPointerDown={handlePointerDown}
    >
      <motion.div
        className="pointer-events-none absolute z-0 -inset-px rounded-[inherit]"
        initial={false}
        animate={{ opacity: layerOpacity }}
        transition={{ duration: 0.3 }}
        style={{
          backgroundColor: color,
          maskImage,
          WebkitMaskImage: maskImage,
        }}
      >
        {showCanvas && (
          <CanvasRevealEffect
            animationSpeed={5}
            containerClassName="bg-transparent absolute inset-0 pointer-events-none"
            colors={[
              [34, 211, 238],
              [59, 130, 246],
            ]}
            opacities={[0.45, 0.45, 0.45, 0.65, 0.65, 0.65, 0.9, 0.9, 0.9, 1]}
            dotSize={3}
            showGradient={false}
          />
        )}
      </motion.div>
      {children}
    </div>
  );
};
