import { useEffect } from "react";
import { useLocation } from "react-router-dom";

import { ContactSection } from "./contact";
import { FeaturesSection } from "./features";
import { Header } from "./header";
import { HomeSection } from "./home";
import { PlansPricingSection } from "./plans-and-pricing";
import { Footer } from "./footer";

const sectionByPath = {
  "/": "home",
  "/features": "features",
  "/plans": "plans",
  "/contact": "contact",
};

export function LandingPage() {
  const { pathname } = useLocation();

  useEffect(() => {
    const sectionId = sectionByPath[pathname] || "home";
    const section = document.getElementById(sectionId);

    if (section) {
      section.scrollIntoView({ block: "start" });
    }
  }, [pathname]);

  return (
    <main className="min-h-screen bg-white text-brand-ink">
      <Header />
      <HomeSection />
      <FeaturesSection />
      <PlansPricingSection />
      <ContactSection />
      <Footer />
    </main>
  );
}
