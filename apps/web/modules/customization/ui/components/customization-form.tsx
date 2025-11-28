import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@workspace/ui/components/form";
import { Input } from "@workspace/ui/components/input";
import { Separator } from "@workspace/ui/components/separator";
import { Textarea } from "@workspace/ui/components/textarea";
import { RadioGroup, RadioGroupItem } from "@workspace/ui/components/radio-group";
import { Label } from "@workspace/ui/components/label";
import { Doc } from "@workspace/backend/_generated/dataModel";
import { useMutation } from "convex/react";
import { api } from "@workspace/backend/_generated/api";
import { VapiFormFields } from "./vapi-form-fields";
import { LogoManager } from "./logo-manager";
import { FormSchema } from "../../types";
import { widgetSettingsSchema } from "../../schemas";
import { useEffect, useState } from "react";
import { THEME_PRESETS, type ThemePreset } from "@/modules/chatbots/constants/theme-presets";

type Chatbot = Doc<"chatbots">;

interface CustomizationFormProps {
  chatbot: Chatbot;
  hasVapiPlugin?: boolean;
}

export const CustomizationForm = ({
  chatbot,
  hasVapiPlugin,
}: CustomizationFormProps) => {
  const updateChatbot = useMutation(api.private.chatbots.update);

  // Determine initial theme based on current color
  const getInitialTheme = (): ThemePreset => {
    const currentColor = chatbot.appearance?.primaryColor;
    if (currentColor === THEME_PRESETS.dark.primaryColor) return "dark";
    if (currentColor === THEME_PRESETS.classic.primaryColor) return "classic";
    return "classic"; // default
  };

  const [selectedTheme, setSelectedTheme] = useState<ThemePreset>(getInitialTheme());

  const form = useForm<FormSchema>({
    resolver: zodResolver(widgetSettingsSchema),
    defaultValues: {
      chatbotName: chatbot.name || "Support Assistant",
      greetMessage: chatbot.greetMessage || "Hi! How can I help you?",
      customSystemPrompt: chatbot.customSystemPrompt || "",
      appearance: {
        primaryColor: chatbot.appearance?.primaryColor || "",
        size: chatbot.appearance?.size || "medium",
      },
      defaultSuggestions: {
        suggestion1: chatbot.defaultSuggestions.suggestion1 || "",
        suggestion2: chatbot.defaultSuggestions.suggestion2 || "",
        suggestion3: chatbot.defaultSuggestions.suggestion3 || "",
      },
      vapiSettings: {
        assistantId: chatbot.vapiSettings.assistantId || "",
        phoneNumber: chatbot.vapiSettings.phoneNumber || "",
      },
    },
  });

  const handleThemeChange = (theme: ThemePreset) => {
    setSelectedTheme(theme);
    form.setValue("appearance.primaryColor", THEME_PRESETS[theme].primaryColor);
  };

  // Reset form when chatbot changes
  useEffect(() => {
    setSelectedTheme(getInitialTheme());
    form.reset({
      chatbotName: chatbot.name || "Support Assistant",
      greetMessage: chatbot.greetMessage || "Hi! How can I help you?",
      customSystemPrompt: chatbot.customSystemPrompt || "",
      appearance: {
        primaryColor: chatbot.appearance?.primaryColor || "",
        size: chatbot.appearance?.size || "medium",
      },
      defaultSuggestions: {
        suggestion1: chatbot.defaultSuggestions.suggestion1 || "",
        suggestion2: chatbot.defaultSuggestions.suggestion2 || "",
        suggestion3: chatbot.defaultSuggestions.suggestion3 || "",
      },
      vapiSettings: {
        assistantId: chatbot.vapiSettings.assistantId || "",
        phoneNumber: chatbot.vapiSettings.phoneNumber || "",
      },
    });
  }, [chatbot._id, chatbot.name, chatbot.greetMessage, chatbot.customSystemPrompt, chatbot.appearance?.primaryColor, chatbot.appearance?.size, chatbot.defaultSuggestions.suggestion1, chatbot.defaultSuggestions.suggestion2, chatbot.defaultSuggestions.suggestion3, chatbot.vapiSettings.assistantId, chatbot.vapiSettings.phoneNumber, form]);

  const onSubmit = async (values: FormSchema) => {
    try {
      await updateChatbot({
        chatbotId: chatbot.chatbotId,
        name: values.chatbotName || chatbot.name,
        knowledgeBaseId: chatbot.knowledgeBaseId,
        greetMessage: values.greetMessage,
        customSystemPrompt: values.customSystemPrompt || undefined,
        appearance: {
          primaryColor: values.appearance?.primaryColor || undefined,
          size: values.appearance?.size || undefined,
        },
        defaultSuggestions: {
          suggestion1: values.defaultSuggestions.suggestion1 || undefined,
          suggestion2: values.defaultSuggestions.suggestion2 || undefined,
          suggestion3: values.defaultSuggestions.suggestion3 || undefined,
        },
        vapiSettings: {
          assistantId:
            values.vapiSettings.assistantId === "none"
              ? undefined
              : values.vapiSettings.assistantId || undefined,
          phoneNumber:
            values.vapiSettings.phoneNumber === "none"
              ? undefined
              : values.vapiSettings.phoneNumber || undefined,
        },
        isDefault: chatbot.isDefault,
      });

      toast.success("Chatbot settings saved");
    } catch (error) {
      console.error(error);
      toast.error("Something went wrong");
    }
  };

return (
  <Form {...form}>
    <form className="space-y-6" onSubmit={form.handleSubmit(onSubmit)}>
      <Card>
        <CardHeader>
          <CardTitle>General Chat Settings</CardTitle>
          <CardDescription>
            Configure basic chat widget behavior and messages
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <FormField
            control={form.control}
            name="chatbotName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Chatbot Name</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="e.g., Support Assistant, AI Helper"
                  />
                </FormControl>
                <FormDescription>
                  The name displayed for your AI assistant in the chat widget
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <Separator />
          <FormField
            control={form.control}
            name="greetMessage"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Greeting Message</FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    placeholder="Welcome message shown when chat opens"
                    rows={3}
                  />
                </FormControl>
                <FormDescription>
                  Message displayed to users when they open the chat widget
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <Separator />
          <FormField
            control={form.control}
            name="customSystemPrompt"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Custom System Prompt (Advanced)</FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    placeholder="Leave empty to use default AI behavior. Enter custom instructions to modify how the AI assistant responds..."
                    rows={8}
                  />
                </FormControl>
                <FormDescription>
                  Advanced: Customize the AI&apos;s behavior and personality. Leave empty to use the default prompt optimized for customer support.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <Separator />
          <div className="space-y-4">
            <div>
              <h3 className="mb-4 text-sm font-medium">
                Appearance
              </h3>
              <p className="mb-4 text-muted-foreground text-sm">
                Customize the look and feel of your chat widget
              </p>
              <div className="space-y-4">
                <LogoManager chatbotId={chatbot.chatbotId} logo={chatbot.appearance?.logo ?? undefined} />
                <div className="space-y-3">
                  <FormLabel>Theme Preset</FormLabel>
                  <RadioGroup value={selectedTheme} onValueChange={handleThemeChange}>
                    <div className="grid grid-cols-2 gap-3">
                      {(Object.keys(THEME_PRESETS) as ThemePreset[]).map((themeKey) => {
                        const theme = THEME_PRESETS[themeKey];
                        return (
                          <div key={themeKey} className="relative">
                            <RadioGroupItem
                              value={themeKey}
                              id={`theme-${themeKey}`}
                              className="peer sr-only"
                            />
                            <Label
                              htmlFor={`theme-${themeKey}`}
                              className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-transparent p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary cursor-pointer"
                            >
                              <div className="mb-2 h-8 w-8 rounded-full" style={{ backgroundColor: theme.primaryColor }} />
                              <div className="text-center">
                                <div className="font-semibold">{theme.name}</div>
                                <div className="text-xs text-muted-foreground mt-1">{theme.description}</div>
                              </div>
                            </Label>
                          </div>
                        );
                      })}
                    </div>
                  </RadioGroup>
                  <p className="text-xs text-muted-foreground">
                    Select a theme preset or customize the color below
                  </p>
                </div>
                <FormField
                  control={form.control}
                  name="appearance.primaryColor"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Custom Primary Color (Optional)</FormLabel>
                      <FormControl>
                        <div className="flex items-center gap-x-2">
                          <Input
                            {...field}
                            placeholder="#3B82F6"
                            type="text"
                          />
                          <Input
                            className="h-10 w-20 cursor-pointer"
                            onChange={(e) => field.onChange(e.target.value)}
                            type="color"
                            value={field.value || "#3B82F6"}
                          />
                        </div>
                      </FormControl>
                      <FormDescription>
                        Override theme color with custom hex value
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="appearance.size"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Widget Size</FormLabel>
                      <FormControl>
                        <select
                          {...field}
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <option value="medium">Default (Medium)</option>
                          <option value="small">Small</option>
                          <option value="large">Large</option>
                        </select>
                      </FormControl>
                      <FormDescription>
                        Size of the chat widget window
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </div>
          <Separator />
          <div className="space-y-4">
            <div>
              <h3 className="mb-4 text-sm font-medium">
                Default Suggestions
              </h3>
              <p className="mb-4 text-muted-foreground text-sm">
                Quick reply suggestions shown to customers to help guide the conversation
              </p>
              <div className = "space-y-4">
                <FormField
                  control={form.control}
                  name="defaultSuggestions.suggestion1"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Suggestion 1</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="e.g. How do I get started?"

                        />
                      </FormControl>

                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="defaultSuggestions.suggestion2"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Suggestion 2</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="e.g. What are your pricing plans?"
                        />
                      </FormControl>

                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="defaultSuggestions.suggestion3"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Suggestion 3</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="e.g. Can I speak to support?"
                        />
                      </FormControl>

                      <FormMessage />
                    </FormItem>
                  )}
                />

              </div>
            </div>
          </div>

        </CardContent>
      </Card>

      {hasVapiPlugin && (
        <Card>
          <CardHeader>
            <CardTitle>Voice Assistant Settings</CardTitle>
            <CardDescription>
              Configure voice calling features powered by Vapi
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <VapiFormFields form = {form} />
          </CardContent>


        </Card>
      )}

      <div className="flex justify-end">
        <Button disabled={form.formState.isSubmitting} type="submit">
          Save Settings
        </Button>
      </div>

    </form>
  </Form>
);
}
