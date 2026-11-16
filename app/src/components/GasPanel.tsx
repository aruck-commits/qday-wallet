import { motion, useReducedMotion } from "framer-motion";
import evidenceJson from "../data/demoEvidence.json";
import { formatGas } from "../lib/format";

const MEASURED = Number(evidenceJson.gas.measuredVerify.replaceAll(",", ""));
const CANONICAL_BUDGET = 100_000;
const ALT_LIMITS = [3_200_000, 6_500_000];
const pct = (part: number, whole: number) => Math.max(0, Math.min(100, (part / whole) * 100));

const fill = { hidden: { scaleX: 0 }, show: { scaleX: 1 } };

/**
 * GasPanel (UI spec §3.4): kicker `GAS / VERIFY COST VS MEMPOOL BUDGETS`.
 * Three flat 10px bars — canonical lane red full-width fill + mint tick at
 * ~3.7% + the overshoot note; alt lanes violet at 83.3% / 41.0%. Bars animate
 * width ONCE on populate (500ms ease-out), never loop. The amber line stays
 * as a footnote caption — gas is not the current blocker; gateway validation
 * is. `open`/`onToggle` optional (SendScreen passes them only on <768).
 */
export function GasPanel({ open, onToggle }: { open?: boolean; onToggle?: () => void }) {
  const reduce = useReducedMotion() ?? false;
  const overshoot = (MEASURED / CANONICAL_BUDGET).toFixed(1);
  const expanded = onToggle === undefined ? true : open ?? false;

  return (
    <section className="v2-panel" aria-label="Gas panel">
      <header className="v2-panel-head">
        <div>
          <p className="v2-kicker">GAS / VERIFY COST VS MEMPOOL BUDGETS</p>
          <h3>Gas panel</h3>
        </div>
        {onToggle && (
          <button type="button" className="button-quiet" onClick={onToggle} aria-expanded={expanded} aria-label="Toggle gas panel">{expanded ? "hide" : "show"}</button>
        )}
      </header>
      {expanded && (
        <motion.div initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: reduce ? 0 : 0.06 } } }}>
          <motion.div className="v2-gaslane" variants={{ hidden: { opacity: 0 }, show: { opacity: 1 } }}>
            <div className="v2-gaslane-head">
              <span>CANONICAL MEMPOOL</span>
              <span className="v2-num">{formatGas(MEASURED)} vs {formatGas(CANONICAL_BUDGET)} budget</span>
            </div>
            <div className="v2-gasbar" role="img" aria-label={`Canonical budget ${formatGas(CANONICAL_BUDGET)} exceeded by measured verify cost ${formatGas(MEASURED)}`}>
              <motion.i
                className="v3-gasfill v2-gasbar-fill-red"
                style={{ width: "100%" }}
                variants={fill}
                transition={reduce ? { duration: 0 } : { duration: 0.5, ease: "easeOut" }}
              />
              <i className="v2-gasbar-tick" style={{ left: `${pct(CANONICAL_BUDGET, MEASURED)}%` }} aria-hidden="true" />
            </div>
            <p className="v2-note-red">overshoot — ~{overshoot}× the MAX_VERIFY_GAS budget</p>
          </motion.div>
          {ALT_LIMITS.map((limit) => (
            <motion.div className="v2-gaslane" key={limit} variants={{ hidden: { opacity: 0 }, show: { opacity: 1 } }}>
              <div className="v2-gaslane-head">
                <span>ALT-MEMPOOL · DECLARED {formatGas(limit)}</span>
                <span className="v2-num">{pct(MEASURED, limit).toFixed(1)}%</span>
              </div>
              <div className="v2-gasbar" role="img" aria-label={`Verify cost ${formatGas(MEASURED)} fills ${pct(MEASURED, limit).toFixed(1)}% of the declared ${formatGas(limit)} limit`}>
                <motion.i
                  className="v3-gasfill v2-gasbar-fill-violet"
                  style={{ width: `${pct(MEASURED, limit)}%` }}
                  variants={fill}
                  transition={reduce ? { duration: 0 } : { duration: 0.5, ease: "easeOut" }}
                />
              </div>
            </motion.div>
          ))}
          <p className="v2-note-amber">recorded Out Of Gas at both limits — gas is not the current blocker; gateway validation is.</p>
        </motion.div>
      )}
    </section>
  );
}
