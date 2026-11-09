interface StatCardProps {
  label: string;
  value: number;
}

const StatCard = ({ label, value }: StatCardProps) => {
  return (
    <article className="rounded-2xl border border-[#1E3A5F]/15 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
        {label}
      </p>
      <p className="mt-2 text-3xl font-bold tracking-tight text-[#1E3A5F] dark:text-white">
        {value.toLocaleString()}
      </p>
    </article>
  );
};

export default StatCard;
