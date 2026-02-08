import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { HiEye, HiEyeOff, HiX } from "react-icons/hi";
import { Checkbox, Label } from "flowbite-react";
import { useNavigate } from "react-router-dom";
import { sendEmailVerification } from "firebase/auth";

import { useAuth } from "@/context/authContext";
import { useModal } from "@/context/modalContext";
import { useToast } from "@/context/toastContext";
import { registerSchema } from "@/constants/validators";
import { auth } from "@services/firebase";
import GoogleButton from "@components/Utilites/GoogleButton";
import Logo from "@components/Logo/Logo";

const AuthModal = () => {
  const {
    currentModal,
    loginMode,
    closeModal,
    switchToLogin,
    switchToSignup,
    openEmailVerificationModal,
    verificationEmail,
  } = useModal();
  const {
    login,
    register: registerUser,
    resetPassword,
    signInWithGoogle,
  } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  // Shared state
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [isResending, setIsResending] = useState(false);
  const [canResend, setCanResend] = useState(false);

  // Sign In specific state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);

  // Register form
  const {
    handleSubmit,
    control,
    formState: { errors },
    reset,
  } = useForm({
    resolver: yupResolver(registerSchema),
  });

  const isEmailVerification = currentModal === "emailVerification";
  const isOpen =
    currentModal === "login" ||
    currentModal === "signup" ||
    isEmailVerification;

  useEffect(() => {
    if (!isEmailVerification) return;

    setCountdown(60);
    setCanResend(false);
    setIsResending(false);
  }, [isEmailVerification, verificationEmail]);

  useEffect(() => {
    if (!isEmailVerification) return;

    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }

    setCanResend(true);
  }, [countdown, isEmailVerification]);

  const handleClose = () => {
    closeModal();
    setError(null);
    setMessage(null);
    setCountdown(60);
    setCanResend(false);
    setIsResending(false);
    setEmail("");
    setPassword("");
    setRememberMe(false);
    setPasswordVisible(false);
    reset();
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isLoading) return;

    setError(null);
    setMessage(null);

    if (!email || !password) {
      setError("Email and password are required.");
      return;
    }

    setIsLoading(true);

    try {
      const response = await login(email, password, rememberMe);
      if (!response.success) {
        setError(response.message);
      } else {
        addToast("Signed in successfully!", "success");
        handleClose();
        navigate("/");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (data: { email: string; password: string }) => {
    setError(null);
    setMessage(null);

    const response = await registerUser(data.email, data.password);
    if (!response.success) {
      setError(response.message);
    } else {
      reset();
      openEmailVerificationModal(data.email);
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

  const handleGoogleAuth = async () => {
    if (isLoading) return;

    setError(null);
    setMessage(null);
    setIsLoading(true);

    try {
      const response = await signInWithGoogle();
      if (!response.success) {
        setError(response.message);
      } else {
        addToast("Signed in successfully!", "success");
        handleClose();
        navigate("/");
      }
    } catch (error) {
      console.error("Google auth error:", error);
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

  const handleResendEmail = async () => {
    if (isResending || !canResend) return;

    if (!auth.currentUser) {
      addToast(
        "Please sign in again to resend the verification email.",
        "error",
      );
      return;
    }

    setIsResending(true);
    try {
      await sendEmailVerification(auth.currentUser);
      addToast("Verification email sent! Check your inbox.", "success");
      setCountdown(60);
      setCanResend(false);
    } catch (error) {
      console.error("Error resending verification email:", error);
      addToast("Failed to resend email. Please try again.", "error");
    } finally {
      setIsResending(false);
    }
  };

  const handleGoToSignIn = () => {
    setError(null);
    setMessage(null);
    if (verificationEmail) {
      setEmail(verificationEmail);
    }
    switchToLogin();
  };

  const handleGoToRegister = () => {
    setError(null);
    setMessage(null);
    switchToSignup();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <button
        type="button"
        tabIndex={-1}
        className="fixed inset-0 bg-black/50 z-40 animate-fade-in border-0 p-0 cursor-default"
        onClick={handleClose}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            handleClose();
          }
        }}
        aria-label="Close modal"
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          role="dialog"
          aria-modal="true"
          tabIndex={-1}
          className="relative bg-white dark:bg-surface-darker rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto pointer-events-auto animate-modalEnter"
        >
          {/* Close button */}
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 text-text-muted hover:text-text-base dark:text-text-inverted dark:hover:text-white transition-colors z-10"
            aria-label="Close modal"
          >
            <HiX size={24} />
          </button>

          <div className="p-6">
            <Logo
              imageSource="/Wich-Wayz-Logo.svg"
              className="h-15 w-60 mx-auto mb-4"
            />

            {!isEmailVerification && (
              <h2 className="text-text-base dark:text-white text-center text-2xl font-poppins font-bold mb-6">
                {loginMode ? "Sign in" : "Register"}
              </h2>
            )}

            {isEmailVerification ? (
              <div className="space-y-6">
                <div className="flex justify-center">
                  <div className="w-20 h-20 bg-brand-secondary/10 rounded-full flex items-center justify-center">
                    <svg
                      className="w-10 h-10 text-brand-secondary"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                      />
                    </svg>
                  </div>
                </div>

                <h2 className="text-text-base dark:text-white text-center text-2xl font-poppins font-bold">
                  Check Your Email
                </h2>

                <div className="space-y-4">
                  <p className="text-dark dark:text-white text-center text-sm">
                    We've sent a verification email to:
                  </p>
                  <p className="text-brand-primary dark:text-brand-secondary font-semibold text-center break-all text-sm">
                    {verificationEmail || "your email address"}
                  </p>
                  <div className="bg-brand-secondary/10 border border-brand-secondary/20 rounded-lg p-4">
                    <p className="text-dark dark:text-white text-sm mb-2">
                      <strong>Next steps:</strong>
                    </p>
                    <ol className="text-dark dark:text-white text-sm list-decimal list-inside space-y-1">
                      <li>Open the email we just sent</li>
                      <li>Click the verification link</li>
                      <li>Return here to sign in</li>
                    </ol>
                  </div>
                  <p className="text-dark dark:text-text-muted text-sm text-center">
                    Didn't receive the email? Check your spam folder or request
                    a new one below.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleResendEmail}
                  disabled={!canResend || isResending}
                  className={`w-full py-3 rounded-lg font-semibold transition-colors ${
                    canResend && !isResending
                      ? "bg-brand-secondary text-dark hover:bg-brand-secondary/90"
                      : "bg-gray-300 text-gray-500 cursor-not-allowed"
                  }`}
                >
                  {isResending
                    ? "Sending..."
                    : canResend
                      ? "Resend Verification Email"
                      : `Resend in ${countdown}s`}
                </button>

                <button
                  type="button"
                  onClick={handleGoToSignIn}
                  className="w-full py-3 text-center bg-brand-primary text-text-inverted rounded-lg hover:bg-brand-primary/90 transition-colors"
                >
                  Go to Sign In
                </button>

                <p className="text-dark dark:text-white text-sm text-center">
                  Wrong email?{" "}
                  <button
                    type="button"
                    onClick={handleGoToRegister}
                    className="text-brand-primary dark:text-brand-secondary font-semibold hover:underline"
                  >
                    Register again
                  </button>
                </p>
              </div>
            ) : loginMode ? (
              // SIGN IN FORM
              <form className="space-y-4" onSubmit={handleLogin}>
                <div>
                  <label
                    htmlFor="modal-email"
                    className="text-dark dark:text-white text-sm mb-2 block"
                  >
                    Email
                  </label>
                  <input
                    id="modal-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full text-dark dark:text-white text-sm border-2 border-brand-primary dark:border-gray-600 px-4 py-3 bg-white dark:bg-surface-dark focus:border-brand-primary rounded-md focus:outline-none focus:ring focus:ring-brand-primary"
                    placeholder="Enter your email"
                  />
                </div>

                <div>
                  <label
                    htmlFor="modal-password"
                    className="text-dark dark:text-white text-sm mb-2 block"
                  >
                    Password
                  </label>
                  <div className="relative flex items-center">
                    <input
                      id="modal-password"
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
                  <p className="text-brand-primary dark:text-brand-secondary text-sm">
                    {error}
                  </p>
                )}
                {message && (
                  <p className="text-green-600 dark:text-green-400 text-sm">
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
                      className="text-text-base dark:text-white hover:underline"
                    >
                      Forgot password?
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 px-4 text-sm tracking-wide rounded-lg bg-brand-primary text-text-inverted hover:bg-brand-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-primary transition-colors duration-150"
                >
                  Sign in
                </button>

                <GoogleButton
                  disabled={isLoading}
                  handleClick={handleGoogleAuth}
                  title="Sign in with Google"
                />

                <p className="text-text-base dark:text-white text-sm text-center">
                  Don't have an account?{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setError(null);
                      setMessage(null);
                      switchToSignup();
                    }}
                    className="text-brand-primary dark:text-brand-secondary hover:underline font-semibold"
                  >
                    Register here
                  </button>
                </p>
              </form>
            ) : (
              // REGISTER FORM
              <form
                className="space-y-4"
                onSubmit={handleSubmit(handleRegister)}
              >
                <div>
                  <label
                    htmlFor="register-email"
                    className="block text-dark dark:text-white text-sm mb-2"
                  >
                    Email
                  </label>
                  <Controller
                    name="email"
                    control={control}
                    render={({ field }) => (
                      <input
                        {...field}
                        id="register-email"
                        type="email"
                        className="w-full border border-lightGray dark:border-gray-600 px-4 py-3 rounded-md text-dark dark:text-white bg-white dark:bg-surface-dark focus:outline-none focus:ring focus:ring-brand-secondary"
                        placeholder="Enter your email"
                      />
                    )}
                  />
                  {errors.email && (
                    <p className="text-brand-primary dark:text-brand-secondary text-sm mt-1">
                      {errors.email.message}
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="register-password"
                    className="block text-dark dark:text-white text-sm mb-2"
                  >
                    Password
                  </label>
                  <Controller
                    name="password"
                    control={control}
                    render={({ field }) => (
                      <input
                        {...field}
                        id="register-password"
                        type="password"
                        className="w-full border border-lightGray dark:border-gray-600 px-4 py-3 rounded-md text-dark dark:text-white bg-white dark:bg-surface-dark focus:outline-none focus:ring focus:ring-brand-secondary"
                        placeholder="Enter your password"
                      />
                    )}
                  />
                  {errors.password && (
                    <p className="text-brand-primary dark:text-brand-secondary text-sm mt-1">
                      {errors.password.message}
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="register-confirm-password"
                    className="block text-dark dark:text-white text-sm mb-2"
                  >
                    Confirm Password
                  </label>
                  <Controller
                    name="confirmPassword"
                    control={control}
                    render={({ field }) => (
                      <input
                        {...field}
                        id="register-confirm-password"
                        type="password"
                        className="w-full border border-gray-200 dark:border-gray-600 px-4 py-3 rounded-md text-dark dark:text-white bg-white dark:bg-surface-dark focus:outline-none focus:ring focus:ring-brand-secondary"
                        placeholder="Confirm your password"
                      />
                    )}
                  />
                  {errors.confirmPassword && (
                    <p className="text-brand-primary dark:text-brand-secondary text-sm mt-1">
                      {errors.confirmPassword.message}
                    </p>
                  )}
                </div>

                {error && (
                  <p className="text-brand-primary dark:text-brand-secondary text-sm">
                    {error}
                  </p>
                )}
                {message && (
                  <p className="text-green-600 dark:text-green-400 text-sm">
                    {message}
                  </p>
                )}

                <button
                  type="submit"
                  className="w-full py-3 bg-brand-primary text-white rounded-lg hover:bg-brand-primary/90 focus:outline-none"
                >
                  Register
                </button>

                <GoogleButton
                  disabled={isLoading}
                  title="Sign up with Google"
                  handleClick={handleGoogleAuth}
                />

                <p className="text-dark dark:text-white text-sm text-center">
                  Already have an account?{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setError(null);
                      setMessage(null);
                      switchToLogin();
                    }}
                    className="text-brand-primary dark:text-brand-secondary font-semibold hover:underline"
                  >
                    Sign in
                  </button>
                </p>
              </form>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default AuthModal;
