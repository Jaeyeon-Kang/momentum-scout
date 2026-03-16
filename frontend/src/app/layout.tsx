import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Momentum Scout",
  description: "미국과 한국 시장의 모멘텀 후보를 같은 흐름 안에서 빠르게 정리하는 스카우트 앱",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        <meta name="theme-color" content="#f4f3ef" />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/@fontsource/ibm-plex-sans-kr@5.2.6/index.css"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                var t = localStorage.getItem("ms_theme");
                var l = localStorage.getItem("ms_lang");
                if (t) {
                  document.documentElement.dataset.theme = t;
                } else if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
                  document.documentElement.dataset.theme = "dark";
                }
                if (l) {
                  document.documentElement.lang = l;
                }
              })();
            `,
          }}
        />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
