import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import Statistics from "./components/Statistics";
import Features from "./components/Features";
import LatestProposals from "./components/LatestProposals";
import LatestResults from "./components/LatestResults";

export default function Home() {
  return (
    <>
      <Navbar />

      <main className="pt-[76px]">
        <Hero />

        <Statistics />

        <Features />

        <LatestProposals />

        <LatestResults />
      </main>
    </>
  );
}




