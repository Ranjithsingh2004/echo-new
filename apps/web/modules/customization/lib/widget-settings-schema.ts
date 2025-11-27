import { z } from "zod";

/**
 * Zod schema for widget settings form validation
 * Validates chatbot name, greeting message, custom system prompt, default suggestions, and VAPI settings
 */
export const widgetSettingsSchema = z.object({
  // Chatbot name is optional with default
  chatbotName: z
    .string()
    .max(50, "Chatbot name must be less than 50 characters")
    .optional()
    .or(z.literal("")),

  // Greeting message is required and cannot be empty
  greetMessage: z
    .string()
    .min(1, "Greeting message is required")
    .max(500, "Greeting message must be less than 500 characters"),

  // Custom system prompt is optional
  customSystemPrompt: z
    .string()
    .max(5000, "System prompt must be less than 5000 characters")
    .optional()
    .or(z.literal("")),

  // Appearance settings (optional)
  appearance: z.object({
    primaryColor: z
      .string()
      .regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, "Must be a valid hex color (e.g., #3B82F6)")
      .optional()
      .or(z.literal("")),
    size: z.enum(["small", "medium", "large"]).optional().or(z.literal("")),
  }).optional(),

  // Default suggestions (optional, up to 3)
  defaultSuggestions: z.object({
    suggestion1: z
      .string()
      .max(100, "Suggestion must be less than 100 characters")
      .optional()
      .or(z.literal("")),
    suggestion2: z
      .string()
      .max(100, "Suggestion must be less than 100 characters")
      .optional()
      .or(z.literal("")),
    suggestion3: z
      .string()
      .max(100, "Suggestion must be less than 100 characters")
      .optional()
      .or(z.literal("")),
  }),

  // VAPI settings (optional, only shown if VAPI is connected)
  vapiSettings: z.object({
    assistantId: z.string().optional().or(z.literal("")),
    phoneNumber: z.string().optional().or(z.literal("")),
  }),
});

// TypeScript type inferred from the schema
export type WidgetSettingsFormData = z.infer<typeof widgetSettingsSchema>;
