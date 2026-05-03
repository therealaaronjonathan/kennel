import { AppNavbar } from '@/components/blocks/app-navbar'
import { AppFooter } from '@/components/blocks/app-footer'
import { HeroSection } from './hero-section'
import { FeaturesSection } from './features-section'
import { HowItWorksSection } from './how-it-works-section'
import { PricingSection } from './pricing-section'
import { ContactSection } from './contact-section'

export default function HomePage() {
  return (
    <>
      <AppNavbar />
      <main>
        <HeroSection />
        <FeaturesSection />
        <HowItWorksSection />
        <PricingSection />
        <ContactSection />
      </main>
      <AppFooter />
    </>
  )
}
