// Custom root HTML document for the web/static export (expo-router convention).
// Adds the PWA manifest + "Add to Home Screen" meta so the app installs as a
// standalone, full-screen icon on iPad/iPhone Safari with no native build needed.
import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover, maximum-scale=1"
        />
        <meta name="theme-color" content="#FAFAF8" />
        <link rel="manifest" href="/manifest.json" />

        {/* iOS "Add to Home Screen" support */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="BloomStock" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />

        <ScrollViewStyleReset />
      </head>
      <body>{children}</body>
    </html>
  );
}
