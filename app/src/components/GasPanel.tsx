import evidenceJson from "../data/demoEvidence.json";
import { formatGas } from "../lib/format";

const MEASURED = Number(evidenceJson.gas.measuredVerify.replaceAll(",", ""));
const CANONICAL_BUDGET = 100_000;
const ALT_LIMITS = [3_200_000, 6_500_000];
const pct = (part: number, whole: number) => Math.max(0, Math.min(100, (part / whole) * 100));

/**
 * Canonical lane: measured 2,664,784 vs ~100k budget → bar caps, red overshoot
 * flag. Alt-mempool lanes: declared VERIFY limits 3.2M / 6.5M with the amber
 * "gas is not the blocker" tag (UI spec §3.2).
 */
export function GasPanel() {
  const overshoot = (MEASURED / CANONICAL_BUDGET).toFixed(1);
  return (
    <section className="v2-panel" aria-label="Gas panel">
      <header className="v2-panel-head">
        <div>
          <p className="v2-kicker">GAS</p>
          <h3>Verify cost vs mempool budgets</h3>
        </div>
      </header>
      <div className="v2-gaslane">
        <div className="v2-gaslane-head">
          <span>CANONICAL MEMPOOL</span>
          <span className="v2-num">{formatGas(MEASURED)} vs {formatGas(CANONICAL_BUDGET)} budget</span>
        </div>
        <div className="v2-gasbar" role="img" aria-label={`Canonical budget ${formatGas(CANONICAL_BUDGET)} exceeded by measured verify cost ${formatGas(MEASURED)}`}>
          <i className="v2-gasbar-fill-red" style={{ width: "100%" }} />
          <i className="v2-gasbar-tick" style={{ left: `${pct(CANONICAL_BUDGET, MEASURED)}%` }} aria-hidden="true" />
        </div>
        <p className="v2-note-red">overshoot — ~{overshoot}× the MAX_VERIFY_GAS budget</p>
      </div>
      {ALT_LIMITS.map((limit) => (
        <div className="v2-gaslane" key={limit}>
          <div className="v2-gaslane-head">
            <span>ALT-MEMPOOL · DECLARED {formatGas(limit)}</span>
            <span className="v2-num">{pct(MEASURED, limit).toFixed(1)}%</span>
          </div>
          <div className="v2-gasbar" role="img" aria-label={`Verify cost ${formatGas(MEASURED)} fills ${pct(MEASURED, limit).toFixed(1)}% of the declared ${formatGas(limit)} limit`}>
            <i className="v2-gasbar-fill-violet" style={{ width: `${pct(MEASURED, limit)}%` }} />
          </div>
        </div>
      ))}
      <span className="v2-chip v2-chip-amber" style={{ marginTop: 10 }}>recorded OOG at 3.2M / 6.5M — gas isn't the blocker</span>
      <p className="v2-note-amber">recorded Out Of Gas at this limit — gas is not the current blocker; gateway validation is</p>
    </section>
  );
}
