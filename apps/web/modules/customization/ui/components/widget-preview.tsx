"use client";

import { useOrganization } from "@clerk/nextjs";
import { useState, useEffect } from "react";
import type { Doc } from "@workspace/backend/_generated/dataModel";
import { Button } from "@workspace/ui/components/button";
import { EyeIcon, EyeOffIcon } from "lucide-react";

type Chatbot = Doc<"chatbots">;

interface WidgetPreviewProps {
  chatbot: Chatbot;
}

export const WidgetPreview = ({ chatbot }: WidgetPreviewProps) => {
  const { organization } = useOrganization();
  const organizationId = organization?.id;
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    if (!showPreview || typeof window === "undefined") return;

    // Create script element that loads the embed script
    const script = document.createElement("script");
    const embedUrl = typeof window !== "undefined" && window.location.hostname === "localhost"
      ? "http://localhost:3001/widget.js"
      : `${process.env.NEXT_PUBLIC_WIDGET_URL || "https://widget.spinabot.com"}/widget.js`;
    
    script.src = embedUrl;
    script.setAttribute("data-organization-id", organizationId || "");
    script.setAttribute("data-chatbot-id", chatbot.chatbotId);
    script.async = true;
    script.id = "echo-widget-preview-script";

    // Append to preview container
    const container = document.getElementById("widget-preview-container");
    if (container) {
      container.appendChild(script);
    }

    // Cleanup function
    return () => {
      // Remove the script
      const scriptEl = document.getElementById("echo-widget-preview-script");
      if (scriptEl) {
        scriptEl.remove();
      }
      
      // Remove any widget elements created by the script
      const widgetButton = document.querySelector('[id^="echo-widget-button"]');
      const widgetContainer = document.querySelector('[id^="echo-widget-container"]');
      const widgetIframe = document.querySelector('iframe[title*="Echo"]');
      
      if (widgetButton) widgetButton.remove();
      if (widgetContainer) widgetContainer.remove();
      if (widgetIframe) widgetIframe.remove();
    };
  }, [showPreview, organizationId, chatbot.chatbotId]);

  if (!organizationId) {
    return null;
  }

  return (
    <div className="space-y-4">
      <Button 
        type="button" 
        variant="outline" 
        className="w-full"
        onClick={() => setShowPreview(!showPreview)}
      >
        {showPreview ? (
          <>
            <EyeOffIcon className="mr-2 h-4 w-4" />
            Hide Live Preview
          </>
        ) : (
          <>
            <EyeIcon className="mr-2 h-4 w-4" />
            Show Live Preview
          </>
        )}
      </Button>

      {showPreview && (
        <div 
          id="widget-preview-container"
          className="relative rounded-lg border bg-muted/50 p-4"
          style={{ 
            minHeight: "120px",
            position: "relative"
          }}
        >
          <p className="text-sm text-muted-foreground text-center">
            Widget preview enabled - click the chat bubble in the bottom-right corner to interact with your widget
          </p>
          {/* Widget will be injected here by the embed script */}
        </div>
      )}
    </div>
  );
};
