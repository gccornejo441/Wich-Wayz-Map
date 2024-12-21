import { useState, useEffect } from "react";
import { useAuth } from "../../context/authContext";
import { Link, useNavigate } from "react-router-dom";
import Logo from "../Logo/Logo";
import { HiEye, HiEyeOff } from "react-icons/hi";
import { ROUTES } from "../../constants/routes";
import GoogleButton from "../Utilites/GoogleButton";

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
    <div className="bg-lightGray font-sans min-h-screen flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="p-6 rounded-xl bg-white shadow-lg">
          <Link to="/" className="block">
            <Logo
              imageSource="/Wich-Wayz-Logo.svg"
              className="h-15 w-60 mx-auto"
            />
          </Link>
          <h2 className="text-accent text-center text-2xl font-poppins font-bold">
            Sign in
          </h2>
          <form className="mt-8 space-y-4" onSubmit={handleLogin}>
            <div>
              <label className="text-dark text-sm mb-2 block">Email</label>
              <div className="relative flex items-center">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full text-dark text-sm border border-lightGray px-4 py-3 rounded-md focus:outline-none focus:ring focus:ring-secondary"
                  placeholder="Enter your email"
                />
              </div>
            </div>
            <div>
              <label className="text-dark text-sm mb-2 block">Password</label>
              <div className="relative flex items-center">
                <input
                  type={passwordVisible ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full text-dark text-sm border border-lightGray px-4 py-3 rounded-md focus:outline-none focus:ring focus:ring-secondary"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  className="absolute right-4 text-dark focus:outline-none"
                  onClick={() => setPasswordVisible(!passwordVisible)}
                >
                  {passwordVisible ? (
                    <HiEyeOff className="text-primary" />
                  ) : (
                    <HiEye className="text-primary" />
                  )}{" "}
                </button>
              </div>
            </div>
            {error && <p className="text-primary mb-4 text-sm">{error}</p>}
            {message && (
              <p className="text-secondary mb-4 text-sm">{message}</p>
            )}
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 text-primary focus:ring-secondary border-accent rounded"
                />
                <label htmlFor="remember-me" className="ml-3 text-sm text-dark">
                  Remember me
                </label>
              </div>
              <div className="text-sm">
                <button
                  type="button"
                  onClick={handleResetPassword}
                  className="text-primary hover:underline font-semibold"
                >
                  Forgot your password?
                </button>
              </div>
            </div>
            <div className="!mt-8">
              <button
                type="submit"
                className="w-full py-3 px-4 text-sm tracking-wide rounded-lg text-white bg-primary hover:bg-primary/90 focus:outline-none"
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
            <p className="text-dark text-sm !mt-8 text-center">
              Don't have an account?{" "}
              <Link
                to={ROUTES.ACCOUNT.REGISTER}
                className="text-primary hover:underline ml-1 font-semibold"
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
