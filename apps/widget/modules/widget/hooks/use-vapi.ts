import Vapi from "@vapi-ai/web";
import { useEffect, useState } from "react";
import { vapiSecretsAtom, widgetSettingsAtom } from "../atoms/widget-atoms";
import { useAtomValue } from "jotai";

interface TranscriptMessage {
  role: "user" | "assistant";
  text: string;
};

export const useVapi = () => {
  const vapiSecrets = useAtomValue(vapiSecretsAtom);
  const widgetSettings = useAtomValue(widgetSettingsAtom);

  const [vapi, setVapi] = useState<Vapi | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState<TranscriptMessage[]>([]);
    const [callError, setCallError] = useState<string | null>(null);

    useEffect(() => {
        if (!vapiSecrets?.publicApiKey) {
            return;
        }

        const instance = new Vapi(vapiSecrets.publicApiKey);
        setVapi(instance);

        const resetConnectionState = () => {
            setIsConnected(false);
            setIsConnecting(false);
            setIsSpeaking(false);
        };

        instance.on("call-start", () => {
            setIsConnected(true);
            setIsConnecting(false);
            setTranscript([]);
            setCallError(null);
        });

        instance.on("call-end", resetConnectionState);

        instance.on("speech-start", () => {
            setIsSpeaking(true);
        });

        instance.on("speech-end", () => {
            setIsSpeaking(false);
        });

        instance.on("error", (error) => {
            console.error(error, "VAPI_ERROR");
            resetConnectionState();
            setCallError(getReadableError(error));
        });

        instance.on("message", (message) => {
            if (message.type === "transcript" && message.transcriptType === "final") {
                setTranscript((prev) => [
                    ...prev,
                    {
                        role: message.role === "user" ? "user" : "assistant",
                        text: message.transcript,
                    },
                ]);
            }
        });

        return () => {
            instance.removeAllListeners();
            instance.stop().catch(() => undefined);
            setVapi(null);
            resetConnectionState();
        };
    }, [vapiSecrets?.publicApiKey]);

        const startCall = async () => {
            if (
                !vapiSecrets ||
                !widgetSettings?.vapiSettings?.assistantId ||
                !vapi ||
                isConnecting ||
                isConnected
            ) {
                return;
            }

            setIsConnecting(true);
            setCallError(null);
            try {
                await vapi.start(widgetSettings.vapiSettings.assistantId);
            } catch (error) {
                console.error(error, "VAPI_START_ERROR");
                setCallError(getReadableError(error));
                setIsConnecting(false);
            }
        };

        const endCall = async () => {
            if (!vapi) {
                return;
            }

            setIsConnecting(false);
            try {
                await vapi.stop();
            } catch (error) {
                console.error(error, "VAPI_STOP_ERROR");
            }
        };

    return {
        isSpeaking,
        isConnected,
        isConnecting,
        startCall,
        endCall,
        transcript,
        vapi,
        callError,
    }
};

function getReadableError(error: unknown): string {
    if (error && typeof error === "object") {
        if ("message" in error && typeof (error as { message?: string }).message === "string") {
            return (error as { message: string }).message;
        }
    }
    return "We couldn't start the voice call. Please try again.";
}
