import { useEffect, useState } from "react";

/**
 * Passphrase modal for keyfile export/import (UI spec §3.3) — replaces v1's
 * `window.prompt`. Export mode asks passphrase + confirm and warns on weak
 * passphrases; import mode asks one passphrase. Errors render inline in red.
 */
export function PassphraseModal({ mode, busy, error, onCancel, onSubmit }: {
  mode: "export" | "import";
  busy: boolean;
  error: string | null;
  onCancel: () => void;
  onSubmit: (passphrase: string) => void;
}) {
  const [pass, setPass] = useState("");
  const [confirm, setConfirm] = useState("");
  const weak = pass.length > 0 && pass.length < 12;
  const mismatch = mode === "export" && confirm.length > 0 && confirm !== pass;

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") onCancel(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  return (
    <div className="v2-modal-backdrop" onClick={(event) => { if (event.target === event.currentTarget) onCancel(); }}>
      <div className="v2-modal" role="dialog" aria-modal="true" aria-label={mode === "export" ? "Encrypt keyfile" : "Decrypt keyfile"}>
        <p className="v2-kicker">KEYFILE</p>
        <h3>{mode === "export" ? "Encrypt keyfile" : "Decrypt keyfile"}</h3>
        <div className="v2-field">
          <label htmlFor="v2-pass">Passphrase</label>
          <input
            id="v2-pass" type="password" className="v2-input" autoComplete="new-password"
            value={pass} onChange={(event) => setPass(event.target.value)} disabled={busy} autoFocus
          />
        </div>
        {mode === "export" && (
          <div className="v2-field">
            <label htmlFor="v2-pass-confirm">Confirm passphrase</label>
            <input
              id="v2-pass-confirm" type="password" className="v2-input" autoComplete="new-password"
              value={confirm} onChange={(event) => setConfirm(event.target.value)} disabled={busy}
              aria-invalid={mismatch}
            />
            {mismatch && <p className="v2-error" role="alert">passphrases do not match</p>}
          </div>
        )}
        {weak && <p className="v2-note-amber">weak passphrase — the keccak-stretch KDF is demo-grade and easily brute-forced; use a long phrase.</p>}
        {mode === "export" && <p className="v2-caption">Demo-grade keccak-stretch encryption. Fine for this demo; never store real funds behind this keyfile.</p>}
        {error && <p className="v2-error" role="alert">{error}</p>}
        <div className="v2-modal-actions">
          <button type="button" className="button-quiet" onClick={onCancel} disabled={busy}>Cancel</button>
          <button
            type="button" className="button-primary" disabled={busy || pass.length === 0 || mismatch}
            onClick={() => onSubmit(pass)}
          >
            {busy ? "Working…" : mode === "export" ? "Encrypt & download" : "Decrypt & import"}
          </button>
        </div>
      </div>
    </div>
  );
}
