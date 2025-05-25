export interface RegisterResponse {
    id: string;
    firstName: string;
    lastName: string;
    userName: string;
    email: string;
    phoneNumber: string;
    address: string;
    city: string;
    region: string;
    country: string;
    postalCode: string;
    isEmailConfirmed: boolean;
    isPhoneNumberConfirmed: boolean;
    createdDate: string;
    roles: string[];
  }
  