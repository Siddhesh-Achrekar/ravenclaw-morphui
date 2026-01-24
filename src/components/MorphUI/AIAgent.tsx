import { motion } from "framer-motion";
import { FileText, MessageCircle } from "lucide-react";

export const AIAgent = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.35 }}
      className="mb-6"
    >
      <h3 className="text-sm font-medium text-muted-foreground mb-3">AI Agent</h3>
      <div className="grid grid-cols-2 gap-3">
        <motion.button
          className="glass p-3 rounded-xl flex items-center gap-2 hover:border-secondary/50 transition-all"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <FileText className="w-4 h-4 text-secondary" />
          <span className="text-sm">Summarize Page</span>
        </motion.button>
        <motion.button
          className="glass p-3 rounded-xl flex items-center gap-2 hover:border-secondary/50 transition-all"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <MessageCircle className="w-4 h-4 text-secondary" />
          <span className="text-sm">Chat / Q&A</span>
        </motion.button>
      </div>
    </motion.div>
  );
};
