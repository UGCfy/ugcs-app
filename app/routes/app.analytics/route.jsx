// app/routes/app.analytics/route.jsx
import { useLoaderData, useSubmit } from "react-router";
import { authenticate } from "../../shopify.server";
import prisma from "../../db.server";

export const loader = async ({ request }) => {
  const { admin } = await authenticate.admin(request);

  const url = new URL(request.url);
  const period = url.searchParams.get("period") || "7"; // days

  // Calculate date range
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - parseInt(period));

  // Get key metrics
  const [
    totalViews,
    totalClicks,
    totalMedia,
    approvedMedia,
    viewsInPeriod,
    clicksInPeriod,
  ] = await Promise.all([
    prisma.mediaView.count(),
    prisma.mediaClick.count(),
    prisma.media.count(),
    prisma.media.count({ where: { status: "APPROVED" } }),
    prisma.mediaView.count({
      where: { createdAt: { gte: startDate } },
    }),
    prisma.mediaClick.count({
      where: { createdAt: { gte: startDate } },
    }),
  ]);

  // Get top performing media (by views)
  const topMedia = await prisma.media.findMany({
    where: { status: "APPROVED" },
    include: {
      _count: {
        select: {
          views: true,
          clicks: true,
        },
      },
      mediaTags: {
        include: { tag: true },
      },
    },
    orderBy: {
      views: {
        _count: "desc",
      },
    },
    take: 10,
  });

  // Get product performance (products with most clicks)
  const productClicks = await prisma.mediaClick.groupBy({
    by: ["productId"],
    where: {
      productId: { not: null },
      createdAt: { gte: startDate },
    },
    _count: {
      productId: true,
    },
    orderBy: {
      _count: {
        productId: "desc",
      },
    },
    take: 5,
  });

  // Fetch product details for top products
  const productIds = productClicks.map((p) => p.productId).filter(Boolean);
  let productDetails = {};
  
  if (productIds.length > 0) {
    const gql = `#graphql
      query GetProducts($ids: [ID!]!) {
        nodes(ids: $ids) {
          ... on Product {
            id
            title
            featuredImage {
              url
            }
          }
        }
      }
    `;

    try {
      const resp = await admin.graphql(gql, { variables: { ids: productIds } });
      const json = await resp.json();
      
      for (const node of json.data?.nodes || []) {
        if (node?.id) {
          productDetails[node.id] = {
            title: node.title,
            image: node.featuredImage?.url,
          };
        }
      }
    } catch (error) {
      console.error("Failed to fetch product details:", error);
    }
  }

  // Calculate engagement rate
  const engagementRate = totalViews > 0 ? ((totalClicks / totalViews) * 100).toFixed(1) : 0;

  // Daily breakdown for last N days
  const dailyStats = [];
  for (let i = parseInt(period) - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    date.setHours(0, 0, 0, 0);

    const nextDate = new Date(date);
    nextDate.setDate(nextDate.getDate() + 1);

    const [views, clicks] = await Promise.all([
      prisma.mediaView.count({
        where: {
          createdAt: {
            gte: date,
            lt: nextDate,
          },
        },
      }),
      prisma.mediaClick.count({
        where: {
          createdAt: {
            gte: date,
            lt: nextDate,
          },
        },
      }),
    ]);

    dailyStats.push({
      date: date.toISOString().split("T")[0],
      views,
      clicks,
    });
  }

  return {
    metrics: {
      totalViews,
      totalClicks,
      totalMedia,
      approvedMedia,
      viewsInPeriod,
      clicksInPeriod,
      engagementRate,
    },
    topMedia: topMedia.map((m) => ({
      id: m.id,
      url: m.url,
      caption: m.caption,
      views: m._count.views,
      clicks: m._count.clicks,
      tags: m.mediaTags.map((mt) => mt.tag.name),
    })),
    topProducts: productClicks.map((p) => ({
      productId: p.productId,
      clicks: p._count.productId,
      product: productDetails[p.productId] || null,
    })),
    dailyStats,
    period,
  };
};

export default function AnalyticsPage() {
  const { metrics, topMedia, topProducts, dailyStats, period } = useLoaderData();
  const submit = useSubmit();

  return (
    <s-page heading="Analytics">
      <s-section>
        <s-paragraph>
          Track the performance of your UGC content and understand what drives engagement and sales.
        </s-paragraph>
      </s-section>

      {/* Period Selector */}
      <s-section>
        <div style={{ marginBottom: "2rem" }}>
          <form
            id="analytics-period-form"
            method="get"
            style={{ display: "flex", gap: "0.5rem" }}
            onSubmit={(e) => {
              e.preventDefault();
              submit(e.currentTarget, { method: "get", replace: true, preventScrollReset: true });
            }}
          >
            <select
              name="period"
              value={period}
              onChange={(e) => {
                const form = e.target.form;
                if (form) submit(form, { method: "get", replace: true, preventScrollReset: true });
              }}
              style={{
                padding: "0.5rem 1rem",
                borderRadius: "4px",
                border: "1px solid #ccc",
                fontSize: "0.9rem",
              }}
            >
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
            </select>
          </form>
        </div>
      </s-section>

      {/* Key Metrics Cards */}
      <s-section>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem", marginBottom: "2rem" }}>
          {/* Total Views */}
          <div style={{ background: "white", border: "1px solid #e0e0e0", borderRadius: "8px", padding: "1.5rem" }}>
            <div style={{ fontSize: "0.85rem", color: "#666", marginBottom: "0.5rem" }}>Total Views</div>
            <div style={{ fontSize: "2rem", fontWeight: "700", color: "#16acf1" }}>{metrics.totalViews.toLocaleString()}</div>
            <div style={{ fontSize: "0.8rem", color: "#666", marginTop: "0.25rem" }}>
              {metrics.viewsInPeriod.toLocaleString()} in last {period} days
            </div>
          </div>

          {/* Total Clicks */}
          <div style={{ background: "white", border: "1px solid #e0e0e0", borderRadius: "8px", padding: "1.5rem" }}>
            <div style={{ fontSize: "0.85rem", color: "#666", marginBottom: "0.5rem" }}>Total Clicks</div>
            <div style={{ fontSize: "2rem", fontWeight: "700", color: "#008060" }}>{metrics.totalClicks.toLocaleString()}</div>
            <div style={{ fontSize: "0.8rem", color: "#666", marginTop: "0.25rem" }}>
              {metrics.clicksInPeriod.toLocaleString()} in last {period} days
            </div>
          </div>

          {/* Engagement Rate */}
          <div style={{ background: "white", border: "1px solid #e0e0e0", borderRadius: "8px", padding: "1.5rem" }}>
            <div style={{ fontSize: "0.85rem", color: "#666", marginBottom: "0.5rem" }}>Engagement Rate</div>
            <div style={{ fontSize: "2rem", fontWeight: "700", color: "#f49342" }}>{metrics.engagementRate}%</div>
            <div style={{ fontSize: "0.8rem", color: "#666", marginTop: "0.25rem" }}>
              Clicks ÷ Views
            </div>
          </div>

          {/* Total Media */}
          <div style={{ background: "white", border: "1px solid #e0e0e0", borderRadius: "8px", padding: "1.5rem" }}>
            <div style={{ fontSize: "0.85rem", color: "#666", marginBottom: "0.5rem" }}>Media Library</div>
            <div style={{ fontSize: "2rem", fontWeight: "700", color: "#5c6ac4" }}>{metrics.totalMedia}</div>
            <div style={{ fontSize: "0.8rem", color: "#666", marginTop: "0.25rem" }}>
              {metrics.approvedMedia} approved
            </div>
          </div>
        </div>
      </s-section>

      {/* Performance Chart */}
      <s-section>
        <div style={{ background: "white", border: "1px solid #e0e0e0", borderRadius: "8px", padding: "1.5rem", marginBottom: "2rem" }}>
          <h3 style={{ margin: "0 0 1rem 0" }}>Performance Trend</h3>
          
          {dailyStats.length > 0 && (() => {
            const maxViews = Math.max(...dailyStats.map(d => d.views), 1);
            const maxClicks = Math.max(...dailyStats.map(d => d.clicks), 1);
            const maxValue = Math.max(maxViews, maxClicks);
            
            const chartWidth = 800;
            const chartHeight = 300;
            const padding = { top: 20, right: 20, bottom: 40, left: 50 };
            const graphWidth = chartWidth - padding.left - padding.right;
            const graphHeight = chartHeight - padding.top - padding.bottom;
            
            // Calculate points for lines
            const viewsPoints = dailyStats.map((day, i) => {
              const x = padding.left + (i / (dailyStats.length - 1)) * graphWidth;
              const y = padding.top + graphHeight - (day.views / maxValue) * graphHeight;
              return { x, y, value: day.views };
            });
            
            const clicksPoints = dailyStats.map((day, i) => {
              const x = padding.left + (i / (dailyStats.length - 1)) * graphWidth;
              const y = padding.top + graphHeight - (day.clicks / maxValue) * graphHeight;
              return { x, y, value: day.clicks };
            });
            
            // Create path strings
            const viewsPath = viewsPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
            const clicksPath = clicksPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
            
            return (
              <div style={{ width: "100%", overflowX: "auto" }}>
                <svg width={chartWidth} height={chartHeight} style={{ display: "block" }}>
                  {/* Grid lines */}
                  {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
                    <g key={ratio}>
                      <line
                        x1={padding.left}
                        y1={padding.top + graphHeight * (1 - ratio)}
                        x2={chartWidth - padding.right}
                        y2={padding.top + graphHeight * (1 - ratio)}
                        stroke="#f0f0f0"
                        strokeWidth="1"
                      />
                      <text
                        x={padding.left - 10}
                        y={padding.top + graphHeight * (1 - ratio) + 4}
                        textAnchor="end"
                        fontSize="11"
                        fill="#666"
                      >
                        {Math.round(maxValue * ratio)}
                      </text>
                    </g>
                  ))}
                  
                  {/* X-axis labels */}
                  {dailyStats.map((day, i) => {
                    if (i % Math.ceil(dailyStats.length / 7) === 0 || i === dailyStats.length - 1) {
                      const x = padding.left + (i / (dailyStats.length - 1)) * graphWidth;
                      return (
                        <text
                          key={day.date}
                          x={x}
                          y={chartHeight - padding.bottom + 20}
                          textAnchor="middle"
                          fontSize="11"
                          fill="#666"
                        >
                          {new Date(day.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </text>
                      );
                    }
                    return null;
                  })}
                  
                  {/* Views line */}
                  <path
                    d={viewsPath}
                    fill="none"
                    stroke="#16acf1"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  
                  {/* Clicks line */}
                  <path
                    d={clicksPath}
                    fill="none"
                    stroke="#008060"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  
                  {/* Data points - Views */}
                  {viewsPoints.map((point, i) => (
                    <g key={`view-${i}`}>
                      <circle
                        cx={point.x}
                        cy={point.y}
                        r="4"
                        fill="#16acf1"
                        stroke="white"
                        strokeWidth="2"
                      />
                      {point.value > 0 && (
                        <title>{dailyStats[i].date}: {point.value} views</title>
                      )}
                    </g>
                  ))}
                  
                  {/* Data points - Clicks */}
                  {clicksPoints.map((point, i) => (
                    <g key={`click-${i}`}>
                      <circle
                        cx={point.x}
                        cy={point.y}
                        r="4"
                        fill="#008060"
                        stroke="white"
                        strokeWidth="2"
                      />
                      {point.value > 0 && (
                        <title>{dailyStats[i].date}: {point.value} clicks</title>
                      )}
                    </g>
                  ))}
                </svg>
              </div>
            );
          })()}
          
          {/* Legend */}
          <div style={{ display: "flex", gap: "1.5rem", marginTop: "1rem", fontSize: "0.85rem", justifyContent: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <div style={{ width: "24px", height: "3px", background: "#16acf1", borderRadius: "2px" }}></div>
              <span>Views</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <div style={{ width: "24px", height: "3px", background: "#008060", borderRadius: "2px" }}></div>
              <span>Clicks</span>
            </div>
          </div>
        </div>
      </s-section>

      {/* Top Performing Media */}
      <s-section>
        <div style={{ background: "white", border: "1px solid #e0e0e0", borderRadius: "8px", padding: "1.5rem", marginBottom: "2rem" }}>
          <h3 style={{ margin: "0 0 1rem 0" }}>Top Performing Media</h3>
          {topMedia.length === 0 ? (
            <p style={{ color: "#666", margin: 0 }}>No media data yet. Views and clicks will appear here once your widgets are live.</p>
          ) : (
            <div style={{ display: "grid", gap: "1rem" }}>
              {topMedia.map((media) => (
                <div
                  key={media.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "1rem",
                    padding: "1rem",
                    background: "#f9f9f9",
                    borderRadius: "6px",
                  }}
                >
                  <img
                    src={media.url}
                    alt={media.caption || "Media"}
                    style={{
                      width: "80px",
                      height: "80px",
                      objectFit: "cover",
                      borderRadius: "4px",
                    }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: "500", marginBottom: "0.25rem" }}>
                      {media.caption || "Untitled"}
                    </div>
                    <div style={{ fontSize: "0.85rem", color: "#666" }}>
                      {media.tags.join(", ") || "No tags"}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: "0.85rem", color: "#666" }}>Views</div>
                    <div style={{ fontSize: "1.5rem", fontWeight: "700", color: "#16acf1" }}>
                      {media.views.toLocaleString()}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: "0.85rem", color: "#666" }}>Clicks</div>
                    <div style={{ fontSize: "1.5rem", fontWeight: "700", color: "#008060" }}>
                      {media.clicks.toLocaleString()}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: "0.85rem", color: "#666" }}>CTR</div>
                    <div style={{ fontSize: "1.25rem", fontWeight: "600" }}>
                      {media.views > 0 ? ((media.clicks / media.views) * 100).toFixed(1) : 0}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </s-section>

      {/* Top Products */}
      {topProducts.length > 0 && (
        <s-section>
          <div style={{ background: "white", border: "1px solid #e0e0e0", borderRadius: "8px", padding: "1.5rem" }}>
            <h3 style={{ margin: "0 0 1rem 0" }}>Top Products from UGC</h3>
            <div style={{ display: "grid", gap: "1rem" }}>
              {topProducts.map((item) => (
                <div
                  key={item.productId}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "1rem",
                    padding: "1rem",
                    background: "#f9f9f9",
                    borderRadius: "6px",
                  }}
                >
                  {item.product?.image && (
                    <img
                      src={item.product.image}
                      alt={item.product.title}
                      style={{
                        width: "60px",
                        height: "60px",
                        objectFit: "cover",
                        borderRadius: "4px",
                      }}
                    />
                  )}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: "500" }}>
                      {item.product?.title || item.productId}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: "0.85rem", color: "#666" }}>Clicks</div>
                    <div style={{ fontSize: "1.5rem", fontWeight: "700", color: "#008060" }}>
                      {item.clicks.toLocaleString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </s-section>
      )}

      {/* Insights */}
      <s-section>
        <div style={{ background: "#e3f2fd", border: "1px solid #90caf9", borderRadius: "8px", padding: "1.5rem" }}>
          <h3 style={{ margin: "0 0 1rem 0" }}>💡 Insights</h3>
          <ul style={{ margin: 0, paddingLeft: "1.5rem", lineHeight: "1.8" }}>
            {metrics.engagementRate > 5 && (
              <li>Your engagement rate of {metrics.engagementRate}% is excellent! Keep showcasing authentic UGC.</li>
            )}
            {metrics.engagementRate < 2 && metrics.totalViews > 100 && (
              <li>Your engagement rate is low. Try featuring more product-focused content or customer testimonials.</li>
            )}
            {topMedia.length > 0 && (
              <li>
                Your top performing content has {topMedia[0].views} views. Consider creating similar content or
                expanding that theme.
              </li>
            )}
            {topProducts.length > 0 && (
              <li>
                &ldquo;{topProducts[0].product?.title || 'One product'}&rdquo; is getting the most attention from UGC. Consider
                featuring it more prominently.
              </li>
            )}
            {metrics.totalViews === 0 && (
              <li>
                No views yet! Make sure you&apos;ve installed the widget on your storefront. Visit the &ldquo;Widget Setup&rdquo; tab
                for instructions.
              </li>
            )}
          </ul>
        </div>
      </s-section>
    </s-page>
  );
}

