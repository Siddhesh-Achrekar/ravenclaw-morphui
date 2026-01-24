import { motion } from "framer-motion";
import { X } from "lucide-react";

interface HeaderProps {
  onClose: () => void;
}

export const Header = ({ onClose }: HeaderProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="flex items-center justify-between mb-4"
    >
      <h1 className="text-2xl font-bold gradient-text">MorphUI</h1>
      <button
        onClick={onClose}
        className="w-8 h-8 rounded-lg bg-muted hover:bg-muted/80 flex items-center justify-center transition-colors"
      >
        <X className="w-4 h-4 text-muted-foreground" />
      </button>
    </motion.div>
  );
};
