import type { OjtOpportunity } from "@/components/common/user/ojtOpportunityComponents";

export const ojtOpportunities: OjtOpportunity[] = [
  {
    id: "software-engineering-intern",
    company: "Maya Philippines",
    initials: "M",
    title: "Software Engineering Intern",
    trainingFields: ["Technology", "Engineering"],
    location: "BGC, Taguig City",
    city: "Taguig City",
    countryCode: "PH",
    hoursCapacity: 600,
    moaAvailable: true,
    eligibleCourses: [
      "information technology",
      "computer science",
      "computer engineering",
      "information systems",
    ],
    workSetup: "Hybrid",
    employmentType: "Internship",
    allowance: "Paid internship",
    skills: ["React / UI/UX"],
    posted: "Today",
    description:
      "Join a mentor-led engineering squad and complete your required hours while contributing to real fintech products.",
  },
  {
    id: "people-operations-intern",
    company: "Common Ground",
    initials: "C",
    title: "People Operations Intern",
    trainingFields: ["Human Resources"],
    location: "Taguig City",
    city: "Taguig City",
    countryCode: "PH",
    hoursCapacity: 500,
    moaAvailable: true,
    eligibleCourses: [
      "human resources",
      "psychology",
      "business administration",
      "behavioral science",
    ],
    workSetup: "Onsite",
    employmentType: "Internship",
    allowance: "₱12,000–₱15,000 / month",
    skills: ["People ops", "Learning"],
    posted: "1 week ago",
    description:
      "Support a people-first employee experience while learning the foundations of modern HR operations.",
  },
];
