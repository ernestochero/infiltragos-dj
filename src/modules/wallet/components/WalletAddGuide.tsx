"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';

type Context = "page" | "modal";

type Platform = "ios" | "android" | "other";

const applePassUrl = process.env.NEXT_PUBLIC_WALLET_APPLE_PASS_URL || "#";
const googlePassUrl = process.env.NEXT_PUBLIC_WALLET_GOOGLE_PASS_URL || "#";
const fallbackPortalUrl = process.env.NEXT_PUBLIC_WALLET_PORTAL_URL || "/wallet/portal";

function detectPlatform(): Platform {
  if (typeof window === "undefined") return "other";
  const ua = navigator.userAgent || navigator.vendor || "";
  const platform = navigator.platform || "";
  const uaData = (navigator as Navigator & { userAgentData?: { platform?: string; mobile?: boolean } }).userAgentData;
  const isiPadDesktop = platform === "MacIntel" && typeof navigator.maxTouchPoints === "number" && navigator.maxTouchPoints > 1;
  if (/iPhone|iPad|iPod/i.test(ua) || isiPadDesktop) return "ios";
  if (/Android/i.test(ua) || uaData?.platform === "Android" || uaData?.mobile === true) return "android";
  return "other";
}

type Props = {
  context?: Context;
};

export default function WalletAddGuide({ context = "page" }: Props) {
  const [platform, setPlatform] = useState<Platform>("other");

  useEffect(() => {
    setPlatform(detectPlatform());
  }, []);

  const isIos = platform === "ios";
  const isAndroid = platform === "android";

  const targetUrl = isIos ? applePassUrl : isAndroid ? googlePassUrl : fallbackPortalUrl;
  const disabled = targetUrl === "#";

  const titleClass = context === "page" ? "text-4xl md:text-5xl" : "text-3xl";
  const alignment = context === "page" ? "text-center" : "text-left";

  const buttonLabel = disabled ? "Disponible próximamente" : "Añadir wallet";
  const helperText = isIos
    ? "Abriremos Apple Wallet para completar el proceso."
    : isAndroid
    ? "Abriremos Google Wallet para guardar tu tarjeta."
    : "Abre este enlace desde tu celular para añadir la wallet.";

  return (
    <div className={`space-y-6 ${alignment}`}>
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.4em] text-gray-500">Infiltragos Wallet</p>
        <h1 className={`${titleClass} font-semibold tracking-tight text-white`}>Añade tu wallet</h1>
        <p className="text-sm text-gray-400">
          Guarda tu tarjeta digital para tener tus puntos y beneficios al instante.
        </p>
      </div>

      <div className="space-y-3">
        <Link
          href={targetUrl}
          prefetch={false}
          className={`inline-flex w-full items-center justify-center rounded-md border border-white/20 px-4 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-white transition ${
            disabled ? "bg-white/10 cursor-not-allowed opacity-70" : "bg-white/10 hover:bg-white/20"
          }`}
          aria-disabled={disabled}
        >
          {buttonLabel}
        </Link>
        <p className="text-xs text-gray-500">{helperText}</p>
      </div>
    </div>
  );
}
