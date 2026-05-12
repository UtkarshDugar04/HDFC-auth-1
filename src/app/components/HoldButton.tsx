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
    if (audioCtx.state === "suspended") {
      audioCtx.resume();
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
  devMode, // keeping prop to avoid breaking App.tsx, but will ignore visually
  vibrationSupported,
  audioFallback,
}: HoldButtonProps) {
  const [isHolding, setIsHolding] = useState(false);

  const countRef = useRef(0);
  const isPressedRef = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pulseResetRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const doAudioPulse = useCallback(() => {
    try {
      if (!vibrationSupported && audioFallback) {
        playClickSound();
      }
    } catch {
      /* ignore */
    }
  }, [vibrationSupported, audioFallback]);

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
  const audioPulseRef = useRef(doAudioPulse);
  const speakRef = useRef(speak);
  audioPulseRef.current = doAudioPulse;
  speakRef.current = speak;

  const doPulse = useCallback(() => {
    countRef.current += 1;
    const count = countRef.current;

    audioPulseRef.current();
    speakRef.current(String(count === MAX_COUNT ? 0 : count));

    // After 10 pulses (digit 0), auto-select and stop
    if (count >= MAX_COUNT) {
      if (endHoldRef.current) {
        endHoldRef.current();
      }
    }
  }, []);

  const doPulseRef = useRef(doPulse);
  doPulseRef.current = doPulse;

  const startHold = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      // Prevent default to stop duplicate mouse events on iOS after touch
      if (e.cancelable) e.preventDefault();
      
      if (disabled || isPressedRef.current) return;

      isPressedRef.current = true;
      setIsHolding(true);

      // Starting at 0 to ensure 1 pulse = digit 1
      countRef.current = 0;

      // Android Chrome workaround: start continuous native vibration pattern
      // to avoid dropping vibrations called inside setInterval
      if (vibrationSupported && navigator.vibrate) {
        try {
          const pattern = [];
          for (let i = 0; i < 40; i++) {
            pattern.push(100);
            pattern.push(PULSE_INTERVAL_MS - 100);
          }
          navigator.vibrate(pattern);
        } catch {}
      }

      // First pulse immediately
      doPulseRef.current();

      // Then at fixed interval
      intervalRef.current = setInterval(() => {
        doPulseRef.current();
      }, PULSE_INTERVAL_MS);
    },
    [disabled, randomStart]
  );

  const endHold = useCallback((e?: React.MouseEvent | React.TouchEvent) => {
    if (e && e.cancelable) e.preventDefault();
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
    countRef.current = 0;

    // Cancel the ongoing continuous vibration pattern
    if (vibrationSupported && navigator.vibrate) {
      try { navigator.vibrate(0); } catch {}
    }

    if (count === 0) return;

    const digit = count === MAX_COUNT ? 0 : count;
    onDigitEntered(digit);
  }, [onDigitEntered, vibrationSupported, audioFallback]);

  const endHoldRef = useRef(endHold);
  endHoldRef.current = endHold;

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (pulseResetRef.current) clearTimeout(pulseResetRef.current);
    };
  }, []);

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
          border: "4px solid #1a1a1a",
          backgroundColor: "#f7f7f7",
          cursor: disabled ? "not-allowed" : "default",
          outline: "none",
          userSelect: "none",
          WebkitUserSelect: "none",
          WebkitTouchCallout: "none",
          touchAction: "none",
          WebkitTapHighlightColor: "transparent",
          opacity: disabled ? 0.2 : 1,
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
            ? "Currently holding..."
            : "Press and hold to enter digit"}
        </span>
      </button>
    </div>
  );
}

// Export helpers for use in App
export { playDeleteSound, playTone };
