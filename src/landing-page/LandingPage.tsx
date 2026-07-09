import { FAQ } from "./components/FAQ";
import { FeaturesGrid } from "./components/FeaturesGrid";
import { Footer } from "./components/Footer";
import { Hero } from "./components/Hero";
import { QualityHighlight } from "./components/QualityHighlight";
import { SchemaMarkup } from "./components/SchemaMarkup";
import { Testimonials } from "./components/Testimonials";
import { useRedirectIfLoggedIn } from "../auth/hooks/useRedirectIfLoggedIn";
import {
  faqs,
  features,
  footerNavigation,
  testimonials,
} from "./contentSections";

export function LandingPage() {
  useRedirectIfLoggedIn();

  return (
    <div className="bg-background text-foreground">
      <SchemaMarkup />
      <main className="isolate">
        <Hero />
        <FeaturesGrid features={features} />
        <QualityHighlight />
        <Testimonials testimonials={testimonials} />
        <FAQ faqs={faqs} />
      </main>
      <Footer footerNavigation={footerNavigation} />
    </div>
  );
}
