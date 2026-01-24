import { motion } from "framer-motion";

export const LoadingState = () => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col items-center justify-center h-full"
    >
      {/* Skeleton Loader */}
      <div className="w-full space-y-4 mb-8">
        <div className="h-8 w-32 skeleton-shimmer rounded-lg" />
        <div className="h-4 w-full skeleton-shimmer rounded-lg" />
        <div className="h-4 w-3/4 skeleton-shimmer rounded-lg" />
        <div className="h-12 w-full skeleton-shimmer rounded-xl mt-6" />
        <div className="grid grid-cols-2 gap-3 mt-4">
          <div className="h-20 skeleton-shimmer rounded-xl" />
          <div className="h-20 skeleton-shimmer rounded-xl" />
          <div className="h-20 skeleton-shimmer rounded-xl" />
          <div className="h-20 skeleton-shimmer rounded-xl" />
        </div>
      </div>

      <motion.p
        className="text-muted-foreground text-sm"
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        AI is rewriting reality...
      </motion.p>
    </motion.div>
  );
};
