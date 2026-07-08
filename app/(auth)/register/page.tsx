import { isGoogleAuthConfigured } from "@/lib/auth/google";
import { RegisterForm } from "./register-form";

export default async function RegisterPage() {
  return <RegisterForm googleEnabled={isGoogleAuthConfigured()} />;
}
