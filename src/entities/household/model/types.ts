export type HouseholdMemberView = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  username: string | null;
  role: "owner" | "member";
};
