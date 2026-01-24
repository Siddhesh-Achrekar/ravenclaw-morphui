import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";

interface FloatingActionButtonProps {
  onClick: () => void;
  isOpen: boolean;
}

export const FloatingActionButton = ({ onClick, isOpen }: FloatingActionButtonProps) => {
  return (
    <motion.button
      onClick={onClick}
      className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full btn-hero flex items-center justify-center"
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
      animate={{
        rotate: isOpen ? 45 : 0,
        boxShadow: isOpen 
          ? "0 4px 20px hsl(270 60% 60% / 0.5)" 
          : "0 4px 20px hsl(192 91% 55% / 0.4)",
      }}
      transition={{ type: "spring", stiffness: 400, damping: 17 }}
    >
      <Sparkles className="w-6 h-6" />
    </motion.button>
  );
};
