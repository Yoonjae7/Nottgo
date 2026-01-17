import { Analytics } from "@vercel/analytics/react"
import { Suspense } from "react"
import type React from "react"
import Script from "next/script"
import "./globals.css"

export const metadata = {
  generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <Suspense fallback={<div className="flex min-h-screen items-center justify-center">Loading...</div>}>
          {children}
        </Suspense>
        <Analytics />
        <Script id="tawk-script" strategy="lazyOnload">
          {`
            var Tawk_API=Tawk_API||{};
            var Tawk_LoadStart=new Date();
            (function(){
              var s1=document.createElement("script"),s0=document.getElementsByTagName("script")[0];
              s1.async=true;
              s1.src='https://embed.tawk.to/67a9eb743a842732607c7273/1ijnrvgls';
              s1.charset='UTF-8';
              s1.setAttribute('crossorigin','*');
              s0.parentNode.insertBefore(s1,s0);
            })();
          `}
        </Script>
        <Script id="tawk-config" strategy="afterInteractive">
          {`
            window.addEventListener('load', function() {
              if (typeof Tawk_API !== 'undefined') {
                // Mobile-friendly configuration
                if (window.innerWidth <= 768) {
                  Tawk_API.setPosition('bottom-right');
                  Tawk_API.minimize();
                }

                // Customize the widget appearance
                Tawk_API.customStyle({
                  zIndex: 1000,
                  visibility: {
                    desktop: {
                      position: 'br',
                      xOffset: '20px',
                      yOffset: '20px'
                    },
                    mobile: {
                      position: 'br',
                      xOffset: '10px',
                      yOffset: '10px'
                    }
                  },
                  widget: {
                    width: '100%',
                    height: '100%',
                    maxWidth: '350px',
                    maxHeight: '520px'
                  }
                });

                // Handle window resize
                window.addEventListener('resize', function() {
                  if (window.innerWidth <= 768) {
                    Tawk_API.setPosition('bottom-right');
                  }
                });

                // Customize the theme to match your app
                Tawk_API.visitor = {
                  name: 'Campus Shuttle User',
                  tags: ['shuttle-app']
                };
              }
            });
          `}
        </Script>
      </body>
    </html>
  )
}
