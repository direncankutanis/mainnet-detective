// Raiku dragon mascot reactions (art from the Raiku community media kit).
const ALT = {
  shocked: "Raiku dragon looking surprised",
  crying: "Raiku dragon crying",
  angry: "Raiku dragon looking annoyed",
  cook: "Raiku dragon saying let's cook",
  party: "Raiku dragon in a rainbow party wig",
} as const;

export type MascotKind = keyof typeof ALT;

export function Mascot({ kind, size = 76 }: { kind: MascotKind; size?: number }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img className={`mascot mascot-${kind}`} src={`/mascot/${kind}.png`} width={size} height={size} alt={ALT[kind]} />
  );
}
