import { motion } from "framer-motion";
import { Coffee, Eye, Terminal, Smile } from "lucide-react";
import { useState } from "react";

const modes = [
  { id: "easy-read", name: "Easy Read", description: "Simple & Clean", icon: Coffee },
  { id: "focus", name: "Focus Mode", description: "No Distractions", icon: Eye },
  { id: "power", name: "Power Mode", description: "Dense Data", icon: Terminal },
  { id: "kids", name: "Kids Mode", description: "Fun & Colorful", icon: Smile },
];

export const ModeGrid = () => {
  const [selectedMode, setSelectedMode] = useState("easy-read");

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25 }}
      className="mb-6"
    >
      <h3 className="text-sm font-medium text-muted-foreground mb-3">Mode Selection</h3>
      <div className="grid grid-cols-2 gap-3">
        {modes.map((mode, index) => (
          <motion.button
            key={mode.id}
            onClick={() => setSelectedMode(mode.id)}
            className={`mode-card text-left ${selectedMode === mode.id ? "active" : ""}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 + index * 0.05 }}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.98 }}
          >
            <mode.icon className={`w-5 h-5 mb-2 ${selectedMode === mode.id ? "text-primary" : "text-muted-foreground"}`} />
            <div className={`font-medium text-sm ${selectedMode === mode.id ? "text-foreground" : "text-muted-foreground"}`}>
              {mode.name}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">{mode.description}</div>
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
};
