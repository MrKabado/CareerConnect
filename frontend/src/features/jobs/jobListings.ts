export type JobListing = {
  id: string;
  listingId?: number;
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
