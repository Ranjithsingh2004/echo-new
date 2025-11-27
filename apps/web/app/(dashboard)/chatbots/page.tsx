import { Protect } from "@clerk/nextjs";
import { ChatbotsView } from "@/modules/chatbots/ui/views/chatbots-view";
import { PremiumFeatureOverlay } from "@/modules/billing/ui/components/premium-feature-overlay";

const Page = () => {
  return (
    <Protect
      condition={(has) => has({ plan: "pro" })}
      fallback={
        <PremiumFeatureOverlay>
          <ChatbotsView />
        </PremiumFeatureOverlay>
      }
    >
      <ChatbotsView />
    </Protect>
  );
};

export default Page;
