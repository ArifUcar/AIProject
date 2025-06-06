export interface LoginRequest {
    EmailOrUsername: string;
    password: string;
    rememberMe?: boolean;
}