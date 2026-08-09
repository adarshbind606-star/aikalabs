import { AmbientBackground } from "@/components/AmbientBackground";

/** Renders the user's selected animated background (sakura petals by default). */
export function SakuraPetals({ count = 15 }: { count?: number }) {
  return <AmbientBackground count={count} />;
}
