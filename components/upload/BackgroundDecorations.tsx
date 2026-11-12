"use client";

import React from "react";

export function BackgroundDecorations() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none select-none z-0">
      {/* Translucent Soft Lavender Wave Ribbon */}
      <svg
        className="absolute top-0 right-0 w-[60%] h-[320px] opacity-40"
        viewBox="0 0 700 320"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M100 200C250 80 450 260 700 80L700 0L0 0C40 70 60 150 100 200Z"
          fill="url(#wave-grad)"
        />
        <defs>
          <linearGradient id="wave-grad" x1="100" y1="50" x2="650" y2="250" gradientUnits="userSpaceOnUse">
            <stop stopColor="#DDD5FE" stopOpacity="0.7" />
            <stop offset="0.5" stopColor="#E9E3FF" stopOpacity="0.4" />
            <stop offset="1" stopColor="#F3EFFF" stopOpacity="0.1" />
          </linearGradient>
        </defs>
      </svg>

      {/* Floating 3D Pillow / Rounded Beveled Cube 1 (Large - Upper Right) */}
      <div
        className="absolute top-6 right-28 sm:right-36 w-20 h-20 sm:w-24 sm:h-24 rounded-3xl rotate-15 shadow-xl transition-transform"
        style={{
          background: "linear-gradient(135deg, #FFFFFF 0%, #E8E2FF 60%, #D8CEFD 100%)",
          boxShadow: "0 18px 30px -8px rgba(109, 87, 240, 0.22), inset 0 2px 4px rgba(255,255,255,0.9)",
        }}
      >
        {/* Inset debossed center tile */}
        <div
          className="absolute inset-3 rounded-2xl"
          style={{
            background: "linear-gradient(135deg, #DDD5FE 0%, #EDE8FF 100%)",
            boxShadow: "inset 0 3px 5px rgba(109, 87, 240, 0.18), 0 1px 2px rgba(255,255,255,0.8)",
          }}
        />
      </div>

      {/* Floating 3D Cube 2 (Medium - Center Right) */}
      <div
        className="absolute top-10 right-72 sm:right-96 w-11 h-11 sm:w-13 sm:h-13 rounded-2xl rotate-[-12deg] shadow-lg hidden md:block"
        style={{
          background: "linear-gradient(135deg, #FFFFFF 0%, #EDE9FE 60%, #DDD5FE 100%)",
          boxShadow: "0 12px 20px -6px rgba(109, 87, 240, 0.18), inset 0 2px 3px rgba(255,255,255,0.9)",
        }}
      >
        <div
          className="absolute inset-2 rounded-xl"
          style={{
            background: "linear-gradient(135deg, #DDD5FE 0%, #EDE8FF 100%)",
            boxShadow: "inset 0 2px 4px rgba(109, 87, 240, 0.15)",
          }}
        />
      </div>

      {/* Floating 3D Cube 3 (Small - Near Heading) */}
      <div
        className="absolute top-20 left-[48%] w-8 h-8 rounded-xl rotate-[18deg] shadow-md hidden lg:block"
        style={{
          background: "linear-gradient(135deg, #FFFFFF 0%, #EDE9FE 100%)",
          boxShadow: "0 8px 16px -4px rgba(109, 87, 240, 0.15)",
        }}
      >
        <div
          className="absolute inset-1.5 rounded-lg"
          style={{
            background: "linear-gradient(135deg, #DDD5FE 0%, #EDE8FF 100%)",
            boxShadow: "inset 0 1.5px 3px rgba(109, 87, 240, 0.15)",
          }}
        />
      </div>

      {/* Accent Sparkles */}
      <span className="absolute top-14 right-64 text-indigo-300 text-sm">✦</span>
      <span className="absolute top-24 right-20 text-indigo-400 text-xs animate-pulse">✦</span>
      <span className="absolute top-28 left-[45%] text-indigo-300 text-[10px]">✦</span>
    </div>
  );
}
