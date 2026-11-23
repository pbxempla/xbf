import React from "react";

export function XemplaLogo({
  className = "h-7",
  onDark = false,
  iconOnly = false,
}: {
  className?: string;
  onDark?: boolean;
  iconOnly?: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-2.5 ${className}`}
      {...(iconOnly ? { role: "img", "aria-label": "Xempla" } : {})}
    >
      {/* Stylized Modern X Mark */}
      <svg
        width="28"
        height="28"
        viewBox="0 0 28 28"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0"
      >
        <defs>
          <linearGradient id="xempla-grad-1" x1="2" y1="4" x2="26" y2="24" gradientUnits="userSpaceOnUse">
            <stop stopColor="#494fdf" />
            <stop offset="0.5" stopColor="#494fdf" />
            <stop offset="1" stopColor="#3a40c4" />
          </linearGradient>
          <linearGradient id="xempla-grad-2" x1="26" y1="4" x2="2" y2="24" gradientUnits="userSpaceOnUse">
            <stop stopColor="#4f55f1" />
            <stop offset="1" stopColor="#494fdf" />
          </linearGradient>
        </defs>
        {/* Stroke 1 */}
        <path
          d="M6 5C5.44772 5 5 5.44772 5 6L21 22C21.5523 22 22 21.5523 22 21L6 5Z"
          stroke="url(#xempla-grad-1)"
          strokeWidth="4.5"
          strokeLinecap="round"
        />
        {/* Stroke 2 */}
        <path
          d="M22 6C22 5.44772 21.5523 5 21 5L5 21C5 21.5523 5.44772 22 6 22L22 6Z"
          stroke="url(#xempla-grad-2)"
          strokeWidth="4.5"
          strokeLinecap="round"
        />
      </svg>
      {!iconOnly && (
        <span
          className={`text-[22px] font-medium tracking-tight font-sans ${
            onDark ? "text-white" : "text-[#191c1f]"
          }`}
        >
          Xempla
        </span>
      )}
    </div>
  );
}

export function CoinsStackIcon({ className = "w-4 h-4 text-white" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {/* Top coin */}
      <ellipse cx="12" cy="6" rx="8" ry="3" />
      {/* Middle coin */}
      <path d="M4 6v5c0 1.66 3.58 3 8 3s8-1.34 8-3V6" />
      {/* Bottom coin */}
      <path d="M4 11v5c0 1.66 3.58 3 8 3s8-1.34 8-3v-5" />
    </svg>
  );
}

export function GoogleLogo({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className}>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      />
    </svg>
  );
}

export function MicrosoftLogo({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 21 21" className={className}>
      <rect x="1" y="1" width="9" height="9" fill="#f25022" />
      <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
      <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
      <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
    </svg>
  );
}

export function GoogleDriveLogo({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 87.3 78" className={className} aria-hidden="true">
      <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z" fill="#0066da" />
      <path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44a9.06 9.06 0 0 0-1.2 4.5h27.5z" fill="#00ac47" />
      <path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.502l5.852 11.5z" fill="#ea4335" />
      <path d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z" fill="#00832d" />
      <path d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" fill="#2684fc" />
      <path d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 28h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#ffba00" />
    </svg>
  );
}

export function DropboxLogo({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        fill="#0061FF"
        d="M6 1.807 0 5.629l6 3.822 6.001-3.822L6 1.807zM18 1.807l-6 3.822 6 3.822 6-3.822-6-3.822zM0 13.274l6 3.822 6.001-3.822L6 9.452l-6 3.822zM18 9.452l-6 3.822 6 3.822 6-3.822-6-3.822zM6 18.371l6.001 3.822 6-3.822-6-3.822L6 18.371z"
      />
    </svg>
  );
}
