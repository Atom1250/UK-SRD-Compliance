import "./globals.css";
import type { ReactNode } from "react";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <main className="page">
          <header>
            <h1>SDR Preference Pathway Assistant</h1>
            <p>
              This prototype walks clients through the informed choice journey and
              records their pathway selections.
            </p>
          </header>
          {children}
        </main>
      </body>
    </html>
  );
}
