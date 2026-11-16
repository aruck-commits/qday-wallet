import { motion, useReducedMotion } from "framer-motion";

export type RailStage = { id: string; label: string; status: "future" | "active" | "done" };

/**
 * StageRail (UI spec §3.2) — the five-stage Send journey nav: COMPOSE → SIGN
 * → VERIFY → EXECUTE → SETTLE. A 2px spine runs behind the dots; the mint
 * fill extends left→right via scaleX (280ms, --ease-qday) each time a stage
 * completes. Active = amber pulsing dot; done = mint dot + clickable (jumps
 * to its card). `<ol>` + aria-current="step"; done stages are real buttons
 * with mint focus rings.
 */
export function StageRail({ stages, onJump }: { stages: RailStage[]; onJump?: (id: string) => void }) {
  const reduce = useReducedMotion() ?? false;
  const doneCount = stages.filter((stage) => stage.status === "done").length;
  const progress = stages.length > 1 ? doneCount / (stages.length - 1) : 0;

  return (
    <div className="v3-rail" role="navigation" aria-label="Send journey stages">
      <div className="v3-rail-inner">
        <div className="v3-rail-spine" aria-hidden="true">
          <motion.div
            className="v3-rail-spine-fill"
            initial={false}
            animate={{ scaleX: progress }}
            transition={reduce ? { duration: 0 } : { duration: 0.28, ease: [0.23, 1, 0.32, 1] }}
          />
        </div>
        <ol>
          {stages.map((stage) => {
            const content = (
              <>
                <i className="v3-rail-dot" aria-hidden="true" />
                <span className="v3-rail-label">{stage.label}</span>
              </>
            );
            return (
              <li
                key={stage.id}
                className={`v3-rail-stage v3-rail-stage-${stage.status}`}
                aria-current={stage.status === "active" ? "step" : undefined}
              >
                {stage.status === "done" && onJump ? (
                  <button type="button" onClick={() => onJump(stage.id)} aria-label={`Jump to the ${stage.label} stage`}>
                    {content}
                  </button>
                ) : (
                  <div>{content}</div>
                )}
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
