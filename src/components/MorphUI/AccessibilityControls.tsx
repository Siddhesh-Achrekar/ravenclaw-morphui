import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Settings } from "lucide-react";
import { useState } from "react";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const AccessibilityControls = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [dyslexiaFont, setDyslexiaFont] = useState(false);
  const [highContrast, setHighContrast] = useState(false);
  const [colorBlindness, setColorBlindness] = useState("none");

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="mb-6"
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full glass p-3 rounded-xl flex items-center justify-between hover:border-primary/30 transition-all"
      >
        <div className="flex items-center gap-2">
          <Settings className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium">Accessibility Controls</span>
        </div>
        <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        </motion.div>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="pt-3 space-y-3">
              <div className="glass p-3 rounded-lg flex items-center justify-between">
                <span className="text-sm">Dyslexia Font</span>
                <Switch checked={dyslexiaFont} onCheckedChange={setDyslexiaFont} />
              </div>

              <div className="glass p-3 rounded-lg flex items-center justify-between">
                <span className="text-sm">High Contrast</span>
                <Switch checked={highContrast} onCheckedChange={setHighContrast} />
              </div>

              <div className="glass p-3 rounded-lg flex items-center justify-between">
                <span className="text-sm">Color Blindness</span>
                <Select value={colorBlindness} onValueChange={setColorBlindness}>
                  <SelectTrigger className="w-32 h-8 bg-muted border-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-glass-border">
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="protanopia">Protanopia</SelectItem>
                    <SelectItem value="deuteranopia">Deuteranopia</SelectItem>
                    <SelectItem value="tritanopia">Tritanopia</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
