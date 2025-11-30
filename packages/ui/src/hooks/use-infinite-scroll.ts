import { useCallback, useEffect, useRef, useState } from "react";

interface UseInfiniteScrollProps {
  status: "LoadingFirstPage" | "CanLoadMore" | "LoadingMore" | "Exhausted",
  loadMore: (numItems: number) => void;
  loadSize?: number;
  observerEnabled?: boolean;
};


export const useInfiniteScroll = ({
  status,
  loadMore,
  loadSize = 10,
  observerEnabled = true,
}: UseInfiniteScrollProps) => {
  const topElementRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleLoadMore = useCallback(() => {
    if (status === "CanLoadMore" && !isLoading) {
      setIsLoading(true);
      loadMore(loadSize);
    }
  }, [status, loadMore, loadSize]);

  // Reset loading state when status changes away from loading states
  useEffect(() => {
    if (status !== "LoadingMore" && status !== "LoadingFirstPage") {
      setIsLoading(false);
    }
  }, [status]);

  useEffect(() => {
    const topElement = topElementRef.current;
    if (!(topElement && observerEnabled)) {
        return;
    }

    const observer = new IntersectionObserver(
        ([entry]) => {
        if (entry?.isIntersecting) {
            handleLoadMore();
        }
        },
        { threshold: 0.1 }
    );

    observer.observe(topElement);
    
    return () => {
  observer.disconnect();
    };
    }, [handleLoadMore, observerEnabled]);

    return {
    topElementRef,
    handleLoadMore,
    canLoadMore: status === "CanLoadMore",
    isLoadingMore: status === "LoadingMore",
    isLoadingFirstPage: status === "LoadingFirstPage",
    isExhausted: status === "Exhausted",
    };


};
