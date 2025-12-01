"use client";

import { WidgetView } from "@/modules/widget/ui/views/widget-view";
import { use, useEffect, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@workspace/backend/_generated/api";

interface Props {
  searchParams: Promise<{
    organizationId: string;
    chatbotId?: string;
  }>
};

const Page = ({ searchParams }: Props) => {
  const { organizationId, chatbotId } = use(searchParams);
  const [isReady, setIsReady] = useState(false);
  const [appliedColor, setAppliedColor] = useState<string | null>(null);

  // Pre-fetch appearance settings to apply color immediately
  const appearanceSettings = useQuery(
    api.public.widgetSettings.getChatbotSettings,
    organizationId
      ? {
          organizationId,
          ...(chatbotId ? { chatbotId } : {}),
        }
      : "skip"
  );

  // Apply cached color immediately on mount (before query returns)
  useEffect(() => {
    try {
      const cachedColor = localStorage.getItem(`widget-color-${organizationId}`);
      if (cachedColor) {
        document.documentElement.style.setProperty('--primary', cachedColor);
        setAppliedColor(cachedColor);
      }
    } catch (e) {
      // Ignore localStorage errors
    }
  }, [organizationId]);

  // Apply primary color as soon as it's available AND cache it
  useEffect(() => {
    if (appearanceSettings?.appearance?.primaryColor) {
      const color = appearanceSettings.appearance.primaryColor;
      document.documentElement.style.setProperty('--primary', color);
      setAppliedColor(color);
      // Cache in localStorage for instant load next time
      try {
        localStorage.setItem(`widget-color-${organizationId}`, color);
      } catch (e) {
        // Ignore localStorage errors
      }
      // Mark as ready once we have the color
      setIsReady(true);
    } else if (appearanceSettings !== undefined) {
      // Settings loaded but no custom color, use default
      setIsReady(true);
    }
  }, [appearanceSettings, organizationId]);

  // Show loading screen with correct color until settings are loaded
  if (!isReady) {
    return (
      <div 
        className="flex h-screen w-screen items-center justify-center"
        style={{ backgroundColor: appliedColor || '#3b82f6' }}
      >
        <div className="flex flex-col items-center gap-4 text-white">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-white border-t-transparent" />
          <p className="text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <WidgetView organizationId={organizationId} chatbotId={chatbotId} />
  );
};

export default Page;


  