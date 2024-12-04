import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2024-11-20.acacia",
});

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const { userId, email } = req.body;

  if (!userId || !email) {
    return res.status(400).json({ error: "Missing user metadata" });
  }
  try {
    const redirectUrl = `https://www.wichwayz.com/payment-success?userId=${userId}`;

    const paymentLink = await stripe.paymentLinks.create({
      line_items: [
        {
          price: "price_1QN3orG3MtoJKZ2HI4Ja1ihs",
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
        userId,
        email,
      },
      payment_intent_data: {
        metadata: {
          userId,
          email,
        },
      },
    });

    res.status(200).json({ url: paymentLink.url });
  } catch (error) {
    console.error("Error creating payment link:", error.message);
    res.status(500).json({ error: "Failed to create payment link" });
  }
}
