export type JobListing = {
  id: string;
  company: string;
  initials: string;
  title: string;
  category: string;
  location: string;
  countryCode: string;
  country: string;
  city: string;
  arrangement: string;
  employmentType: string;
  salary: string;
  posted: string;
  postedHoursAgo: number;
  description: string;
  skills: string[];
};

export const jobListings: JobListing[] = [
  {
    id: "frontend",
    company: "Maya Philippines",
    initials: "M",
    title: "Frontend Developer",
    category: "Information Technology",
    location: "BGC, Taguig City",
    countryCode: "PH",
    country: "Philippines",
    city: "Taguig City",
    arrangement: "Hybrid",
    employmentType: "Full-time",
    salary: "₱70,000–₱100,000",
    posted: "2 hours ago",
    postedHoursAgo: 2,
    description:
      "Build secure, accessible digital banking experiences used by customers across the Philippines.",
    skills: ["React", "TypeScript", "Design systems"],
  },
  {
    id: "product",
    company: "Northstar Labs",
    initials: "N",
    title: "Senior Product Designer",
    category: "Design & Creative",
    location: "San Francisco, CA",
    countryCode: "US",
    country: "United States",
    city: "San Francisco",
    arrangement: "Remote",
    employmentType: "Full-time",
    salary: "$115,000–$145,000",
    posted: "2 days ago",
    postedHoursAgo: 48,
    description:
      "Shape intuitive experiences for teams doing their best work in a distributed environment.",
    skills: ["Product design", "Design systems", "Figma"],
  },
  {
    id: "research",
    company: "Vela Health",
    initials: "V",
    title: "UX Researcher",
    category: "Design & Creative",
    location: "Remote · United States",
    countryCode: "US",
    country: "United States",
    city: "",
    arrangement: "Remote",
    employmentType: "Full-time",
    salary: "$90,000–$120,000",
    posted: "4 days ago",
    postedHoursAgo: 96,
    description:
      "Turn human insight into meaningful product direction for a rapidly growing digital health platform.",
    skills: ["Research", "Healthcare", "Remote"],
  },
  {
    id: "engineer",
    company: "Kindred Finance",
    initials: "K",
    title: "Frontend Engineer",
    category: "Information Technology",
    location: "New York, NY",
    countryCode: "US",
    country: "United States",
    city: "New York",
    arrangement: "Hybrid",
    employmentType: "Full-time",
    salary: "$110,000–$135,000",
    posted: "5 days ago",
    postedHoursAgo: 120,
    description:
      "Build accessible, high-quality interfaces alongside a close-knit product and design team.",
    skills: ["Frontend", "React", "Accessibility"],
  },
  {
    id: "customer-experience",
    company: "Maya Philippines",
    initials: "M",
    title: "Customer Experience Specialist",
    category: "Customer Service / BPO",
    location: "Quezon City",
    countryCode: "PH",
    country: "Philippines",
    city: "Quezon City",
    arrangement: "On-site",
    employmentType: "Full-time",
    salary: "Competitive salary",
    posted: "1 day ago",
    postedHoursAgo: 24,
    description:
      "Help customers resolve account and payment concerns with thoughtful, efficient support.",
    skills: ["Customer support", "Communication", "Fintech"],
  },
];
