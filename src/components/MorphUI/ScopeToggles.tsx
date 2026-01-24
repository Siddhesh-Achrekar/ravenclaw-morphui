import { motion } from "framer-motion";
import { useState } from "react";

export const ScopeToggles = () => {
  const [activeOnSite, setActiveOnSite] = useState(true);
  const [global, setGlobal] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      className="flex gap-2 mb-6"
    >
      <button
        onClick={() => setActiveOnSite(!activeOnSite)}
        className={`pill-toggle ${activeOnSite ? "active" : "inactive"}`}
      >
        🟢 Active on this site
      </button>
      <button
        onClick={() => setGlobal(!global)}
        className={`pill-toggle ${global ? "active" : "inactive"}`}
      >
        ⚪ Global
      </button>
    </motion.div>
  );
};
