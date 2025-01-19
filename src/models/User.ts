export interface User {
  id?: number;
  email: string;
  hashed_password?: string;
  username?: string;
  verified?: boolean;
  verification_token?: string;
  modified_by?: string;
  date_created?: string;
  date_modified?: string;
  membership_status?: string;
  first_name?: string;
  last_name?: string;
  role?: string;
  account_status?: string;
  last_login?: string;
  avatar?: string;
  token_expiry?: string;
  reset_token?: string;
}
