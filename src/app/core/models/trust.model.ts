export interface BlockedUser {
  uid: string;
  displayName: string;
}

export interface BlockedUsersPage {
  items: BlockedUser[];
  nextCursor: string | null;
}
