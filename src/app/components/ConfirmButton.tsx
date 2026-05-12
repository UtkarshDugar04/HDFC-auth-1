import { useState, useRef, useCallback, useEffect } from "react";

const CONFIRM_HOLD_MS = 1000;
const BUTTON_SIZE = 64;
const RADIUS = 26;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

interface ConfirmButtonProps {
  onConfirm: () => void;
  disabled: boolean;
  vibrationSupported: boolean;
}

export function ConfirmButton({
  onConfirm,
  disabled,
  vibrationSupported,
}: ConfirmButtonProps) {
  const [progress, setProgress] = useState(0); // 0–1
  const [isHolding, setIsHolding] = useState(false);

  const isPressedRef = useRef(false);
  const startTimeRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const completedRef = useRef(false);

  const tick = useCallback(() => {
    if (!isPressedRef.current) return;
    const elapsed = Date.now() - startTimeRef.current;
    const prog = Math.min(elapsed / CONFIRM_HOLD_MS, 1);
    setProgress(prog);

    if (prog >= 1 && !completedRef.current) {
      completedRef.current = true;
      isPressedRef.current = false;
      setIsHolding(false);
      setProgress(0);
      onConfirm();
      try {
        if (vibrationSupported && navigator.vibrate) {
          navigator.vibrate([80, 40, 120]);
        }
      } catch {
        /* ignore */
      }
      return;
    }

    rafRef.current = requestAnimationFrame(tick);
  }, [onConfirm, vibrationSupported]);

  const tickRef = useRef(tick);
  tickRef.current = tick;

  const startHold = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      e.preventDefault();
      if (disabled || isPressedRef.current) return;

      isPressedRef.current = true;
      completedRef.current = false;
      startTimeRef.current = Date.now();
      setIsHolding(true);
      setProgress(0);

      rafRef.current = requestAnimationFrame(() => tickRef.current());
    },
    [disabled]
  );

  const endHold = useCallback((e?: React.MouseEvent | React.TouchEvent) => {
    if (e && e.cancelable) e.preventDefault();
    if (!isPressedRef.current) return;
    isPressedRef.current = false;

    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    setIsHolding(false);
    setProgress(0);
  }, []);

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const strokeDashoffset = CIRCUMFERENCE * (1 - progress);

  return (
    <div
      style={{ position: "relative", width: BUTTON_SIZE, height: BUTTON_SIZE }}
    >
      {/* Progress ring */}
      <svg
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          transform: "rotate(-90deg)",
          pointerEvents: "none",
        }}
        width={BUTTON_SIZE}
        height={BUTTON_SIZE}
        aria-hidden="true"
      >
        {/* Track */}
        <circle
          cx={BUTTON_SIZE / 2}
          cy={BUTTON_SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth={3}
        />
        {/* Fill */}
        <circle
          cx={BUTTON_SIZE / 2}
          cy={BUTTON_SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke="#1a1a1a"
          strokeWidth={3}
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.04s linear" }}
        />
      </svg>

      {/* Button */}
      <button
        aria-label="Submit PIN. Hold for one second to confirm."
        onMouseDown={startHold}
        onMouseUp={endHold}
        onMouseLeave={endHold}
        onTouchStart={startHold}
        onTouchEnd={endHold}
        onTouchCancel={endHold}
        onContextMenu={(e) => e.preventDefault()}
        disabled={disabled}
        aria-disabled={disabled}
        style={{
          position: "absolute",
          top: 4,
          left: 4,
          width: BUTTON_SIZE - 8,
          height: BUTTON_SIZE - 8,
          borderRadius: "50%",
          border: "none",
          backgroundColor: isHolding
            ? `hsl(0, 0%, ${Math.max(0, 100 - progress * 100)}%)`
            : "transparent",
          color: progress > 0.55 ? "#f7f7f7" : "#1a1a1a",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: disabled ? "not-allowed" : "default",
          touchAction: "none",
          WebkitTapHighlightColor: "transparent",
          opacity: disabled ? 0.2 : 1,
          transition: "background-color 0.04s linear, color 0.1s ease",
          userSelect: "none",
          WebkitUserSelect: "none",
          WebkitTouchCallout: "none",
          outline: "none",
        }}
      >
        <span
          style={{ fontSize: 20, lineHeight: 1, display: "block" }}
          aria-hidden="true"
        >
          ✓
        </span>
      </button>
    </div>
  );
}
