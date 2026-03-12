import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "http://localhost:8000/api/:path*",
      },
      {
        source: "/prompt/:path*",
        destination: "http://localhost:8000/prompt/:path*",
      },
      {
        source: "/prompt_multi",
        destination: "http://localhost:8000/prompt_multi",
      },
      {
        source: "/report/:path*",
        destination: "http://localhost:8000/report/:path*",
      },
      {
        source: "/report_multi",
        destination: "http://localhost:8000/report_multi",
      },
      {
        source: "/report_multi_data",
        destination: "http://localhost:8000/report_multi_data",
      },
    ];
  },
};

export default nextConfig;
