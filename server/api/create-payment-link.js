import Stripe from "stripe";

/**
 * Handles POST requests to create a payment link for a user.
 *
 * POST /api/create-payment-link
 */
export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const { userId, email } = req.body;

  if (userId === undefined || userId === null || !email) {
    return res.status(400).json({ error: "Missing user metadata" });
  }

  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecretKey) {
    console.error(
      "Error creating payment link: missing STRIPE_SECRET_KEY environment variable",
    );
    return res.status(500).json({
      error: "Failed to create payment link",
      message: "Payment service is not configured.",
    });
  }

  const membershipPriceId =
    process.env.STRIPE_MEMBERSHIP_PRICE_ID || "price_1QN3orG3MtoJKZ2HI4Ja1ihs";

  if (!process.env.STRIPE_MEMBERSHIP_PRICE_ID) {
    console.warn(
      "STRIPE_MEMBERSHIP_PRICE_ID is not set; falling back to default price ID.",
    );
  }

  const stripe = new Stripe(stripeSecretKey, {
    apiVersion: "2024-11-20.acacia",
  });

  const normalizedUserId = String(userId).trim();
  const normalizedEmail = String(email).trim();

  if (!normalizedUserId || !normalizedEmail) {
    return res.status(400).json({ error: "Missing user metadata" });
  }

  try {
    const redirectUrl = `https://www.wichwayz.com/payment-success?userId=${encodeURIComponent(normalizedUserId)}`;

    const paymentLink = await stripe.paymentLinks.create({
      line_items: [
        {
          price: membershipPriceId,
          quantity: 1,
        },
      ],
      after_completion: {
        type: "redirect",
        redirect: {
          url: redirectUrl,
        },
      },
      metadata: {
        userId: normalizedUserId,
        email: normalizedEmail,
      },
      payment_intent_data: {
        metadata: {
          userId: normalizedUserId,
          email: normalizedEmail,
        },
      },
    });

    res.status(200).json({ url: paymentLink.url });
  } catch (error) {
    const message =
      error && typeof error === "object" && "message" in error
        ? error.message
        : "Unknown error";
    const code =
      error && typeof error === "object" && "code" in error
        ? error.code
        : "unknown";

    console.error("Error creating payment link:", { code, message });

    res.status(500).json({
      error: "Failed to create payment link",
      message: "Unable to create a checkout link right now. Please try again.",
    });
  }
}
