import { motion } from "motion/react";
import type { AppSettings } from "../App";

interface SettingsPanelProps {
  settings: AppSettings;
  onSettingsChange: (s: AppSettings) => void;
  onClose: () => void;
  vibrationSupported: boolean;
}

interface ToggleRowProps {
  label: string;
  description: string;
  value: boolean;
  onChange: () => void;
  id: string;
}

function ToggleRow({ label, description, value, onChange, id }: ToggleRowProps) {
  return (
    <label
      htmlFor={id}
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "14px 0",
        borderBottom: "1px solid #f3f4f6",
        cursor: "pointer",
        gap: 16,
      }}
    >
      <div style={{ flex: 1 }}>
        <p
          style={{
            fontSize: 15,
            fontWeight: 500,
            color: "#111",
            margin: 0,
            lineHeight: 1.4,
          }}
        >
          {label}
        </p>
        <p
          style={{
            fontSize: 12,
            color: "#9ca3af",
            marginTop: 2,
            margin: "2px 0 0",
            lineHeight: 1.4,
          }}
        >
          {description}
        </p>
      </div>

      {/* Toggle switch */}
      <div style={{ flexShrink: 0 }}>
        <input
          type="checkbox"
          id={id}
          checked={value}
          onChange={onChange}
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
          aria-checked={value}
          role="switch"
        />
        <div
          aria-hidden="true"
          style={{
            width: 48,
            height: 26,
            borderRadius: 13,
            backgroundColor: value ? "#000" : "#d1d5db",
            position: "relative",
            transition: "background-color 0.2s ease",
            cursor: "pointer",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 3,
              left: value ? 25 : 3,
              width: 20,
              height: 20,
              borderRadius: "50%",
              backgroundColor: "#fff",
              transition: "left 0.2s ease",
              boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
            }}
          />
        </div>
      </div>
    </label>
  );
}

export function SettingsPanel({
  settings,
  onSettingsChange,
  onClose,
  vibrationSupported,
}: SettingsPanelProps) {
  const toggle = (key: keyof AppSettings) => {
    onSettingsChange({ ...settings, [key]: !settings[key] });
  };

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          backgroundColor: "rgba(0,0,0,0.45)",
          zIndex: 40,
        }}
        aria-hidden="true"
      />

      {/* Panel */}
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 320 }}
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          maxWidth: 430,
          margin: "0 auto",
          backgroundColor: "#fff",
          borderRadius: "20px 20px 0 0",
          padding: "20px 24px 40px",
          zIndex: 50,
          boxShadow: "0 -4px 32px rgba(0,0,0,0.12)",
        }}
        role="dialog"
        aria-label="Settings panel"
        aria-modal="true"
      >
        {/* Handle */}
        <div
          style={{
            width: 36,
            height: 4,
            borderRadius: 2,
            backgroundColor: "#d1d5db",
            margin: "0 auto 20px",
          }}
          aria-hidden="true"
        />

        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 8,
          }}
        >
          <h2
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: "#111",
              margin: 0,
            }}
          >
            Settings
          </h2>
          <button
            onClick={onClose}
            aria-label="Close settings"
            style={{
              width: 36,
              height: 36,
              borderRadius: "50%",
              border: "1px solid #e5e7eb",
              backgroundColor: "transparent",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 16,
              color: "#6b7280",
              flexShrink: 0,
            }}
          >
            ✕
          </button>
        </div>

        {/* Accessibility section */}
        <p
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: "#9ca3af",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            margin: "16px 0 0",
          }}
        >
          Accessibility
        </p>

        <ToggleRow
          id="setting-tutorial"
          label="Tutorial Mode"
          description="Reads each vibration count aloud for first-time users"
          value={settings.tutorialMode}
          onChange={() => toggle("tutorialMode")}
        />
        <ToggleRow
          id="setting-reveal"
          label="Reveal Digits"
          description="Show entered digits instead of masked dots"
          value={settings.revealDigits}
          onChange={() => toggle("revealDigits")}
        />
        {!vibrationSupported && (
          <ToggleRow
            id="setting-audio"
            label="Audio Click Fallback"
            description="Play click sounds when vibration is unavailable"
            value={settings.audioFallback}
            onChange={() => toggle("audioFallback")}
          />
        )}

        {/* Security section */}
        <p
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: "#9ca3af",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            margin: "20px 0 0",
          }}
        >
          Security
        </p>

        <ToggleRow
          id="setting-random"
          label="Randomized Start Offset"
          description="Count starts at random position each hold — resists timing attacks"
          value={settings.randomStart}
          onChange={() => toggle("randomStart")}
        />

        {/* Developer section */}
        <p
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: "#9ca3af",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            margin: "20px 0 0",
          }}
        >
          Developer
        </p>

        <ToggleRow
          id="setting-devmode"
          label="Developer Mode"
          description="Show live count indicator above the hold button"
          value={settings.devMode}
          onChange={() => toggle("devMode")}
        />

        {/* Vibration status */}
        <div
          style={{
            marginTop: 24,
            padding: "12px 16px",
            borderRadius: 10,
            backgroundColor: vibrationSupported ? "#f0fdf4" : "#fef9f0",
            border: `1px solid ${vibrationSupported ? "#bbf7d0" : "#fde68a"}`,
          }}
        >
          <p
            style={{
              fontSize: 13,
              color: vibrationSupported ? "#166534" : "#92400e",
              margin: 0,
              textAlign: "center",
            }}
          >
            {vibrationSupported
              ? "✓ Haptic vibration is supported on this device"
              : "⚠ Vibration not available — using audio fallback"}
          </p>
        </div>

        {/* Test button - Always show for debugging */}
        <button
          onClick={() => {
            if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
              const success = navigator.vibrate(200);
              alert("Vibration command sent! Browser accepted it: " + success);
            } else {
              alert("navigator.vibrate is NOT available on this device/browser.");
            }
          }}
          style={{
            width: "100%",
            marginTop: 16,
            padding: "12px",
            borderRadius: 10,
            backgroundColor: "#111",
            color: "#fff",
            fontWeight: 600,
            border: "none",
            cursor: "pointer"
          }}
        >
          Test Haptic Pulse
        </button>
      </motion.div>
    </>
  );
}
