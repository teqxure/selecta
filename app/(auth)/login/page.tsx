import { isGoogleAuthConfigured } from "@/lib/auth/google";
import { LoginForm } from "./login-form";

const OAUTH_ERROR_MESSAGES: Record<string, string> = {
  google_denied: "Google sign-in was cancelled.",
  google_failed: "Google sign-in failed. Please try again or use your email and password.",
  google_not_configured: "Google sign-in is not available right now.",
  account_inactive: "Your account is inactive. Please contact support to reactivate it.",
  account_suspended: "Your account has been suspended. Please contact support.",
  account_banned: "Your account has been banned.",
};

interface LoginPageProps {
  searchParams: Promise<{ error?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { error } = await searchParams;

  return <LoginForm googleEnabled={isGoogleAuthConfigured()} oauthError={error ? OAUTH_ERROR_MESSAGES[error] : undefined} />;
}
