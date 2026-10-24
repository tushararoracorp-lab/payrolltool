import { Html, Head, Main, NextScript } from 'next/document'

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <link rel="icon" href="/icon.png" type="image/png" />
        {/* One stylesheet request for both families (was two). Same weights as before: DM Sans 300-700, Sora 300-800. */}
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=Sora:wght@300;400;600;700;800&display=swap" rel="stylesheet" />
        {/* Google Analytics is loaded once, in _app.js (it was loaded here as well, so every page view counted twice).
            The Google Preferred Sources script is loaded by the footer when it nears the screen. */}
        {/* Google AdSense */}
        <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-9339359521272425"
          crossOrigin="anonymous"
        />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  )
}