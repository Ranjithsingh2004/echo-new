import { cn } from "@workspace/ui/lib/utils";
import { Loader2Icon } from "lucide-react";

interface InfiniteScrollTriggerProps {
  canLoadMore: boolean;
  isLoadingMore: boolean;
  onLoadMore: () => void;
  loadMoreText?: string;
  noMoreText?: string;
  className?: string;
  ref?: React.Ref<HTMLDivElement>;
};

export const InfiniteScrollTrigger = ({
  canLoadMore,
  isLoadingMore,
  onLoadMore,
  loadMoreText = "Load more",
  noMoreText = "No more items",
  className,
  ref,
}: InfiniteScrollTriggerProps) => {
  // Hide completely when no more items to load
  if (!canLoadMore && !isLoadingMore) {
    return null;
  }

  return (
    <div className={cn("flex w-full justify-center py-4", className)} ref={ref}>
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2Icon className="h-4 w-4 animate-spin" />
        <span>Loading more...</span>
      </div>
    </div>
  );
}

