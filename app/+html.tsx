import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="pt-BR">
      <head>
        <meta charSet="utf-8" />

        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, viewport-fit=cover"
        />

        <title>MatchCondo</title>

        <meta
          name="description"
          content="Reservas de espaços do condomínio com facilidade e justiça."
        />

        <link
          rel="manifest"
          href="/manifest.json"
        />

        <link
          rel="apple-touch-icon"
          sizes="180x180"
          href="/apple-touch-icon.png"
        />

        <link
          rel="icon"
          type="image/png"
          sizes="192x192"
          href="/icon-192.png"
        />

        <meta
          name="theme-color"
          content="#0F7A6C"
        />

        <meta
          name="apple-mobile-web-app-capable"
          content="yes"
        />

        <meta
          name="application-name"
          content="MatchCondo"
        />

        <meta
          name="apple-mobile-web-app-title"
          content="MatchCondo"
        />

        <meta
          name="apple-mobile-web-app-status-bar-style"
          content="default"
        />

        <ScrollViewStyleReset />
      </head>

      <body>{children}</body>
    </html>
  );
}
