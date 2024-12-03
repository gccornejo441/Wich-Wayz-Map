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
      throw new Error("Failed to create payment link.");
    }

    const data = await response.json();
    return data.url;
  } catch (error) {
    console.error("Error creating payment link:", error);
    throw error;
  }
};
