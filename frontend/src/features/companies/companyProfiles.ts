export type CompanyProfile = {
  id: string;
  name: string;
  initials: string;
  location: string;
  industry: string;
  teamSize: string;
  rating: string;
  verified: boolean;
  recommended: boolean;
  overview: string;
  highlights: string[];
  applicationProcess: string[];
  lifeAt: Array<{ icon: "impact" | "learn" | "belong"; title: string; description: string }>;
  openRoles: Array<{
    id: string;
    title: string;
    category: string;
    location: string;
    type: string;
    arrangement: string;
    salary: string;
    description: string;
    skills: string[];
  }>;
};

export const companyProfiles: Record<string, CompanyProfile> = {
  "maya-philippines": {
    id: "maya-philippines",
    name: "Maya Philippines",
    initials: "M",
    location: "BGC, Taguig City",
    industry: "Financial Technology",
    teamSize: "1,000+",
    rating: "4.7",
    verified: true,
    recommended: true,
    overview:
      "Maya is the Philippines’ all-in-one money platform, combining digital banking, payments, and commerce tools to make financial services more accessible for every Filipino.",
    highlights: [
      "Your fintech skills match current openings",
      "Hybrid setup matches your preference",
      "Located in your preferred work area",
    ],
    applicationProcess: [
      "Submit your profile",
      "Recruiter review",
      "Interview with the team",
      "Offer decision",
    ],
    lifeAt: [
      { icon: "impact", title: "Build for impact", description: "Create products used by millions." },
      { icon: "learn", title: "Keep learning", description: "Grow through mentorship and training." },
      { icon: "belong", title: "Belong here", description: "Bring your perspective to an inclusive team." },
    ],
    openRoles: [
      {
        id: "frontend",
        title: "Frontend Developer",
        category: "Digital Banking",
        location: "BGC, Taguig City",
        type: "Job",
        arrangement: "Hybrid",
        salary: "₱70,000–₱100,000",
        description: "Build secure, accessible digital banking experiences with Maya’s product and design teams.",
        skills: ["React", "TypeScript", "Design systems"],
      },
      {
        id: "software-engineering-intern",
        title: "Software Engineering Intern",
        category: "Platform Engineering",
        location: "BGC, Taguig City",
        type: "OJT",
        arrangement: "Hybrid",
        salary: "Paid · 480 hours",
        description: "Join a mentor-led engineering squad while completing your required internship hours.",
        skills: ["JavaScript", "Git", "MOA supported"],
      },
      {
        id: "customer-experience",
        title: "Customer Experience Specialist",
        category: "Customer Operations",
        location: "Quezon City",
        type: "Job",
        arrangement: "On-site",
        salary: "Competitive salary",
        description: "Help customers resolve account and payment concerns with thoughtful, efficient support.",
        skills: ["Customer support", "Communication", "Fintech"],
      },
    ],
  },
  "northstar-labs": {
    id: "northstar-labs",
    name: "Northstar Labs",
    initials: "N",
    location: "San Francisco, CA",
    industry: "Design & Creative",
    teamSize: "201-500 employees",
    rating: "4.8",
    verified: true,
    recommended: true,
    overview:
      "Northstar Labs partners with product teams to build thoughtful, flexible systems and enable brands to create confident digital experiences. Their work spans UX research, product strategy, and scalable design systems.",
    highlights: [
      "Your design skills match current openings",
      "Remote-first setup supports your preference",
      "A collaborative, distributed team",
    ],
    applicationProcess: ["Submit your profile", "Portfolio review", "Team interview", "Offer decision"],
    lifeAt: [
      { icon: "impact", title: "Design with purpose", description: "Shape products used by modern teams." },
      { icon: "learn", title: "Grow together", description: "Learn through critique and mentorship." },
      { icon: "belong", title: "Work openly", description: "Collaborate with a distributed team." },
    ],
    openRoles: [
      {
        id: "product",
        title: "Senior Product Designer",
        category: "Product Design",
        location: "San Francisco, CA",
        type: "Job",
        arrangement: "Remote",
        salary: "$115,000–$145,000",
        description: "Shape intuitive experiences for teams doing their best work in a distributed environment.",
        skills: ["Product design", "Design systems", "Figma"],
      },
    ],
  },
  "vela-health": {
    id: "vela-health",
    name: "Vela Health",
    initials: "V",
    location: "Remote · United States",
    industry: "Healthcare",
    teamSize: "101-250 employees",
    rating: "4.6",
    verified: true,
    recommended: true,
    overview:
      "Vela Health helps people navigate care with digital tools that combine compassionate support and data-backed decision making. The team works across research, product, and operations to build a healthier, more accessible patient experience.",
    highlights: [
      "Your research skills match current openings",
      "Remote work available across the United States",
      "A team focused on accessible care",
    ],
    applicationProcess: ["Submit your profile", "Recruiter review", "Research interview", "Offer decision"],
    lifeAt: [
      { icon: "impact", title: "Improve care", description: "Build experiences with real-world impact." },
      { icon: "learn", title: "Keep exploring", description: "Turn research into better decisions." },
      { icon: "belong", title: "Care together", description: "Work with an empathetic, inclusive team." },
    ],
    openRoles: [
      {
        id: "research",
        title: "UX Researcher",
        category: "Research",
        location: "Remote · United States",
        type: "Job",
        arrangement: "Remote",
        salary: "$90,000–$120,000",
        description: "Turn human insight into meaningful product direction for a growing digital health platform.",
        skills: ["Research", "Healthcare", "Remote"],
      },
    ],
  },
  "kindred-finance": {
    id: "kindred-finance",
    name: "Kindred Finance",
    initials: "K",
    location: "New York, NY",
    industry: "Information Technology",
    teamSize: "251-500 employees",
    rating: "4.5",
    verified: true,
    recommended: false,
    overview:
      "Kindred Finance is building intuitive financial infrastructure for both consumers and businesses that want greater transparency and confidence in their decisions. Their platform blends product strategy, engineering, and service design into cohesive offerings.",
    highlights: [
      "Your frontend skills match current openings",
      "Hybrid setup in New York",
      "A close-knit product and design team",
    ],
    applicationProcess: ["Submit your profile", "Recruiter review", "Engineering interview", "Offer decision"],
    lifeAt: [
      { icon: "impact", title: "Build with trust", description: "Make finance clearer and more accessible." },
      { icon: "learn", title: "Keep improving", description: "Grow with thoughtful product feedback." },
      { icon: "belong", title: "Work as one", description: "Partner closely across product and design." },
    ],
    openRoles: [
      {
        id: "engineer",
        title: "Frontend Engineer",
        category: "Digital Products",
        location: "New York, NY",
        type: "Job",
        arrangement: "Hybrid",
        salary: "$110,000–$135,000",
        description: "Build accessible, high-quality interfaces with a close-knit product and design team.",
        skills: ["Frontend", "React", "Accessibility"],
      },
    ],
  },
  "common-ground": {
    id: "common-ground",
    name: "Common Ground",
    initials: "C",
    location: "Taguig City",
    industry: "Human Resources",
    teamSize: "51-200",
    rating: "4.6",
    verified: true,
    recommended: false,
    overview:
      "Common Ground creates people-first workplaces and employee experiences, helping teams build healthier, more supportive organizations.",
    highlights: [
      "Your people-focused training aligns with this OJT",
      "Located in your preferred work area",
      "Mentorship and hands-on HR experience",
    ],
    applicationProcess: ["Submit your profile", "Recruiter review", "Meet your mentor", "OJT placement decision"],
    lifeAt: [
      { icon: "impact", title: "Support people", description: "Help create a better employee experience." },
      { icon: "learn", title: "Learn by doing", description: "Build practical HR and operations skills." },
      { icon: "belong", title: "Find your team", description: "Join a supportive, people-first workplace." },
    ],
    openRoles: [
      {
        id: "people-operations-intern",
        title: "People Operations Intern",
        category: "Human Resources",
        location: "Taguig City",
        type: "OJT",
        arrangement: "On-site",
        salary: "₱12,000–₱15,000 / month",
        description: "Support a people-first employee experience while learning modern HR operations.",
        skills: ["People ops", "Learning", "Internship"],
      },
    ],
  },
  "canva-philippines": {
    id: "canva-philippines",
    name: "Canva Philippines",
    initials: "C",
    location: "Makati City, Metro Manila",
    industry: "Technology & Design",
    teamSize: "1,000+ in PH",
    rating: "Not provided",
    verified: false,
    recommended: false,
    overview:
      "Canva is a global visual communication platform. Its Philippines team has more than 1,000 people and includes Design, Customer Happiness, Sales, People, and Operations teams based around its Makati campus.",
    highlights: [
      "Canva's official careers page lists a campus in Makati City",
      "The Philippines team has more than 1,000 members",
      "Canva has local Design teams in the Philippines",
    ],
    applicationProcess: [
      "Application steps were not provided for this internship.",
    ],
    lifeAt: [
      {
        icon: "impact",
        title: "Empower people to design",
        description: "Contribute to a global visual communication platform.",
      },
      {
        icon: "learn",
        title: "Work across design teams",
        description: "Canva's Philippine teams include local designers.",
      },
      {
        icon: "belong",
        title: "Join the Makati campus",
        description: "Canva's official careers site lists its Philippine campus in Makati City.",
      },
    ],
    openRoles: [
      {
        id: "canva-product-design-intern",
        title: "Product Design Intern",
        category: "Product Design",
        location: "Makati City, Metro Manila",
        type: "OJT",
        arrangement: "Not provided",
        salary: "Not provided",
        description:
          "Product Design Intern opportunity with Canva Philippines. Further role-specific details were not provided.",
        skills: [],
      },
    ],
  },
};

export function getCompanyProfileSlug(companyName: string) {
  return companyName
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export function getCompanyProfile(companyName: string) {
  const slug = getCompanyProfileSlug(companyName);
  return getCompanyProfileBySlug(slug);
}

export function getCompanyProfileBySlug(slug: string) {
  const normalizedSlug = getCompanyProfileSlug(slug);
  const knownProfile = companyProfiles[normalizedSlug];
  if (knownProfile) return knownProfile;

  const name = normalizedSlug
    .split("-")
    .filter(Boolean)
    .map((word) => `${word[0].toLocaleUpperCase()}${word.slice(1)}`)
    .join(" ");

  return {
    id: normalizedSlug,
    name,
    initials: name.slice(0, 1) || "?",
    location: "Location not provided",
    industry: "General",
    teamSize: "Not provided",
    rating: "New",
    verified: false,
    recommended: false,
    overview: `${name} is sharing opportunities with the CareerConnect community. Visit this page to learn about open roles and the team.`,
    highlights: ["Explore the open role", "Check the work setup and location", "Review the application requirements"],
    applicationProcess: ["Submit your profile", "Recruiter review", "Interview with the team", "Offer decision"],
    lifeAt: [
      { icon: "impact" as const, title: "Make an impact", description: "Contribute to meaningful work." },
      { icon: "learn" as const, title: "Keep learning", description: "Build skills through hands-on experience." },
      { icon: "belong" as const, title: "Work together", description: "Collaborate with a supportive team." },
    ],
    openRoles: [],
  };
}

export function getCompanyProfileUrl(companyName: string) {
  return `/company/${encodeURIComponent(getCompanyProfileSlug(companyName))}`;
}
