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
import { Doc } from "@workspace/backend/_generated/dataModel";
import { useMutation } from "convex/react";
import { api } from "@workspace/backend/_generated/api";
import { VapiFormFields } from "./vapi-form-fields";
import { FormSchema } from "../../types";
import { widgetSettingsSchema } from "../../schemas";
import { useEffect } from "react";

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

  // Reset form when chatbot changes
  useEffect(() => {
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
                <FormField
                  control={form.control}
                  name="appearance.primaryColor"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Primary Color</FormLabel>
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
                        Main color for buttons and highlights. Leave empty for default blue (#3B82F6)
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
