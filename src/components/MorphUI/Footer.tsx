import { motion } from "framer-motion";
import { Mic } from "lucide-react";

interface FooterProps {
  progress: number;
}

export const Footer = ({ progress }: FooterProps) => {
  return (
    <div className="mt-auto pt-4">
      {/* Voice Button */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="flex justify-center mb-4"
      >
        <motion.button
          className="w-12 h-12 rounded-full bg-muted flex items-center justify-center"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
        >
          <motion.div
            animate={{
              opacity: [1, 0.7, 1],
              scale: [1, 1.1, 1],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            <Mic className="w-5 h-5 text-primary" />
          </motion.div>
        </motion.button>
      </motion.div>

      {/* Powered By */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.55 }}
        className="text-center text-xs text-muted-foreground mb-3"
      >
        Powered by Gemini 2.5
      </motion.p>

      {/* Reading Progress Bar */}
      <div className="h-1 bg-muted rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{
            background: "linear-gradient(90deg, hsl(192 91% 55%) 0%, hsl(270 60% 60%) 100%)",
          }}
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>
    </div>
  );
};
