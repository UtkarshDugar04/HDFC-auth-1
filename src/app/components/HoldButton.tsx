import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";

const PULSE_INTERVAL_MS = 700;
const MAX_COUNT = 10;

export interface HoldButtonProps {
  onDigitEntered: (digit: number) => void;
  disabled: boolean;
  tutorialMode: boolean;
  randomStart: boolean;
  devMode: boolean;
  vibrationSupported: boolean;
  audioFallback: boolean;
}

// Singleton AudioContext
let audioCtx: AudioContext | null = null;

function getAudioCtx(): AudioContext | null {
  try {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext)();
    }
    return audioCtx;
  } catch {
    return null;
  }
}

function playTone(
  freq: number,
  duration: number,
  volume = 0.22,
  startOffset = 0
) {
  const ctx = getAudioCtx();
  if (!ctx) return;
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, ctx.currentTime + startOffset);
    osc.frequency.exponentialRampToValueAtTime(
      freq * 0.25,
      ctx.currentTime + startOffset + duration
    );
    gain.gain.setValueAtTime(volume, ctx.currentTime + startOffset);
    gain.gain.exponentialRampToValueAtTime(
      0.001,
      ctx.currentTime + startOffset + duration
    );
    osc.start(ctx.currentTime + startOffset);
    osc.stop(ctx.currentTime + startOffset + duration + 0.01);
  } catch {
    /* ignore */
  }
}

function playClickSound() {
  playTone(700, 0.08);
}

function playConfirmSound() {
  playTone(900, 0.07, 0.28);
  playTone(1200, 0.07, 0.28, 0.13);
}

function playDeleteSound() {
  playTone(300, 0.16, 0.2);
}

export function HoldButton({
  onDigitEntered,
  disabled,
  tutorialMode,
  randomStart,
  devMode,
  vibrationSupported,
  audioFallback,
}: HoldButtonProps) {
  const [isHolding, setIsHolding] = useState(false);
  const [currentCount, setCurrentCount] = useState(0);
  const [pulseKey, setPulseKey] = useState(0);
  const [buttonScale, setButtonScale] = useState(1);
  const [buttonLightness, setButtonLightness] = useState(100);
  const [scaleHasTransition, setScaleHasTransition] = useState(false);

  const countRef = useRef(0);
  const isPressedRef = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pulseResetRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const vibrate = useCallback(
    (pattern: number | number[]) => {
      try {
        if (vibrationSupported && navigator.vibrate) {
          navigator.vibrate(pattern);
        } else if (audioFallback) {
          playClickSound();
        }
      } catch {
        /* ignore */
      }
    },
    [vibrationSupported, audioFallback]
  );

  const speak = useCallback(
    (text: string) => {
      if (!tutorialMode) return;
      if (!("speechSynthesis" in window)) return;
      try {
        window.speechSynthesis.cancel();
        const utt = new SpeechSynthesisUtterance(text);
        utt.rate = 1.4;
        utt.volume = 1;
        window.speechSynthesis.speak(utt);
      } catch {
        /* ignore */
      }
    },
    [tutorialMode]
  );

  // Keep latest refs for use inside setInterval
  const vibrateRef = useRef(vibrate);
  const speakRef = useRef(speak);
  vibrateRef.current = vibrate;
  speakRef.current = speak;

  const doPulse = useCallback(() => {
    countRef.current = (countRef.current % MAX_COUNT) + 1;
    const count = countRef.current;

    setCurrentCount(count);
    setPulseKey((k) => k + 1);

    // Snap scale down instantly
    setScaleHasTransition(false);
    setButtonScale(0.84);

    if (pulseResetRef.current) clearTimeout(pulseResetRef.current);
    pulseResetRef.current = setTimeout(() => {
      // Smooth spring back to hold-scale
      setScaleHasTransition(true);
      setButtonScale(Math.max(0.94, 1 - count * 0.004));
      setButtonLightness(Math.max(68, 100 - count * 3.2));
    }, 90);

    vibrateRef.current(100);
    speakRef.current(String(count === MAX_COUNT ? 0 : count));
  }, []);

  const doPulseRef = useRef(doPulse);
  doPulseRef.current = doPulse;

  const startHold = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      e.preventDefault();
      if (disabled || isPressedRef.current) return;

      isPressedRef.current = true;
      setIsHolding(true);
      setButtonLightness(100);

      // Optionally start at random offset
      countRef.current = randomStart
        ? Math.floor(Math.random() * MAX_COUNT)
        : 0;

      // First pulse immediately
      doPulseRef.current();

      // Then at fixed interval
      intervalRef.current = setInterval(() => {
        doPulseRef.current();
      }, PULSE_INTERVAL_MS);
    },
    [disabled, randomStart]
  );

  const endHold = useCallback(() => {
    if (!isPressedRef.current) return;
    isPressedRef.current = false;

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (pulseResetRef.current) {
      clearTimeout(pulseResetRef.current);
      pulseResetRef.current = null;
    }

    const count = countRef.current;

    setIsHolding(false);
    setScaleHasTransition(true);
    setButtonScale(1);
    setButtonLightness(100);
    setCurrentCount(0);
    countRef.current = 0;

    if (count === 0) return;

    const digit = count === MAX_COUNT ? 0 : count;
    onDigitEntered(digit);

    // Confirmation feedback
    try {
      if (vibrationSupported && navigator.vibrate) {
        navigator.vibrate([80, 50, 80]);
      } else if (audioFallback) {
        playConfirmSound();
      }
    } catch {
      /* ignore */
    }

    speakRef.current(`Digit ${digit} entered`);
  }, [onDigitEntered, vibrationSupported, audioFallback]);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (pulseResetRef.current) clearTimeout(pulseResetRef.current);
    };
  }, []);

  const displayDigit =
    currentCount === 0
      ? ""
      : currentCount === MAX_COUNT
        ? "0"
        : String(currentCount);

  const bgColor = `hsl(0, 0%, ${buttonLightness}%)`;

  const transitionStyle = [
    "background-color 0.2s ease",
    scaleHasTransition ? "transform 0.18s ease" : "",
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <div
      style={{
        position: "relative",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: 180,
        height: 180,
      }}
    >
      {/* Dev counter */}
      {devMode && (
        <div
          style={{
            position: "absolute",
            top: -34,
            left: "50%",
            transform: "translateX(-50%)",
            fontSize: 11,
            fontFamily: "monospace",
            color: "#9ca3af",
            whiteSpace: "nowrap",
            pointerEvents: "none",
            background: "#f9fafb",
            padding: "2px 8px",
            borderRadius: 4,
            border: "1px solid #e5e7eb",
          }}
          aria-hidden="true"
        >
          {currentCount > 0
            ? `count: ${currentCount}  →  digit: ${currentCount === MAX_COUNT ? 0 : currentCount}`
            : "waiting…"}
        </div>
      )}

      {/* Ripple ring 1 — main pulse */}
      <AnimatePresence>
        {isHolding && (
          <motion.div
            key={`r1-${pulseKey}`}
            initial={{ scale: 1, opacity: 0.55 }}
            animate={{ scale: 1.75, opacity: 0 }}
            exit={{}}
            transition={{ duration: 0.65, ease: "easeOut" }}
            style={{
              position: "absolute",
              width: 160,
              height: 160,
              borderRadius: "50%",
              border: "2.5px solid rgba(0,0,0,0.35)",
              pointerEvents: "none",
            }}
            aria-hidden="true"
          />
        )}
      </AnimatePresence>

      {/* Ripple ring 2 — trailing */}
      <AnimatePresence>
        {isHolding && pulseKey > 1 && (
          <motion.div
            key={`r2-${pulseKey}`}
            initial={{ scale: 1.1, opacity: 0.3 }}
            animate={{ scale: 2.1, opacity: 0 }}
            exit={{}}
            transition={{ duration: 0.9, ease: "easeOut" }}
            style={{
              position: "absolute",
              width: 160,
              height: 160,
              borderRadius: "50%",
              border: "1.5px solid rgba(0,0,0,0.15)",
              pointerEvents: "none",
            }}
            aria-hidden="true"
          />
        )}
      </AnimatePresence>

      {/* Subtle count number shown inside circle for sighted users */}
      <AnimatePresence mode="wait">
        {isHolding && displayDigit && (
          <motion.div
            key={`digit-${displayDigit}`}
            initial={{ opacity: 0, scale: 1.35 }}
            animate={{ opacity: 0.16, scale: 1 }}
            exit={{ opacity: 0, scale: 0.75, transition: { duration: 0.1 } }}
            transition={{ duration: 0.12 }}
            style={{
              position: "absolute",
              fontSize: 72,
              fontWeight: 900,
              color: "#000",
              letterSpacing: "-0.04em",
              pointerEvents: "none",
              userSelect: "none",
              zIndex: 2,
            }}
            aria-hidden="true"
          >
            {displayDigit}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main hold button */}
      <button
        aria-label="TouchPIN input button. Press and hold to choose a digit. Each vibration pulse counts up one number from 1 to 9, then 0 on the tenth. Release when your desired digit count is reached."
        role="button"
        aria-pressed={isHolding}
        aria-disabled={disabled}
        onMouseDown={startHold}
        onMouseUp={endHold}
        onMouseLeave={endHold}
        onTouchStart={startHold}
        onTouchEnd={endHold}
        onTouchCancel={endHold}
        onContextMenu={(e) => e.preventDefault()}
        disabled={disabled}
        style={{
          width: 160,
          height: 160,
          borderRadius: "50%",
          border: "4px solid #000",
          backgroundColor: bgColor,
          cursor: disabled ? "not-allowed" : "default",
          outline: "none",
          userSelect: "none",
          WebkitUserSelect: "none",
          touchAction: "none",
          WebkitTapHighlightColor: "transparent",
          opacity: disabled ? 0.2 : 1,
          transform: `scale(${buttonScale})`,
          transition: transitionStyle,
          position: "relative",
          zIndex: 1,
          flexShrink: 0,
        }}
      >
        <span
          style={{
            position: "absolute",
            width: 1,
            height: 1,
            padding: 0,
            margin: -1,
            overflow: "hidden",
            clip: "rect(0,0,0,0)",
            whiteSpace: "nowrap",
            border: 0,
          }}
        >
          {isHolding
            ? `Currently at count ${currentCount === MAX_COUNT ? 0 : currentCount}`
            : "Press and hold to enter digit"}
        </span>
      </button>
    </div>
  );
}

// Export helpers for use in App
export { playDeleteSound, playTone };
