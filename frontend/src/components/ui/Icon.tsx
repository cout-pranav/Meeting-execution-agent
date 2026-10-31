export function Icon({ name, className = "" }: { name: string; className?: string }) {
  return <span className={`icon ${className}`} aria-hidden>{name}</span>;
}
