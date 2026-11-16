/**
 * Exposure card (UI spec §3.3 / v3 §4): red while no session key exists — the
 * owner EOA's ECDSA key has been public since its first transaction, so a
 * quantum adversary can harvest ciphertexts today. Flips to mint-tinted once
 * spend authorization is ML-DSA-44, with the V9 residual dual-sig note kept.
 * v3: the verdict line is a serif display moment ("Exposed." / "Mitigated.").
 */
export function ExposureCard({ hasKey }: { hasKey: boolean }) {
  if (hasKey) {
    return (
      <section className="v2-panel v2-exposure v2-exposure-ok v3-editorial" aria-label="Exposure status">
        <p className="v2-kicker">EXPOSURE</p>
        <strong className="v3-lead-serif" style={{ color: "var(--mint)" }}>Mitigated.</strong>
        <p>spend authorization now ML-DSA-44 (V9 residual dual-sig remains).</p>
      </section>
    );
  }
  return (
    <section className="v2-panel v2-exposure v2-exposure-bad v3-editorial" aria-label="Exposure status">
      <p className="v2-kicker">EXPOSURE</p>
      <strong className="v3-lead-serif" style={{ color: "var(--red)" }}>Exposed.</strong>
      <p>harvest-now-decrypt-later risk active — owner EOA's ECDSA pubkey has been public since its first transaction.</p>
    </section>
  );
}
