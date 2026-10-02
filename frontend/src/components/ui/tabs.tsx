"use client";

import { useState, type ReactNode } from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

type Tab = {
  title: string;
  value: string;
  content?: ReactNode;
};

export const Tabs = ({
  tabs: propTabs,
  containerClassName,
  activeTabClassName,
  tabClassName,
  contentClassName,
}: {
  tabs: Tab[];
  containerClassName?: string;
  activeTabClassName?: string;
  tabClassName?: string;
  contentClassName?: string;
}) => {
  const [active, setActive] = useState<Tab>(propTabs[0]);
  const [tabs, setTabs] = useState<Tab[]>(propTabs);

  const moveSelectedTabToTop = (idx: number) => {
    const newTabs = [...propTabs];
    const selectedTab = newTabs.splice(idx, 1);
    newTabs.unshift(selectedTab[0]);
    setTabs(newTabs);
    setActive(newTabs[0]);
  };

  return (
    <>
      <div
        role="tablist"
        className={cn(
          "flex flex-row items-center justify-start [perspective:1000px] relative overflow-x-auto overflow-y-hidden no-visible-scrollbar max-w-full w-full",
          containerClassName
        )}
      >
        {propTabs.map((tab, idx) => {
          const selected = active.value === tab.value;
          return (
            <button
              key={tab.title}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => {
                moveSelectedTabToTop(idx);
              }}
              className={cn("relative shrink-0 px-4 py-2 rounded-full", tabClassName)}
              style={{
                transformStyle: "preserve-3d",
              }}
            >
              {selected && (
                <motion.div
                  layoutId="clickedbutton"
                  transition={{ type: "spring", bounce: 0.12, duration: 0.4 }}
                  className={cn(
                    "absolute inset-0 bg-gray-200 dark:bg-zinc-800 rounded-full ",
                    activeTabClassName
                  )}
                />
              )}

              <span
                className={cn(
                  "relative block",
                  selected ? "text-[var(--color-ink)]" : "text-[var(--color-ink-muted)]"
                )}
              >
                {tab.title}
              </span>
            </button>
          );
        })}
      </div>
      <FadeInDiv
        tabs={tabs}
        active={active}
        key={active.value}
        className={cn("mt-32", contentClassName)}
      />
    </>
  );
};

export const FadeInDiv = ({
  className,
  tabs,
}: {
  className?: string;
  key?: string;
  tabs: Tab[];
  active: Tab;
  hovering?: boolean;
}) => {
  return (
    <div className="relative w-full">
      {tabs.map((tab, idx) => {
        const activeTab = idx === 0;
        return (
          <motion.div
            key={tab.value}
            role="tabpanel"
            aria-hidden={!activeTab}
            initial={activeTab ? { opacity: 0, y: 8 } : false}
            animate={{ opacity: activeTab ? 1 : 0, y: activeTab ? 0 : 8 }}
            transition={{ duration: 0.28, ease: "easeOut" }}
            className={cn(
              "w-full min-w-0",
              activeTab
                ? "relative"
                : "pointer-events-none absolute inset-x-0 top-0 h-0 overflow-hidden",
              className
            )}
          >
            {tab.content}
          </motion.div>
        );
      })}
    </div>
  );
};
