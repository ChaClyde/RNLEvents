const DashboardSkeleton = () => {
  return (
    <div className="space-y-6" aria-busy="true" aria-live="polite">
      <div className="h-20 animate-pulse rounded-xl bg-line" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index} className="h-24 animate-pulse rounded-xl bg-line" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="h-64 animate-pulse rounded-xl bg-line" />
        <div className="h-64 animate-pulse rounded-xl bg-line" />
      </div>
    </div>
  );
};

export default DashboardSkeleton;
