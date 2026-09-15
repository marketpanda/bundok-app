import { HikingApp } from "@/components/hiking-app";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ screen?: string }>;
}) {
  const { screen } = await searchParams;

  return <HikingApp initialScreen={screen === "detail" ? "detail" : "home"} />;
}
