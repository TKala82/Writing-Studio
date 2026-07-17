import { WritingStudio } from "@/components/studio/writing-studio";

export default function Home() {
  return (
    <WritingStudio
      clerkEnabled={Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY)}
    />
  );
}
