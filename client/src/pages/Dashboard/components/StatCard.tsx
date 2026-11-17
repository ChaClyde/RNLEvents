interface StatCardProps {
  label: string;
  value: number;
}

const StatCard = ({ label, value }: StatCardProps) => {
  return (
    <article className="rounded-xl border border-line bg-surface p-5">
      <p className="text-sm font-medium text-muted">{label}</p>
      <p className="mt-2 text-3xl font-bold tracking-tight text-ink">
        {value.toLocaleString()}
      </p>
    </article>
  );
};

export default StatCard;
