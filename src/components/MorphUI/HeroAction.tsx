import { motion } from "framer-motion";
import { Sparkles, Shield } from "lucide-react";
import { useState } from "react";
import { Switch } from "@/components/ui/switch";

interface HeroActionProps {
  onMorph: () => void;
  isLoading: boolean;
}

export const HeroAction = ({ onMorph, isLoading }: HeroActionProps) => {
  const [safeMode, setSafeMode] = useState(true);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.2 }}
      className="mb-6"
    >
      <motion.button
        onClick={onMorph}
        disabled={isLoading}
        className="w-full py-4 rounded-xl btn-hero text-lg flex items-center justify-center gap-3 relative overflow-hidden"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
          initial={{ x: "-100%" }}
          animate={{ x: isLoading ? "100%" : "-100%" }}
          transition={{ duration: 1, repeat: isLoading ? Infinity : 0 }}
        />
        <Sparkles className="w-5 h-5" />
        <span>{isLoading ? "Morphing..." : "Morph This Page"}</span>
      </motion.button>

      <div className="flex items-center justify-between mt-3 px-1">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Shield className="w-4 h-4" />
          <span>Safe Mode (Protect Forms)</span>
        </div>
        <Switch checked={safeMode} onCheckedChange={setSafeMode} />
      </div>
    </motion.div>
  );
};
