/**
 * Creates a payment link for a user.
 *
 * @param userId - The ID of the user to create a payment link for.
 * @param email - The email address of the user.
 * @returns A URL to a payment link for the user.
 * @throws An error if the payment link cannot be created.
 */
interface PaymentLinkResponse {
  url?: string;
  error?: string;
  message?: string;
}

const getPaymentLinkErrorMessage = async (response: Response) => {
  try {
    const contentType = response.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      const payload = (await response.json()) as PaymentLinkResponse;
      return (
        payload.message || payload.error || "Failed to create payment link."
      );
    }

    const text = await response.text();
    return text || "Failed to create payment link.";
  } catch {
    return "Failed to create payment link.";
  }
};

export const createPaymentLink = async (
  userId: number | undefined,
  email: string | undefined,
) => {
  try {
    const response = await fetch("/api/create-payment-link", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ userId, email }),
    });

    if (!response.ok) {
      const message = await getPaymentLinkErrorMessage(response);
      throw new Error(message);
    }

    const data = (await response.json()) as PaymentLinkResponse;
    if (!data.url) {
      throw new Error("Payment link response did not include a URL.");
    }

    return data.url;
  } catch (error) {
    console.error("Error creating payment link:", error);
    throw error;
  }
};
