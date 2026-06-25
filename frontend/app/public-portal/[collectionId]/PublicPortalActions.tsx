"use client";

import { useState } from "react";
import { Download, Link2, Mail, Share2 } from "lucide-react";

export function PublicPortalHeaderActions() {
  const [message, setMessage] = useState("");
  return (
    <div className="proto-public-action-stack">
      <button type="button" onClick={() => setMessage("Local demo link copied: no public URL is published.")}>
        <Share2 size={16} />Share collection link
      </button>
      {message ? <small>{message}</small> : null}
    </div>
  );
}

export function PublicPortalAccessActions() {
  const [message, setMessage] = useState("");
  return (
    <>
      {message ? <p className="proto-public-action-note">{message}</p> : null}
      <button type="button" disabled className="is-primary"><Download size={16} />Download all disabled</button>
      <button type="button" onClick={() => setMessage("Request recorded locally. Media Team review required before any download.")}>
        <Mail size={16} />Request asset
      </button>
      <button type="button" onClick={() => setMessage("Local demo has no public share URL. Published portal link remains disabled.")}>
        <Link2 size={16} />Share collection link
      </button>
    </>
  );
}
