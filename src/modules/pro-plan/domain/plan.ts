/** Reader "Pro plan": one payment, lifetime access. Shown on /dashboard/pro.
 * The price is a placeholder until the owner confirms the real amount. No payment gateway is
 * connected yet; when one is, the order amount must come from `proPlanAmounts()` on the server. */

/** Plan price in rupees, before GST. */
export const PRO_PLAN_PRICE_INR = 4999;

/** GST charged on top of the plan price. */
export const PRO_PLAN_GST_RATE = 0.18;

/** Price, GST and total payable, in rupees (GST rounded to the paisa). */
export function proPlanAmounts(): { price: number; gst: number; total: number } {
  const gst = Math.round(PRO_PLAN_PRICE_INR * PRO_PLAN_GST_RATE * 100) / 100;
  return { price: PRO_PLAN_PRICE_INR, gst, total: PRO_PLAN_PRICE_INR + gst };
}
