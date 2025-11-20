import Vapi from "@vapi-ai/web";
import { use, useEffect, useState } from "react";

interface TranscriptMessage {
  role: "user" | "assistant";
  text: string;
};

export const useVapi = () => {
  const [vapi, setVapi] = useState<Vapi | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState<TranscriptMessage[]>([]);

  useEffect(() => {
    const vapiInstance = new Vapi("c7af88ff-f634-40ee-a64d-942002b1b2cd");
    setVapi(vapiInstance);
    
    vapiInstance.on("call-start",() =>{
        setIsConnected(true);

        setIsConnecting(false);  
        
        setTranscript([]);
    });

    vapiInstance.on("call-end",() =>{
        setIsConnected(false);

        setIsConnecting(false);  
        
        setTranscript([]);
    });

    vapiInstance.on("speech-start",() =>{
        setIsSpeaking(true);
    });

    vapiInstance.on("speech-end",() =>{
        setIsSpeaking(false);
    }); 

    vapiInstance.on("error",(error) => {
        console.log(error,"VAPI_ERROR");
        setIsConnecting(false);
    });

    vapiInstance.on("message",(message) => {
        if(message.type === "transcript" && message.transcriptType === "final"){
            setTranscript((prev) => [
                ...prev,
                {
                    role: message.role === "user" ? "user" : "assistant",
                    text: message.transcript,
                }
            ]);
        }
    });     

    return () => {
        vapiInstance?.stop();
    }


    },[]);

    const startCall = () =>{
        setIsConnected(true)

        if(vapi){
            vapi.start("4150a988-a3ab-49ad-85ab-9170ebadce60");
        }
    }

    const endCall = () =>{
    

        if(vapi){
            vapi.stop();
        }
    };

    return {
        isSpeaking,
        isConnected,
        isConnecting,
        startCall,
        endCall,
        transcript,
    }
};
