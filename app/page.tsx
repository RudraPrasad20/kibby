// app/page.tsx
import { Cards } from "@/components/home/cards";
import { Footer } from "@/components/home/footer";

import LandingPage from "@/components/home/hero";

export default function Home() {
  return (
    <main className="bg-background text-foreground">
      <LandingPage />
      <Cards />
      <Footer />
    </main>
  );
}
