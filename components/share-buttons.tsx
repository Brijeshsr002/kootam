"use client";

import { useState } from "react";
import { secondaryButton } from "@/components/ui";
import { whatsappShareUrl } from "@/lib/site";

export function ShareButtons({ url, text }: { url: string; text: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Copy this link:", url);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      <a
        href={whatsappShareUrl(text, url)}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center justify-center rounded-full bg-[#25D366] px-5 py-2.5 font-medium text-white hover:opacity-90"
      >
        Share on WhatsApp
      </a>
      <button type="button" onClick={copy} className={secondaryButton}>
        {copied ? "Link copied" : "Copy link"}
      </button>
    </div>
  );
}
