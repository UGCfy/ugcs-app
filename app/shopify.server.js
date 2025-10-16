import "@shopify/shopify-app-react-router/adapters/node";
import {
  ApiVersion,
  AppDistribution,
  shopifyApp,
  BillingInterval,
} from "@shopify/shopify-app-react-router/server";
import { PrismaSessionStorage } from "@shopify/shopify-app-session-storage-prisma";
import prisma from "./db.server";
import { BILLING_PLANS } from "./config/billing";

const shopify = shopifyApp({
  apiKey: process.env.SHOPIFY_API_KEY,
  apiSecretKey: process.env.SHOPIFY_API_SECRET || "",
  apiVersion: ApiVersion.October25,
  scopes: process.env.SCOPES?.split(","),
  appUrl: process.env.SHOPIFY_APP_URL || "",
  authPathPrefix: "/auth",
  sessionStorage: new PrismaSessionStorage(prisma),
  distribution: AppDistribution.AppStore,
  billing: {
    [BILLING_PLANS.STARTER.name]: {
      lineItems: [
        {
          amount: BILLING_PLANS.STARTER.price,
          currencyCode: BILLING_PLANS.STARTER.currency,
          interval: BillingInterval.Every30Days,
        },
      ],
      trialDays: BILLING_PLANS.STARTER.trialDays,
    },
    [BILLING_PLANS.PRO.name]: {
      lineItems: [
        {
          amount: BILLING_PLANS.PRO.price,
          currencyCode: BILLING_PLANS.PRO.currency,
          interval: BillingInterval.Every30Days,
        },
      ],
      trialDays: BILLING_PLANS.PRO.trialDays,
    },
    [BILLING_PLANS.ENTERPRISE.name]: {
      lineItems: [
        {
          amount: BILLING_PLANS.ENTERPRISE.price,
          currencyCode: BILLING_PLANS.ENTERPRISE.currency,
          interval: BillingInterval.Every30Days,
        },
      ],
      trialDays: BILLING_PLANS.ENTERPRISE.trialDays,
    },
  },
  ...(process.env.SHOP_CUSTOM_DOMAIN
    ? { customShopDomains: [process.env.SHOP_CUSTOM_DOMAIN] }
    : {}),
});

export default shopify;
export const apiVersion = ApiVersion.October25;
export const addDocumentResponseHeaders = shopify.addDocumentResponseHeaders;
export const authenticate = shopify.authenticate;
export const unauthenticated = shopify.unauthenticated;
export const login = shopify.login;
export const registerWebhooks = shopify.registerWebhooks;
export const sessionStorage = shopify.sessionStorage;
