// app/routes/app.billing/route.jsx
import { useLoaderData, useActionData, Form } from "react-router";
import { useEffect } from "react";
import { authenticate } from "../../shopify.server";
import { BILLING_PLANS } from "../../config/billing";
import { getUsageStats, getShopPlan } from "../../lib/usage-limits";

export const loader = async ({ request }) => {
  const { billing, session } = await authenticate.admin(request);

  // Get current subscription status
  const hasActivePayment = await billing.check({
    plans: Object.values(BILLING_PLANS).map((plan) => plan.name),
    isTest: true, // Set to false in production
  });

  // Get comprehensive usage stats
  const usage = await getUsageStats(session.shop);
  const currentPlan = await getShopPlan(session.shop);

  return {
    plans: Object.values(BILLING_PLANS),
    currentPlan: currentPlan.name,
    hasActivePayment,
    usage,
    planLimits: currentPlan.limits,
    shop: session.shop,
  };
};

export const action = async ({ request }) => {
  const { billing } = await authenticate.admin(request);
  
  const formData = await request.formData();
  const planId = formData.get("planId");
  
  const plan = BILLING_PLANS[planId.toUpperCase()];
  
  if (!plan) {
    return { error: "Invalid plan selected" };
  }

  try {
    // Get return URL from request origin
    const origin = request.headers.get("origin") || new URL(request.url).origin;
    
    // Create billing request (plan configuration is in shopify.server.js)
    const billingCheck = await billing.request({
      plan: plan.name,
      isTest: true, // Set to false in production
      returnUrl: `${origin}/app/billing?plan=${planId}`,
    });

    // Redirect to Shopify billing confirmation
    return { confirmationUrl: billingCheck.confirmationUrl };
  } catch (error) {
    console.error("Billing request failed:", error);
    return { error: error.message || "Failed to create billing request" };
  }
};

export default function BillingPage() {
  const { plans, currentPlan, hasActivePayment, usage, planLimits } = useLoaderData();
  const actionData = useActionData();

  // Handle redirect to Shopify billing (only once, using useEffect)
  useEffect(() => {
    if (actionData?.confirmationUrl) {
      window.top.location.href = actionData.confirmationUrl;
    }
  }, [actionData?.confirmationUrl]);

  // Show loading state while redirecting
  if (actionData?.confirmationUrl) {
    return (
      <s-page heading="Redirecting to billing...">
        <s-section>
          <s-paragraph>Please wait while we redirect you to complete your subscription.</s-paragraph>
        </s-section>
      </s-page>
    );
  }

  return (
    <s-page heading="Billing & Plans">
      {hasActivePayment && (
        <s-section variant="success">
          <s-paragraph>
            ✅ You have an active subscription. Thank you for using UGCfy!
          </s-paragraph>
        </s-section>
      )}

      {actionData?.error && (
        <s-section variant="critical">
          <s-paragraph>{actionData.error}</s-paragraph>
        </s-section>
      )}

      <s-section>
        <s-paragraph>
          Choose the plan that fits your business needs. All plans include a free trial.
        </s-paragraph>
      </s-section>

      {/* Current Usage */}
      <s-section>
        <div style={{ background: "#f9f9f9", padding: "1.5rem", borderRadius: "8px", marginBottom: "2rem" }}>
          <h3 style={{ margin: "0 0 1rem 0" }}>Current Usage ({currentPlan})</h3>
          
          <div style={{ display: "grid", gap: "1rem" }}>
            {/* Media Items */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                <span style={{ color: "#666", fontSize: "0.9rem" }}>Media Items</span>
                <span style={{ fontWeight: "600" }}>
                  {usage.mediaItems} / {planLimits.mediaItems === -1 ? "Unlimited" : planLimits.mediaItems}
                </span>
              </div>
              {planLimits.mediaItems !== -1 && (
                <div
                  style={{
                    width: "100%",
                    height: "6px",
                    background: "#e0e0e0",
                    borderRadius: "3px",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${Math.min(100, (usage.mediaItems / planLimits.mediaItems) * 100)}%`,
                      height: "100%",
                      background: usage.mediaItems >= planLimits.mediaItems ? "#dc3545" : usage.mediaItems >= planLimits.mediaItems * 0.75 ? "#f49342" : "#008060",
                    }}
                  />
                </div>
              )}
            </div>

            {/* Widgets */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                <span style={{ color: "#666", fontSize: "0.9rem" }}>Active Widgets</span>
                <span style={{ fontWeight: "600" }}>
                  {usage.widgets} / {planLimits.widgets === -1 ? "Unlimited" : planLimits.widgets}
                </span>
              </div>
              {planLimits.widgets !== -1 && (
                <div
                  style={{
                    width: "100%",
                    height: "6px",
                    background: "#e0e0e0",
                    borderRadius: "3px",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${Math.min(100, (usage.widgets / planLimits.widgets) * 100)}%`,
                      height: "100%",
                      background: usage.widgets >= planLimits.widgets ? "#dc3545" : usage.widgets >= planLimits.widgets * 0.75 ? "#f49342" : "#008060",
                    }}
                  />
                </div>
              )}
            </div>

            {/* Monthly Imports */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                <span style={{ color: "#666", fontSize: "0.9rem" }}>Imports This Month</span>
                <span style={{ fontWeight: "600" }}>
                  {usage.imports} / {planLimits.imports === -1 ? "Unlimited" : planLimits.imports}
                </span>
              </div>
              {planLimits.imports !== -1 && (
                <div
                  style={{
                    width: "100%",
                    height: "6px",
                    background: "#e0e0e0",
                    borderRadius: "3px",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${Math.min(100, (usage.imports / planLimits.imports) * 100)}%`,
                      height: "100%",
                      background: usage.imports >= planLimits.imports ? "#dc3545" : usage.imports >= planLimits.imports * 0.75 ? "#f49342" : "#008060",
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </s-section>

      {/* Pricing Plans */}
      <s-section>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1.5rem" }}>
          {plans.map((plan) => (
            <div
              key={plan.id}
              style={{
                border: plan.popular ? "2px solid #0066cc" : "1px solid #e0e0e0",
                borderRadius: "12px",
                padding: "1.5rem",
                position: "relative",
                background: "white",
              }}
            >
              {plan.popular && (
                <div
                  style={{
                    position: "absolute",
                    top: "-12px",
                    right: "20px",
                    background: "#0066cc",
                    color: "white",
                    padding: "4px 12px",
                    borderRadius: "12px",
                    fontSize: "0.75rem",
                    fontWeight: "600",
                  }}
                >
                  MOST POPULAR
                </div>
              )}

              <h3 style={{ margin: "0 0 0.5rem 0", fontSize: "1.25rem" }}>{plan.name}</h3>
              
              <div style={{ marginBottom: "1rem" }}>
                <span style={{ fontSize: "2.5rem", fontWeight: "700" }}>${plan.price}</span>
                <span style={{ color: "#666", fontSize: "0.9rem" }}>/month</span>
              </div>

              <p style={{ color: "#666", fontSize: "0.9rem", marginBottom: "1rem" }}>
                {plan.trialDays}-day free trial
              </p>

              <ul style={{ listStyle: "none", padding: 0, margin: "0 0 1.5rem 0" }}>
                {plan.features.map((feature, idx) => (
                  <li
                    key={idx}
                    style={{
                      padding: "0.5rem 0",
                      borderBottom: "1px solid #f0f0f0",
                      fontSize: "0.9rem",
                    }}
                  >
                    <span style={{ color: "#28a745", marginRight: "0.5rem" }}>✓</span>
                    {feature}
                  </li>
                ))}
              </ul>

              <Form method="post">
                <input type="hidden" name="planId" value={plan.id} />
                <button
                  type="submit"
                  style={{
                    width: "100%",
                    background: plan.popular ? "#0066cc" : "#f0f0f0",
                    color: plan.popular ? "white" : "#333",
                    border: "none",
                    padding: "0.75rem",
                    borderRadius: "6px",
                    fontSize: "1rem",
                    fontWeight: "600",
                    cursor: "pointer",
                  }}
                >
                  {hasActivePayment ? "Switch Plan" : "Start Free Trial"}
                </button>
              </Form>
            </div>
          ))}
        </div>
      </s-section>

      {/* FAQ */}
      <s-section>
        <div style={{ marginTop: "3rem", padding: "2rem", background: "#f9f9f9", borderRadius: "8px" }}>
          <h3 style={{ margin: "0 0 1rem 0" }}>Frequently Asked Questions</h3>
          
          <div style={{ marginBottom: "1rem" }}>
            <strong>Can I change plans later?</strong>
            <p style={{ margin: "0.25rem 0 0 0", color: "#666" }}>
              Yes! You can upgrade or downgrade at any time. Changes take effect immediately.
            </p>
          </div>

          <div style={{ marginBottom: "1rem" }}>
            <strong>What happens after the free trial?</strong>
            <p style={{ margin: "0.25rem 0 0 0", color: "#666" }}>
              Your subscription will automatically start after the trial period. Cancel anytime before the trial ends at no charge.
            </p>
          </div>

          <div>
            <strong>Can I cancel my subscription?</strong>
            <p style={{ margin: "0.25rem 0 0 0", color: "#666" }}>
              Yes, you can cancel anytime from your Shopify admin. You&apos;ll retain access until the end of your billing period.
            </p>
          </div>
        </div>
      </s-section>
    </s-page>
  );
}

