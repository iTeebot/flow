type ModuleCardProps = {
  title: string;
  description: string;
};

export function ModuleCard({ title, description }: ModuleCardProps) {
  return (
    <section className="max-w-4xl rounded-md border border-border bg-card p-7 shadow-xl shadow-black/30 backdrop-blur">
      <h2 className="mb-3 text-h2 font-semibold tracking-tight text-text-primary">{title}</h2>
      <p className="text-body leading-6 text-text-muted">{description}</p>
    </section>
  );
}
