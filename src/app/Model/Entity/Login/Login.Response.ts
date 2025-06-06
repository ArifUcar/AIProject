export interface LoginResponse {
    accessToken: string;
    refreshToken: string;
    expiresAt: string;
    tokenType: string;
    user: {
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
    };
  }