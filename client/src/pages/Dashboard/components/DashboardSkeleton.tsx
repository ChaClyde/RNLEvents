const DashboardSkeleton = () => {
  return (
    <div className="space-y-6" aria-busy="true" aria-live="polite">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <div
            key={index}
            className="h-28 animate-pulse rounded-lg bg-[#E5E8EF]"
          />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="h-72 animate-pulse rounded-lg bg-[#E5E8EF]" />
        <div className="h-72 animate-pulse rounded-lg bg-[#E5E8EF]" />
      </div>
    </div>
  );
};

export default DashboardSkeleton;
