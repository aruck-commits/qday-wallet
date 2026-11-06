export function TxChip({ value, href, label = "TX" }: { value: string | null | undefined; href?: string | null; label?: string }) {
  if (!value) return <span className="tx-chip tx-empty">{label} unavailable</span>;
  const short = `${value.slice(0, 8)}...${value.slice(-6)}`;
  return href ? <a className="tx-chip" href={href} target="_blank" rel="noreferrer"><span>{label}</span>{short}<b>↗</b></a> : <span className="tx-chip"><span>{label}</span>{short}</span>;
}
