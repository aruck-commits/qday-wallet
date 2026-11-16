/** Inline SVG nav icons — 16px, 1.5px stroke, currentColor (UI spec §6: no emoji). */

export type NavIconName = "home" | "send" | "key" | "tag" | "box" | "certificate" | "map" | "more";

const PATHS: Record<NavIconName, React.ReactNode> = {
  home: (<><path d="M2.5 7.5 8 2.5l5.5 5" /><path d="M4 7v6.5h8V7" /></>),
  send: (<><path d="M3 13 13 3" /><path d="M6.5 3H13v6.5" /></>),
  key: (<><circle cx="5.2" cy="10.8" r="2.9" /><path d="M7.4 8.6 13 3" /><path d="M10.2 5.8l2.2 2.2" /></>),
  tag: (<><path d="M2.5 2.5h5.6l5.4 5.4-5.6 5.6-5.4-5.4z" /><circle cx="5.4" cy="5.4" r="1" fill="currentColor" stroke="none" /></>),
  box: (<><path d="M8 2 13.5 5v6L8 14 2.5 11V5z" /><path d="M2.5 5 8 8l5.5-3" /><path d="M8 8v6" /></>),
  certificate: (<><rect x="2.5" y="3.5" width="11" height="9" rx="1" /><path d="M5 6.5h6M5 9h4" /></>),
  map: (<><path d="M2.5 4 6 2.5 10 4l3.5-1.5v9L10 13l-4-1.5L2.5 13z" /><path d="M6 2.5v9M10 4v9" /></>),
  more: (<><circle cx="3.5" cy="8" r="1.1" fill="currentColor" stroke="none" /><circle cx="8" cy="8" r="1.1" fill="currentColor" stroke="none" /><circle cx="12.5" cy="8" r="1.1" fill="currentColor" stroke="none" /></>),
};

export function NavIcon({ name }: { name: NavIconName }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {PATHS[name]}
    </svg>
  );
}
