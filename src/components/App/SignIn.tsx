import { useState, useEffect } from "react";
import { useAuth } from "../../context/authContext";
import { Link, useNavigate } from "react-router-dom";
import Logo from "../Logo/Logo";
import { HiEye, HiEyeOff } from "react-icons/hi";
import { ROUTES } from "../../constants/routes";
import GoogleButton from "../Utilites/GoogleButton";
import { Checkbox, Label } from "flowbite-react";

const SignIn = () => {
  const { login, resetPassword, user, signInWithGoogle } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const navigate = useNavigate();

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
                  type="email"
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
                  type={passwordVisible ? "text" : "password"}
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
