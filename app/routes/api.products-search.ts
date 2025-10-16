// app/routes/api.products-search.ts
import type { LoaderFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const { admin } = await authenticate.admin(request);
  
  const url = new URL(request.url);
  const q = (url.searchParams.get("q") || "").trim();
  
  if (!q) {
    return { items: [] };
  }

  const query = `#graphql
    query SearchProducts($query: String!, $first: Int!) {
      products(first: $first, query: $query) {
        nodes {
          id
          title
          featuredImage {
            url
          }
        }
      }
    }
  `;

  const resp = await admin.graphql(query, {
    variables: {
      query: `title:*${q}*`,
      first: 10,
    },
  });

  const data = await resp.json();

  const items = (data?.data?.products?.nodes || []).map((p: any) => ({
    id: p.id,
    title: p.title,
    image: p.featuredImage?.url || "",
  }));

  return { items };
}

