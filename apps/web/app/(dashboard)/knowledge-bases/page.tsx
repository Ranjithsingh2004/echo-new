import { Protect } from "@clerk/nextjs";
import { KnowledgeBasesView } from "@/modules/knowledge-bases/ui/views/knowledge-bases-view";
import { PremiumFeatureOverlay } from "@/modules/billing/ui/components/premium-feature-overlay";

const Page = () => {
  return (
    <Protect
      condition={(has) => has({ plan: "pro" })}
      fallback={
        <PremiumFeatureOverlay>
          <KnowledgeBasesView />
        </PremiumFeatureOverlay>
      }
    >
      <KnowledgeBasesView />
    </Protect>
  );
};

export default Page;
