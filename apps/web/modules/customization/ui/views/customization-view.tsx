"use client";

import { api } from "@workspace/backend/_generated/api";
import { useQuery } from "convex/react";
import { Loader2Icon } from "lucide-react";
import { CustomizationForm} from "../components/customization-form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@workspace/ui/components/select";
import { Label } from "@workspace/ui/components/label";
import { useState, useEffect } from "react";
import type { Id } from "@workspace/backend/_generated/dataModel";

const CHATBOT_CUSTOMIZATION_KEY = "customization-chatbot-id";

export const CustomizationView = () => {
  const chatbots = useQuery(api.private.chatbots.list);
  const vapiPlugin = useQuery(api.private.plugins.getOne, { service: "vapi" });

  const [selectedChatbotId, setSelectedChatbotId] = useState<Id<"chatbots"> | null>(() => {
    // Initialize from localStorage
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(CHATBOT_CUSTOMIZATION_KEY);
      return stored as Id<"chatbots"> | null;
    }
    return null;
  });

  const isLoading = chatbots === undefined || vapiPlugin === undefined;

  // Auto-select default chatbot when chatbots load (if no stored selection or stored selection is invalid)
  useEffect(() => {
    if (!chatbots) return;

    // Check if stored chatbot ID is still valid
    if (selectedChatbotId) {
      const isValid = chatbots.some((c) => c._id === selectedChatbotId);
      if (isValid) return; // Stored selection is valid, keep it
    }

    // No valid selection, auto-select default
    const defaultChatbot = chatbots.find((c) => c.isDefault);
    if (defaultChatbot) {
      setSelectedChatbotId(defaultChatbot._id);
    } else if (chatbots.length > 0 && chatbots[0]) {
      setSelectedChatbotId(chatbots[0]._id);
    }
  }, [chatbots, selectedChatbotId]);

  // Persist selection to localStorage
  useEffect(() => {
    if (typeof window !== "undefined" && selectedChatbotId) {
      localStorage.setItem(CHATBOT_CUSTOMIZATION_KEY, selectedChatbotId);
    }
  }, [selectedChatbotId]);

  const selectedChatbot = chatbots?.find((c) => c._id === selectedChatbotId);

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-y-2 bg-muted p-8">
        <Loader2Icon className="text-muted-foreground animate-spin" />
        <p className="text-muted-foreground text-sm">Loading settings...</p>
      </div>
    );
  }

  if (!chatbots || chatbots.length === 0) {
    return (
      <div className="flex min-h-screen flex-col bg-muted p-8">
        <div className="max-w-screen-md mx-auto w-full">
          <div className="space-y-2">
            <h1 className="text-2xl md:text-4xl">Widget Customization</h1>
            <p className="text-muted-foreground">
              No chatbots found. Please create a chatbot first from the Chatbots page.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-muted p-8">
      <div className="max-w-screen-md mx-auto w-full">
        <div className="space-y-2">
          <h1 className="text-2xl md:text-4xl">Widget Customization</h1>
          <p className="text-muted-foreground">
            Customize how your chat widget looks and behaves for your customers
          </p>
        </div>

        <div className="mt-8 space-y-6">
          <div className="space-y-2">
            <Label htmlFor="chatbot-select">Select Chatbot to Customize</Label>
            <Select
              value={selectedChatbotId || undefined}
              onValueChange={(value) => setSelectedChatbotId(value as Id<"chatbots">)}
            >
              <SelectTrigger id="chatbot-select">
                <SelectValue placeholder="Select a chatbot" />
              </SelectTrigger>
              <SelectContent>
                {chatbots.map((chatbot) => (
                  <SelectItem key={chatbot._id} value={chatbot._id}>
                    {chatbot.name}
                    {chatbot.isDefault && " (Default)"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedChatbot && (
            <CustomizationForm
              chatbot={selectedChatbot}
              hasVapiPlugin={!!vapiPlugin}
            />
          )}
        </div>
      </div>
    </div>
  );
};
