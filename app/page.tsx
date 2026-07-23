"use client";

import { useState } from "react";
import DemoExperience from "@/components/DemoExperience";
import LandingHero from "@/components/LandingHero";

export default function Home() {
  const [hasStarted, setHasStarted] = useState(false);

  if (!hasStarted) {
    return <LandingHero onStart={() => setHasStarted(true)} />;
  }

  return <DemoExperience onBack={() => setHasStarted(false)} />;
}
