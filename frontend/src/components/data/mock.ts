import type {
  Category,
  EmployerVerification,
  TopJob,
  User,
} from "../../types";

// Mock data. Replace with API calls (services/ + hooks/) when the backend is ready.

export const initialVerifications: EmployerVerification[] = [
  {
    id: "1",
    company: "Northstar Labs",
    initials: "NL",
    submittedBy: "Mia Rodriguez",
    submittedAt: "May 27, 2025",
    status: "pending",
    documents: [
      { id: "1a", name: "Business registration.pdf" },
      { id: "1b", name: "Tax identification.pdf" },
    ],
  },
  {
    id: "2",
    company: "Vela Health",
    initials: "VH",
    submittedBy: "Daniel Kim",
    submittedAt: "May 26, 2025",
    status: "pending",
    documents: [
      { id: "2a", name: "Certificate of incorporation.pdf" },
      { id: "2b", name: "Business license.pdf" },
    ],
  },
  {
    id: "3",
    company: "Common Ground",
    initials: "CG",
    submittedBy: "Nina Foster",
    submittedAt: "May 25, 2025",
    status: "pending",
    documents: [{ id: "3a", name: "Business registration.pdf" }],
  },
  {
    id: "4",
    company: "Kindred Finance",
    initials: "KF",
    submittedBy: "Owen Park",
    submittedAt: "May 23, 2025",
    status: "pending",
    documents: [
      { id: "4a", name: "Financial services license.pdf" },
      { id: "4b", name: "Tax identification.pdf" },
    ],
  },
];

export const initialUsers: User[] = [
  { id: "u1", name: "Avery Morgan", email: "avery.morgan@example.com", initials: "AM", role: "Applicant", joined: "May 24, 2025", status: "Active" },
  { id: "u2", name: "Mia Rodriguez", email: "mia@northstarlabs.com", initials: "MR", role: "Employer", joined: "May 20, 2025", status: "Active" },
  { id: "u3", name: "Jordan Lee", email: "jordan.lee@example.com", initials: "JL", role: "Applicant", joined: "May 18, 2025", status: "Active" },
  { id: "u4", name: "Samira Patel", email: "samira.patel@example.com", initials: "SP", role: "Applicant", joined: "May 16, 2025", status: "Inactive" },
  { id: "u5", name: "Daniel Kim", email: "daniel@velahealth.com", initials: "DK", role: "Employer", joined: "May 17, 2025", status: "Active" },
  { id: "u6", name: "Elena Torres", email: "elena.torres@careerconnect.com", initials: "ET", role: "Admin", joined: "Apr 4, 2025", status: "Active" },
  { id: "u7", name: "Nina Foster", email: "nina@commonground.org", initials: "NF", role: "Employer", joined: "May 12, 2025", status: "Active" },
  { id: "u8", name: "Owen Park", email: "owen@kindredfinance.com", initials: "OP", role: "Employer", joined: "May 9, 2025", status: "Active" },
  { id: "u9", name: "Priya Nair", email: "priya.nair@example.com", initials: "PN", role: "Applicant", joined: "May 3, 2025", status: "Active" },
];

export const initialCategories: Category[] = [
  { id: "c1", name: "Design", description: "Product, visual, brand, and experience design roles", jobCount: 184, icon: "design" },
  { id: "c2", name: "Engineering", description: "Software, infrastructure, data, and quality engineering", jobCount: 325, icon: "engineering" },
  { id: "c3", name: "People & HR", description: "People operations, recruiting, and talent development", jobCount: 92, icon: "people" },
  { id: "c4", name: "Marketing", description: "Growth, content, communications, and brand marketing", jobCount: 148, icon: "marketing" },
  { id: "c5", name: "Sales", description: "Business development, account management, and sales", jobCount: 118, icon: "sales" },
  { id: "c6", name: "Customer Success", description: "Customer experience, support, and implementation", jobCount: 74, icon: "support" },
];

export const topJobs: TopJob[] = [
  { id: "j1", title: "Product Designer", company: "Northstar Labs", applications: 2140 },
  { id: "j2", title: "Frontend Engineer", company: "Vela Health", applications: 1862 },
  { id: "j3", title: "Customer Success Lead", company: "Common Ground", applications: 1405 },
  { id: "j4", title: "Data Analyst", company: "Kindred Finance", applications: 1188 },
  { id: "j5", title: "Marketing Manager", company: "Northstar Labs", applications: 964 },
];
