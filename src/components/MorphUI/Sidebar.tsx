import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { Header } from "./Header";
import { ScopeToggles } from "./ScopeToggles";
import { HeroAction } from "./HeroAction";
import { ModeGrid } from "./ModeGrid";
import { AIAgent } from "./AIAgent";
import { AccessibilityControls } from "./AccessibilityControls";
import { Footer } from "./Footer";
import { LoadingState } from "./LoadingState";
import { SuccessState } from "./SuccessState";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

type ViewState = "default" | "loading" | "success";

export const Sidebar = ({ isOpen, onClose }: SidebarProps) => {
  const [viewState, setViewState] = useState<ViewState>("default");
  const [progress, setProgress] = useState(35);

  const handleMorph = () => {
    setViewState("loading");
    setTimeout(() => {
      setViewState("success");
    }, 2500);
  };

  const handleSuccessComplete = () => {
    setViewState("default");
    setProgress(Math.min(progress + 15, 100));
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/50 backdrop-blur-sm z-40"
            onClick={onClose}
          />

          {/* Sidebar */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed right-0 top-0 h-screen w-[400px] max-w-[90vw] z-50 glass-strong p-6 flex flex-col"
            style={{
              boxShadow: "-10px 0 40px hsl(222 47% 4% / 0.5)",
            }}
          >
            <AnimatePresence mode="wait">
              {viewState === "loading" && (
                <LoadingState key="loading" />
              )}

              {viewState === "success" && (
                <SuccessState key="success" onComplete={handleSuccessComplete} />
              )}

              {viewState === "default" && (
                <motion.div
                  key="default"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col h-full min-h-0"
                >
                  <Header onClose={onClose} />
                  <div className="flex-1 overflow-y-auto scrollbar-morph pr-1 min-h-0">
                    <ScopeToggles />
                    <HeroAction onMorph={handleMorph} isLoading={false} />
                    <ModeGrid />
                    <AIAgent />
                    <AccessibilityControls />
                  </div>
                  <Footer progress={progress} />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
