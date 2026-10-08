"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";

type Direction = "forward" | "backward";
type SlideState = "idle" | "entering" | "active" | "exit";

interface PageTransitionContextType {
  navigateTo: (href: string, direction?: Direction) => void;
  slideState: SlideState;
  direction: Direction;
}

const PageTransitionContext = createContext<PageTransitionContextType>({
  navigateTo: () => {},
  slideState: "idle",
  direction: "forward",
});

export const PageTransitionProvider = ({ children }: { children: ReactNode }) => {
  const router = useRouter();
  const currentPathname = usePathname();
  const [slideState, setSlideState] = useState<SlideState>("idle");
  const [direction, setDirection] = useState<Direction>("forward");

  const navigateTo = useCallback(
    (href: string, navDirection?: Direction) => {
      if (slideState !== "idle") return;

      const isCurrentlyAnimePage = currentPathname?.startsWith("/anime/");
      const isTargetAnimePage = href.startsWith("/anime/");
      
      const dir: Direction =
        navDirection ||
        (isCurrentlyAnimePage && !isTargetAnimePage ? "backward" : "forward");

      setDirection(dir);
      setSlideState("entering");

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setSlideState("active");
        });
      });

      setTimeout(() => {
        router.push(href);

        setTimeout(() => {
          setSlideState("exit");
          setTimeout(() => {
            setSlideState("idle");
          }, 380);
        }, 150);
      }, 350);
    },
    [router, slideState, currentPathname]
  );

  // Escuchar navegación "Atrás" del navegador
  useEffect(() => {
    const handlePopState = () => {
      if (slideState !== "idle") return;
      setDirection("backward");
      setSlideState("entering");

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setSlideState("active");
        });
      });

      setTimeout(() => {
        setSlideState("exit");
        setTimeout(() => {
          setSlideState("idle");
        }, 380);
      }, 350);
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [slideState]);

  // Interceptador global de clics para enlaces
  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const anchor = target.closest("a");
      if (!anchor) return;

      const href = anchor.getAttribute("href");
      if (
        href &&
        !href.startsWith("#") &&
        !href.startsWith("http") &&
        !e.metaKey &&
        !e.ctrlKey &&
        !e.shiftKey &&
        !e.altKey &&
        anchor.target !== "_blank"
      ) {
        const isCurrentlyAnime = currentPathname?.startsWith("/anime/");
        const isTargetAnime = href.startsWith("/anime/");
        const isTargetSearch = href.startsWith("/buscar");

        if (isCurrentlyAnime || isTargetAnime || isTargetSearch) {
          e.preventDefault();
          e.stopPropagation();
          const dir: Direction = isCurrentlyAnime && !isTargetAnime ? "backward" : "forward";
          navigateTo(href, dir);
        }
      }
    };

    document.addEventListener("click", handleGlobalClick, true);
    return () => document.removeEventListener("click", handleGlobalClick, true);
  }, [navigateTo, currentPathname]);

  const getTransformClass = () => {
    if (direction === "forward") {
      if (slideState === "entering") return "translate-x-full";
      if (slideState === "active") return "translate-x-0";
      if (slideState === "exit") return "-translate-x-full";
    } else {
      if (slideState === "entering") return "-translate-x-full";
      if (slideState === "active") return "translate-x-0";
      if (slideState === "exit") return "translate-x-full";
    }
    return "translate-x-full";
  };

  return (
    <PageTransitionContext.Provider value={{ navigateTo, slideState, direction }}>
      {children}

      {/* OVERLAY SLIDE TIPO POWERPOINT PUSH (ADELANTE Y ATRÁS) */}
      {slideState !== "idle" && (
        <div
          className={`fixed inset-0 z-[9999] w-screen h-screen bg-neutral-100 dark:bg-neutral-950 transition-transform duration-350 ease-[cubic-bezier(0.16,1,0.3,1)] pointer-events-none border-x border-neutral-300 dark:border-neutral-800 shadow-2xl flex items-center justify-center ${getTransformClass()}`}
        >
          <div className="flex items-center gap-3 text-purple-600 dark:text-purple-400 font-extrabold text-xs tracking-widest uppercase">
            <span className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></span>
            {direction === "backward" ? "Volviendo..." : "Cargando anime..."}
          </div>
        </div>
      )}
    </PageTransitionContext.Provider>
  );
};

export const usePageTransition = () => useContext(PageTransitionContext);
