import { withSentryConfig } from "@sentry/nextjs/config"
import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  devIndicators: false,
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Strict-Transport-Security", value: "max-age=63072000" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ]
  },
}

export default withSentryConfig(nextConfig, {
  org: "enra-r3",
  project: "ai-teammates",

  // Uploads source maps on production builds; without it the build still succeeds.
  authToken: process.env.SENTRY_AUTH_TOKEN,

  // Railway builds have no .git to detect the commit from; locally this is unset and git HEAD is used.
  release: { name: process.env.RAILWAY_GIT_COMMIT_SHA },

  widenClientFileUpload: true,

  // Proxies browser events through the app so ad-blockers don't drop them.
  tunnelRoute: "/monitoring",

  silent: !process.env.CI,
})
