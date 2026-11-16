/**
 * Exposure card (UI spec §3.3): red while no session key exists — the owner
 * EOA's ECDSA key has been public since its first transaction, so a quantum
 * adversary can harvest ciphertexts today. Flips to mint-tinted MITIGATED once
 * spend authorization is ML-DSA-44, with the V9 residual dual-sig note kept.
 */
export function ExposureCard({ hasKey }: { hasKey: boolean }) {
  if (hasKey) {
    return (
      <section className="v2-panel v2-exposure v2-exposure-ok" aria-label="Exposure status">
        <p className="v2-kicker">EXPOSURE</p>
        <strong>MITIGATED</strong>
        <p>spend authorization now ML-DSA-44 (V9 residual dual-sig remains).</p>
      </section>
    );
  }
  return (
    <section className="v2-panel v2-exposure v2-exposure-bad" aria-label="Exposure status">
      <p className="v2-kicker">EXPOSURE</p>
      <strong>EXPOSED</strong>
      <p>harvest-now-decrypt-later risk active — owner EOA's ECDSA pubkey has been public since its first transaction.</p>
    </section>
  );
}
