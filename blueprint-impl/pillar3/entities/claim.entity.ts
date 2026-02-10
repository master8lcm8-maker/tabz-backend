export type ClaimEntity = {
  id: string;
  dropId: string;
  venueId: string;
  userId: string;
  createdAt: string;
  status: "OK" | "REJECTED";
  reasonCode?: string;
};
