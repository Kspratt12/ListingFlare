import { demoListing } from "@/lib/demo-data";
import Navbar from "@/components/Navbar";
import HeroSlideshow from "@/components/HeroSlideshow";
import PropertyDetails from "@/components/PropertyDetails";
import PhotoGallery from "@/components/PhotoGallery";
import AgentBranding from "@/components/AgentBranding";
import LeadCaptureForm from "@/components/LeadCaptureForm";
import Footer from "@/components/Footer";

export default function ListingPage() {
  return (
    <main>
      <Navbar />
      <HeroSlideshow listing={demoListing} />
      <PropertyDetails listing={demoListing} />
      <PhotoGallery photos={demoListing.photos} />
      <AgentBranding agent={demoListing.agent} />
      <LeadCaptureForm />
      <Footer />
    </main>
  );
}
