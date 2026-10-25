import { CommunityForm } from "@/components/community-form";
import { updateCommunity } from "@/app/actions/host";
import { requireHostCommunity } from "@/lib/data/host";
import { getCategories, getCities } from "@/lib/data/queries";

export default async function HostCommunityPage() {
  const { community } = await requireHostCommunity();
  const [cities, categories] = await Promise.all([getCities(), getCategories()]);
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Community details</h1>
      <CommunityForm
        action={updateCommunity.bind(null, community.id)}
        cities={cities}
        categories={categories}
        community={community}
        submitLabel="Save changes"
      />
    </div>
  );
}
