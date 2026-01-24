import { motion } from "framer-motion";
import { Check, PartyPopper } from "lucide-react";

interface SuccessStateProps {
  onComplete: () => void;
}

export const SuccessState = ({ onComplete }: SuccessStateProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="flex flex-col items-center justify-center h-full"
    >
      {/* Confetti Placeholder */}
      <motion.div
        className="relative mb-6"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 15 }}
      >
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
          <Check className="w-10 h-10 text-primary-foreground" />
        </div>
        
        {/* Confetti particles */}
        {[...Array(12)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-2 rounded-full"
            style={{
              background: i % 2 === 0 ? "hsl(192 91% 55%)" : "hsl(270 60% 60%)",
              top: "50%",
              left: "50%",
            }}
            initial={{ x: 0, y: 0, opacity: 1 }}
            animate={{
              x: Math.cos((i * 30 * Math.PI) / 180) * 60,
              y: Math.sin((i * 30 * Math.PI) / 180) * 60,
              opacity: 0,
            }}
            transition={{ duration: 0.8, delay: 0.2 }}
          />
        ))}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="text-center"
      >
        <div className="flex items-center justify-center gap-2 mb-2">
          <PartyPopper className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">Page Morphed!</h3>
        </div>
        <p className="text-muted-foreground text-sm mb-6">
          Your page has been transformed successfully
        </p>
        <motion.button
          onClick={onComplete}
          className="px-6 py-2 rounded-lg bg-muted hover:bg-muted/80 transition-colors text-sm"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          Continue
        </motion.button>
      </motion.div>
    </motion.div>
  );
};
