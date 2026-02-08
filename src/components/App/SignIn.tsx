import { useState, useEffect } from "react";
import { useAuth } from "../../context/authContext";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import Logo from "../Logo/Logo";
import { HiEye, HiEyeOff } from "react-icons/hi";
import { ROUTES } from "../../constants/routes";
import GoogleButton from "../Utilites/GoogleButton";
import { Checkbox, Label } from "flowbite-react";

const SignIn = () => {
  const { login, resetPassword, user, signInWithGoogle } = useAuth();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [showVerificationBanner, setShowVerificationBanner] = useState(false);
  const navigate = useNavigate();

  // Check if user came from email verification
  useEffect(() => {
    if (searchParams.get("verified") === "pending") {
      setShowVerificationBanner(true);
    }
  }, [searchParams]);

  useEffect(() => {
    if (user) {
      navigate("/");
    }
  }, [user, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (!email || !password) {
      setError("Email and password are required.");
      return;
    }

    const response = await login(email, password, rememberMe);
    if (!response.success) {
      setError(response.message);
    } else {
      setMessage("Login successful!");
      navigate("/");
    }
  };

  const handleResetPassword = async () => {
    setError(null);
    setMessage(null);

    const response = await resetPassword(email);
    if (!response.success) {
      setError(response.message);
    } else {
      setMessage("Password reset email sent successfully!");
    }
  };

  const handleGoogleSignIn = async () => {
    if (isLoading) return;

    setError(null);
    setMessage(null);
    setIsLoading(true);

    try {
      const response = await signInWithGoogle();
      if (!response.success) {
        setError(response.message);
      } else {
        setMessage("Google sign-in successful!");
        navigate("/");
      }
    } catch (error) {
      console.error("Google sign-in error:", error);

      if (error instanceof Error) {
        if (error.message.includes("auth/cancelled-popup-request")) {
          setError("Another sign-in request is in progress. Please wait.");
        } else if (error.message.includes("auth/popup-closed-by-user")) {
          setError("Google sign-in popup was closed. Please try again.");
        } else {
          setError("An unexpected error occurred.");
        }
      } else {
        setError("An unexpected error occurred.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] font-sans flex items-center justify-center px-4 bg-surface-light dark:bg-surface-dark">
      <div className="max-w-md w-full">
        <div className="p-6 rounded-xl bg-white dark:bg-surface-darker shadow-lg">
          <Link to="/" className="block">
            <Logo
              imageSource="/Wich-Wayz-Logo.svg"
              className="h-15 w-60 mx-auto"
            />
          </Link>
          <h2 className="text-text-base dark:text-white text-center text-2xl font-poppins font-bold">
            Sign in
          </h2>

          {/* Email Verification Banner */}
          {showVerificationBanner && (
            <div className="mt-4 p-4 bg-secondary/10 border border-secondary/30 rounded-lg">
              <div className="flex items-start gap-3">
                <svg
                  className="w-5 h-5 text-secondary flex-shrink-0 mt-0.5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                    clipRule="evenodd"
                  />
                </svg>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-dark dark:text-white">
                    Please verify your email first
                  </p>
                  <p className="text-sm text-dark dark:text-text-muted mt-1">
                    Check your inbox for the verification link before signing
                    in.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowVerificationBanner(false)}
                  className="text-dark dark:text-text-muted hover:text-brand-primary"
                >
                  <svg
                    className="w-5 h-5"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              </div>
            </div>
          )}

          <form className="mt-8 space-y-4" onSubmit={handleLogin}>
            <div>
              <label
                htmlFor="email"
                className="text-dark dark:text-white text-sm mb-2 block"
              >
                Email
              </label>
              <div className="relative flex items-center">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full text-dark dark:text-white text-sm border-2 border-brand-primary dark:border-gray-600 px-4 py-3 bg-white dark:bg-surface-dark focus:border-brand-primary rounded-md focus:outline-none focus:ring focus:ring-brand-primary"
                  placeholder="Enter your email"
                />
              </div>
            </div>
            <div>
              <label
                htmlFor="password"
                className="text-dark dark:text-white text-sm mb-2 block"
              >
                Password
              </label>
              <div className="relative flex items-center">
                <input
                  id="password"
                  name="password"
                  type={passwordVisible ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full text-dark dark:text-white text-sm border-2 border-brand-primary dark:border-gray-600 px-4 py-3 bg-white dark:bg-surface-dark focus:border-brand-primary rounded-md focus:outline-none focus:ring focus:ring-brand-primary"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  className="absolute right-4 text-brand-primary dark:text-text-muted focus:outline-none"
                  onClick={() => setPasswordVisible(!passwordVisible)}
                >
                  {passwordVisible ? <HiEyeOff /> : <HiEye />}
                </button>
              </div>
            </div>

            {error && (
              <p className="text-brand-primary dark:text-brand-secondary mb-4 text-sm">
                {error}
              </p>
            )}
            {message && (
              <p className="text-brand-primary dark:text-brand- mb-4 text-sm">
                {message}
              </p>
            )}

            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="remember-me"
                  name="remember-me"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="accent-brand-primary dark:border-text-muted dark:bg-transparent checked:text-brand-primary checked:bg-brand-primary focus:ring-brand-primary"
                />
                <Label
                  htmlFor="remember-me"
                  className="text-sm text-text-base dark:text-white"
                >
                  Remember me
                </Label>
              </div>
              <div className="text-sm">
                <button
                  type="button"
                  onClick={handleResetPassword}
                  className="text-text-base dark:text-white hover:underline "
                >
                  Forgot your password?
                </button>
              </div>
            </div>

            <div className="!mt-8">
              <button
                type="submit"
                className="w-full py-3 px-4 text-sm tracking-wide rounded-lg bg-brand-primary text-text-inverted hover:bg-brand-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-primary transition-colors duration-150"
              >
                Sign in
              </button>
            </div>

            <div className="!mt-4">
              <GoogleButton
                disabled={isLoading}
                handleClick={handleGoogleSignIn}
                title="Sign in with Google"
              />
            </div>

            <p className="text-text-base dark:text-white text-sm !mt-8 text-center">
              Don't have an account?
              <Link
                to={ROUTES.ACCOUNT.REGISTER}
                className="text-text-base dark:text-text-inverted hover:underline ml-1 font-semibold"
              >
                Register here
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
};

export default SignIn;
