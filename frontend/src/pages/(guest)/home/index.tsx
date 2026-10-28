import { useState } from "react";
import Hero from "@/components/common/hero";
import MainBody from "@/components/common/mainBody";

export default function Homepage() {
  const [search, setSearch] = useState("");
  const [location, setLocation] = useState("");

  return (
    <>
      <Hero search={search} onSearchChange={setSearch} location={location} onLocationChange={setLocation} />
      <MainBody search={search} onSearchChange={setSearch} location={location} onLocationChange={setLocation} />
    </>
  );
}
