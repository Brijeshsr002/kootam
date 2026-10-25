import { ImageResponse } from "next/og";

// Shared look for every share-preview image (WhatsApp, Instagram DMs, Google, X).
export const OG_SIZE = { width: 1200, height: 630 };

export function ogCard({ eyebrow, title, footer }: { eyebrow: string; title: string; footer: string }) {
  const titleSize = title.length > 60 ? 60 : title.length > 36 ? 72 : 88;
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          background: "linear-gradient(135deg, #ea580c 0%, #c2410c 55%, #7c2d12 100%)",
          color: "white",
        }}
      >
        <div style={{ display: "flex", fontSize: 34, fontWeight: 600, opacity: 0.92 }}>{eyebrow}</div>
        <div style={{ display: "flex", fontSize: titleSize, fontWeight: 800, lineHeight: 1.05, letterSpacing: -2 }}>{title}</div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 32 }}>
          <span style={{ opacity: 0.92 }}>{footer}</span>
          <span style={{ fontWeight: 800, fontSize: 44 }}>Kootam</span>
        </div>
      </div>
    ),
    OG_SIZE,
  );
}
