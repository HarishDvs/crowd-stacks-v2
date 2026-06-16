// Loading placeholders for campaign cards — shown while the chain data loads
// instead of a bare "Loading..." line.

export function CampaignCardSkeleton() {
  return (
    <div className="backdrop-blur-md bg-neutral-800/40 rounded-xl p-6 border border-neutral-700 animate-pulse">
      <div className="h-5 w-2/3 bg-neutral-700 rounded mb-3" />
      <div className="h-3 w-full bg-neutral-700/70 rounded mb-2" />
      <div className="h-3 w-5/6 bg-neutral-700/70 rounded mb-4" />
      <div className="h-2 w-full bg-neutral-700 rounded-full mb-3" />
      <div className="flex justify-between">
        <div className="h-4 w-16 bg-neutral-700 rounded" />
        <div className="h-4 w-10 bg-neutral-700 rounded" />
      </div>
    </div>
  )
}

export function CampaignCardSkeletonGrid({ count = 3 }: { count?: number }) {
  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <CampaignCardSkeleton key={i} />
      ))}
    </div>
  )
}
