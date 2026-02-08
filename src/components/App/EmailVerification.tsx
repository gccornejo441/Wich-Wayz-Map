import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { sendEmailVerification } from "firebase/auth";
import { auth } from "@services/firebase";
import { ROUTES } from "@constants/routes";
import Logo from "@components/Logo/Logo";
import { useToast } from "@context/toastContext";

const EmailVerification = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const email = location.state?.email;
  const [countdown, setCountdown] = useState(60);
  const [isResending, setIsResending] = useState(false);
  const [canResend, setCanResend] = useState(false);

  // Redirect if no email provided
  useEffect(() => {
    if (!email) {
      navigate(ROUTES.ACCOUNT.REGISTER);
    }
  }, [email, navigate]);

  // Countdown timer for resend button
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [countdown]);

  const handleResendEmail = async () => {
    if (!auth.currentUser || isResending || !canResend) return;

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

  return (
    <div className="bg-lightGray font-sans min-h-[100dvh] flex items-center justify-center px-4">
      <div className="max-w-md w-full p-8 bg-background rounded-xl shadow-card">
        <Link to="/" className="block mb-6">
          <Logo
            imageSource="/Wich-Wayz-Logo.svg"
            className="h-15 w-60 mx-auto"
          />
        </Link>

        {/* Email Icon */}
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 bg-secondary/10 rounded-full flex items-center justify-center">
            <svg
              className="w-10 h-10 text-secondary"
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

        <h2 className="text-accent text-2xl font-poppins font-bold text-center mb-4">
          Check Your Email
        </h2>

        <div className="space-y-4 mb-6">
          <p className="text-dark text-center">
            We've sent a verification email to:
          </p>
          <p className="text-primary font-semibold text-center break-all">
            {email}
          </p>
          <div className="bg-secondary/10 border border-secondary/20 rounded-lg p-4">
            <p className="text-dark text-sm mb-2">
              <strong>Next steps:</strong>
            </p>
            <ol className="text-dark text-sm list-decimal list-inside space-y-1">
              <li>Open the email we just sent</li>
              <li>Click the verification link</li>
              <li>Return here to sign in</li>
            </ol>
          </div>

          <p className="text-dark text-sm text-center text-muted">
            Didn't receive the email? Check your spam folder or request a new
            one below.
          </p>
        </div>

        {/* Resend Button */}
        <button
          onClick={handleResendEmail}
          disabled={!canResend || isResending}
          className={`w-full py-3 rounded-lg font-semibold transition-colors mb-4 ${
            canResend && !isResending
              ? "bg-secondary text-dark hover:bg-secondary/90"
              : "bg-gray-300 text-gray-500 cursor-not-allowed"
          }`}
        >
          {isResending
            ? "Sending..."
            : canResend
              ? "Resend Verification Email"
              : `Resend in ${countdown}s`}
        </button>

        {/* Sign In Link */}
        <Link
          to={`${ROUTES.ACCOUNT.SIGN_IN}?verified=pending`}
          className="block w-full py-3 text-center bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
        >
          Go to Sign In
        </Link>

        <p className="text-dark text-sm text-center mt-4">
          Wrong email?{" "}
          <Link
            to={ROUTES.ACCOUNT.REGISTER}
            className="text-primary font-semibold hover:underline"
          >
            Register again
          </Link>
        </p>
      </div>
    </div>
  );
};

export default EmailVerification;
