import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { PINDisplay } from "./components/PINDisplay";
import { HoldButton, playDeleteSound } from "./components/HoldButton";
import { ConfirmButton } from "./components/ConfirmButton";
import { SettingsPanel } from "./components/SettingsPanel";

// Demo PIN — change to test
const DEMO_PIN = [4, 8, 2, 6];
const MAX_ATTEMPTS = 3;
const LOCKOUT_MS = 5000;
const ERROR_RESET_MS = 1600;

export interface AppSettings {
  tutorialMode: boolean;
  randomStart: boolean;
  revealDigits: boolean;
  devMode: boolean;
  audioFallback: boolean;
}

type AppStatus = "idle" | "success" | "error" | "locked";

export default function App() {
  const [pin, setPin] = useState<number[]>([]);
  const [appStatus, setAppStatus] = useState<AppStatus>("idle");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [failCount, setFailCount] = useState(0);
  const [errorKey, setErrorKey] = useState(0); // increments each error to re-trigger shake
  const [lockCountdown, setLockCountdown] = useState(5);

  const [vibrationSupported] = useState<boolean>(() => {
    if (typeof navigator === "undefined") return false;
    return typeof navigator.vibrate === "function";
  });

  const [settings, setSettings] = useState<AppSettings>({
    tutorialMode: false,
    randomStart: false,
    revealDigits: false,
    devMode: false,
    audioFallback: true,
  });

  const statusTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimers = useCallback(() => {
    if (statusTimeoutRef.current) {
      clearTimeout(statusTimeoutRef.current);
      statusTimeoutRef.current = null;
    }
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
  }, []);

  useEffect(() => () => clearTimers(), [clearTimers]);

  const handleDigitEntered = useCallback(
    (digit: number) => {
      if (appStatus !== "idle") return;
      setPin((prev) => {
        if (prev.length >= 4) return prev;
        return [...prev, digit];
      });
    },
    [appStatus]
  );

  const handleDelete = useCallback(() => {
    if (appStatus === "success" || appStatus === "locked") return;
    clearTimers();
    if (appStatus === "error") setAppStatus("idle");
    setPin((prev) => prev.slice(0, -1));
    try {
      if (vibrationSupported && navigator.vibrate) {
        navigator.vibrate(180);
      } else if (settings.audioFallback) {
        playDeleteSound();
      }
    } catch {
      /* ignore */
    }
  }, [appStatus, clearTimers, vibrationSupported, settings.audioFallback]);

  const handleConfirm = useCallback(() => {
    if (pin.length !== 4 || appStatus !== "idle") return;

    const isCorrect = DEMO_PIN.every((d, i) => d === pin[i]);

    if (isCorrect) {
      setAppStatus("success");
      setFailCount(0);
      clearTimers();
      try {
        if (vibrationSupported && navigator.vibrate) {
          navigator.vibrate([100, 50, 100, 50, 200]);
        }
      } catch {
        /* ignore */
      }
    } else {
      const newFail = failCount + 1;
      setFailCount(newFail);
      setErrorKey((k) => k + 1);

      try {
        if (vibrationSupported && navigator.vibrate) {
          navigator.vibrate([200, 100, 200]);
        }
      } catch {
        /* ignore */
      }

      if (newFail >= MAX_ATTEMPTS) {
        setAppStatus("locked");
        setPin([]);
        setLockCountdown(5);
        let cd = 5;
        countdownRef.current = setInterval(() => {
          cd -= 1;
          setLockCountdown(cd);
          if (cd <= 0) {
            clearInterval(countdownRef.current!);
            countdownRef.current = null;
          }
        }, 1000);
        statusTimeoutRef.current = setTimeout(() => {
          setAppStatus("idle");
          setFailCount(0);
        }, LOCKOUT_MS);
      } else {
        setAppStatus("error");
        statusTimeoutRef.current = setTimeout(() => {
          setAppStatus("idle");
          setPin([]);
        }, ERROR_RESET_MS);
      }
    }
  }, [pin, appStatus, failCount, clearTimers, vibrationSupported]);

  const handleReset = useCallback(() => {
    clearTimers();
    setPin([]);
    setAppStatus("idle");
    setFailCount(0);
    setErrorKey(0);
  }, [clearTimers]);

  const isHoldDisabled = pin.length >= 4 || appStatus !== "idle";
  const isConfirmDisabled = pin.length !== 4 || appStatus !== "idle";
  const isDeleteDisabled =
    pin.length === 0 || appStatus === "success" || appStatus === "locked";

  // CSS shake animation triggered by errorKey
  const shakeCSS = `
    @keyframes tp-shake {
      0%, 100% { transform: translateX(0); }
      12%  { transform: translateX(-13px); }
      25%  { transform: translateX(13px); }
      37%  { transform: translateX(-9px); }
      50%  { transform: translateX(9px); }
      62%  { transform: translateX(-5px); }
      75%  { transform: translateX(5px); }
      87%  { transform: translateX(-2px); }
    }
    .tp-shake-${errorKey} {
      animation: tp-shake 0.52s ease-in-out;
    }
    * { -webkit-tap-highlight-color: transparent; }
    .sr-only {
      position: absolute; width: 1px; height: 1px; padding: 0;
      margin: -1px; overflow: hidden; clip: rect(0,0,0,0);
      white-space: nowrap; border: 0;
    }
  `;

  const remainingAttempts = MAX_ATTEMPTS - failCount;

  return (
    <>
      <style>{shakeCSS}</style>
      <div
        style={{
          minHeight: "100dvh",
          backgroundColor: "#fff",
          display: "flex",
          flexDirection: "column",
          maxWidth: 430,
          margin: "0 auto",
          position: "relative",
          overflow: "hidden",
          WebkitUserSelect: "none",
          userSelect: "none",
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
        }}
      >
        {/* ── HEADER ─────────────────────────────────────────── */}
        <header
          style={{
            padding: "44px 32px 20px",
            textAlign: "center",
            flexShrink: 0,
          }}
        >
          <motion.h1
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            style={{
              fontSize: 28,
              fontWeight: 800,
              letterSpacing: "-0.03em",
              color: "#000",
              margin: 0,
            }}
          >
            TouchPIN
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            style={{
              fontSize: 13,
              color: "#9ca3af",
              marginTop: 5,
              margin: "5px 0 0",
            }}
          >
            Secure PIN entry through touch &amp; vibration
          </motion.p>
        </header>

        {/* ── PIN DISPLAY ────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.4 }}
          style={{
            flexShrink: 0,
            padding: "0 32px",
            display: "flex",
            justifyContent: "center",
          }}
        >
          <PINDisplay
            pin={pin}
            revealDigits={settings.revealDigits}
            appStatus={appStatus}
          />
        </motion.div>

        {/* ── STATUS MESSAGE ─────────────────────────────────── */}
        <div
          style={{
            flexShrink: 0,
            height: 64,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "0 32px",
          }}
          role="alert"
          aria-live="assertive"
          aria-atomic="true"
        >
          <AnimatePresence mode="wait">
            {appStatus === "success" && (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                style={{ textAlign: "center" }}
              >
                <p
                  style={{
                    color: "#000",
                    fontWeight: 700,
                    fontSize: 17,
                    margin: 0,
                  }}
                >
                  ✓ &nbsp;Unlocked
                </p>
                <button
                  onClick={handleReset}
                  style={{
                    marginTop: 6,
                    fontSize: 12,
                    color: "#9ca3af",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: "2px 8px",
                    textDecoration: "underline",
                    WebkitTapHighlightColor: "transparent",
                  }}
                  aria-label="Reset PIN entry"
                >
                  Try again
                </button>
              </motion.div>
            )}

            {appStatus === "error" && (
              <motion.p
                key="error"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                style={{
                  color: "#dc2626",
                  fontWeight: 600,
                  fontSize: 14,
                  margin: 0,
                  textAlign: "center",
                }}
              >
                Incorrect PIN — {remainingAttempts} attempt
                {remainingAttempts !== 1 ? "s" : ""} left
              </motion.p>
            )}

            {appStatus === "locked" && (
              <motion.div
                key="locked"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{ textAlign: "center" }}
              >
                <p
                  style={{
                    color: "#dc2626",
                    fontWeight: 700,
                    fontSize: 14,
                    margin: 0,
                  }}
                >
                  🔒 &nbsp;Locked — retry in {lockCountdown}s
                </p>
              </motion.div>
            )}

            {appStatus === "idle" && pin.length === 0 && (
              <motion.p
                key="idle-empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{
                  color: "#d1d5db",
                  fontSize: 13,
                  margin: 0,
                  textAlign: "center",
                  lineHeight: 1.5,
                }}
              >
                Hold the circle · count vibrations · release to enter a digit
              </motion.p>
            )}

            {appStatus === "idle" && pin.length > 0 && pin.length < 4 && (
              <motion.p
                key="idle-partial"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{ color: "#9ca3af", fontSize: 13, margin: 0 }}
              >
                {4 - pin.length} more digit
                {4 - pin.length !== 1 ? "s" : ""} to go
              </motion.p>
            )}

            {appStatus === "idle" && pin.length === 4 && (
              <motion.p
                key="idle-full"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{ color: "#6b7280", fontSize: 13, margin: 0 }}
              >
                Hold ✓ to submit your PIN
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        {/* ── MAIN CONTROLS ──────────────────────────────────── */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "0 24px 24px",
          }}
        >
          {/* Tutorial mode indicator */}
          <AnimatePresence>
            {settings.tutorialMode && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                style={{ overflow: "hidden", marginBottom: 12 }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "6px 14px",
                    borderRadius: 20,
                    backgroundColor: "#f9fafb",
                    border: "1px solid #e5e7eb",
                  }}
                >
                  <span style={{ fontSize: 12 }}>🔊</span>
                  <p
                    style={{
                      fontSize: 12,
                      color: "#6b7280",
                      margin: 0,
                    }}
                    aria-live="polite"
                  >
                    Tutorial Mode — counts spoken aloud
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Shake wrapper — class changes per error to re-trigger CSS animation */}
          <div
            className={appStatus === "error" ? `tp-shake-${errorKey}` : ""}
            style={{ width: "100%" }}
          >
            {/* Control Row: [Delete] [Hold] [Confirm] */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 20,
              }}
              role="group"
              aria-label="PIN entry controls"
            >
              {/* Delete button */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <motion.button
                  whileTap={!isDeleteDisabled ? { scale: 0.88 } : {}}
                  onClick={handleDelete}
                  disabled={isDeleteDisabled}
                  aria-label="Delete last PIN digit"
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: "50%",
                    border: "2.5px solid #000",
                    backgroundColor: "transparent",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: isDeleteDisabled ? "not-allowed" : "pointer",
                    opacity: isDeleteDisabled ? 0.18 : 1,
                    transition: "opacity 0.2s",
                    touchAction: "manipulation",
                    WebkitTapHighlightColor: "transparent",
                    flexShrink: 0,
                  }}
                >
                  <span
                    style={{ fontSize: 22, lineHeight: 1 }}
                    aria-hidden="true"
                  >
                    ⌫
                  </span>
                </motion.button>
                <span
                  style={{
                    fontSize: 10,
                    color: "#9ca3af",
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    fontWeight: 600,
                  }}
                  aria-hidden="true"
                >
                  Delete
                </span>
              </div>

              {/* Hold button */}
              <HoldButton
                onDigitEntered={handleDigitEntered}
                disabled={isHoldDisabled}
                tutorialMode={settings.tutorialMode}
                randomStart={settings.randomStart}
                devMode={settings.devMode}
                vibrationSupported={vibrationSupported}
                audioFallback={settings.audioFallback}
              />

              {/* Confirm button */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <ConfirmButton
                  onConfirm={handleConfirm}
                  disabled={isConfirmDisabled}
                  vibrationSupported={vibrationSupported}
                />
                <span
                  style={{
                    fontSize: 10,
                    color: "#9ca3af",
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    fontWeight: 600,
                  }}
                  aria-hidden="true"
                >
                  Confirm
                </span>
              </div>
            </div>
          </div>

          {/* How-to legend */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.5 }}
            style={{
              marginTop: 36,
              textAlign: "center",
              padding: "0 12px",
            }}
            aria-hidden="true"
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 6,
                color: "#d1d5db",
                fontSize: 12,
                lineHeight: 1.7,
              }}
            >
              <span>
                <strong style={{ color: "#9ca3af" }}>1–9 vibrations</strong> =
                digits 1–9
              </span>
              <span>
                <strong style={{ color: "#9ca3af" }}>10 vibrations</strong> =
                digit 0
              </span>
              <span>Release to enter digit · auto-enters 0 after 10 pulses</span>
            </div>

            {settings.randomStart && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                style={{
                  fontSize: 11,
                  color: "#e5e7eb",
                  marginTop: 8,
                  margin: "8px 0 0",
                }}
              >
                ⚡ Random offset active — count starts after first vibration
              </motion.p>
            )}
          </motion.div>
        </div>

        {/* ── FOOTER ─────────────────────────────────────────── */}
        <footer
          style={{
            flexShrink: 0,
            padding: "0 24px 36px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <p
            style={{ fontSize: 11, color: "#e5e7eb", margin: 0 }}
            aria-hidden="true"
          >
            Demo PIN: 4 8 2 6
          </p>
          <button
            onClick={() => setIsSettingsOpen(true)}
            style={{
              width: 44,
              height: 44,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "50%",
              border: "1.5px solid #e5e7eb",
              backgroundColor: "transparent",
              cursor: "pointer",
              fontSize: 18,
              color: "#9ca3af",
              touchAction: "manipulation",
              WebkitTapHighlightColor: "transparent",
              transition: "border-color 0.2s, color 0.2s",
            }}
            aria-label="Open accessibility and security settings"
          >
            ⚙
          </button>
        </footer>

        {/* ── SETTINGS PANEL ─────────────────────────────────── */}
        <AnimatePresence>
          {isSettingsOpen && (
            <SettingsPanel
              settings={settings}
              onSettingsChange={setSettings}
              onClose={() => setIsSettingsOpen(false)}
              vibrationSupported={vibrationSupported}
            />
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
