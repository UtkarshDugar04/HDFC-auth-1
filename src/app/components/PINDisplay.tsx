import { motion, AnimatePresence } from "motion/react";

interface PINDisplayProps {
  pin: number[];
  revealDigits: boolean;
  appStatus: string;
}

export function PINDisplay({ pin, revealDigits, appStatus }: PINDisplayProps) {
  const isSuccess = appStatus === "success";
  const isError = appStatus === "error";

  return (
    <div
      style={{ display: "flex", gap: 16, justifyContent: "center" }}
      role="status"
      aria-live="polite"
      aria-atomic="true"
      aria-label={`PIN: ${pin.length} of 4 digits entered`}
    >
      {[0, 1, 2, 3].map((i) => {
        const filled = i < pin.length;
        return (
          <div
            key={i}
            style={{
              width: 60,
              height: 60,
              borderRadius: 12,
              border: `3px solid ${isError ? "#dc2626" : "#1a1a1a"}`,
              backgroundColor: filled
                ? isSuccess
                  ? "#1a1a1a"
                  : "#1a1a1a"
                : "transparent",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: filled && revealDigits ? 22 : 26,
              color: "#f7f7f7",
              fontWeight: 700,
              transition: "background-color 0.15s ease, border-color 0.2s ease",
              flexShrink: 0,
              position: "relative",
              overflow: "hidden",
            }}
            aria-hidden="true"
          >
            <AnimatePresence mode="wait">
              {filled ? (
                <motion.span
                  key={`filled-${i}`}
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -20, opacity: 0 }}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  style={{ display: "block", lineHeight: 1 }}
                >
                  {revealDigits ? String(pin[i]) : "●"}
                </motion.span>
              ) : (
                <motion.span
                  key={`empty-${i}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.2 }}
                  exit={{ opacity: 0 }}
                  style={{
                    display: "block",
                    fontSize: 14,
                    color: "#1a1a1a",
                    fontWeight: 400,
                    letterSpacing: 1,
                  }}
                >
                  ___
                </motion.span>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
