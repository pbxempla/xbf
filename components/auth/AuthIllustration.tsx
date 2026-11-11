import React from "react";
import { Briefcase, User } from "lucide-react";

export function AuthIllustration() {
  return (
    <div className="relative w-full h-full min-h-160 flex flex-col items-center justify-between p-8 lg:p-12 overflow-hidden bg-linear-to-b from-[#F2F4FD] via-[#ECEFFE] to-[#F5F3FF]">
      {/* Soft Ambient Radial Background Glows */}
      <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-indigo-200/30 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/4 w-80 h-80 bg-blue-200/25 rounded-full blur-3xl pointer-events-none" />

      {/* Main Illustration Stage */}
      <div className="relative w-full max-w-135 flex-1 flex items-center justify-center pt-6 pb-2">
        {/* Floating Work Email Credit Card (Top Right) */}
        <div className="absolute top-6 right-2 sm:right-6 z-20 animate-fade-in">
          {/* Celebratory Sparkles */}
          <div className="absolute -top-3 -right-3 text-indigo-400">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
            </svg>
          </div>

          <div className="bg-white/95 backdrop-blur-md rounded-2xl p-3.5 pr-6 shadow-[0_12px_32px_rgba(30,27,75,0.08)] border border-white flex items-center gap-3.5 transition-transform hover:-translate-y-1 duration-300">
            <div className="w-10 h-10 rounded-xl bg-[#2563EB] flex items-center justify-center text-white shadow-sm shadow-blue-500/20">
              <Briefcase className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div className="flex flex-col">
              <span className="text-[15px] font-bold text-slate-900 leading-tight">
                200 Credits
              </span>
              <span className="text-[11px] font-medium text-slate-400 mt-0.5">
                Work Email Account
              </span>
            </div>
          </div>
        </div>

        {/* Floating Personal Email Credit Card (Middle Right) */}
        <div className="absolute top-34.5 right-0 sm:right-2 z-20 animate-fade-in delay-100">
          <div className="bg-white/95 backdrop-blur-md rounded-2xl p-3.5 pr-6 shadow-[0_12px_32px_rgba(30,27,75,0.08)] border border-white flex items-center gap-3.5 transition-transform hover:-translate-y-1 duration-300">
            <div className="w-10 h-10 rounded-xl bg-[#2563EB] flex items-center justify-center text-white shadow-sm shadow-blue-500/20">
              <User className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div className="flex flex-col">
              <span className="text-[15px] font-bold text-slate-900 leading-tight">
                150 Credits
              </span>
              <span className="text-[11px] font-medium text-slate-400 mt-0.5">
                Personal Email Account
              </span>
            </div>
          </div>
        </div>

        {/* The 3D Platform / Podium and Laptop Assembly */}
        <div className="relative w-full flex items-center justify-center">
          {/* White Cylindrical 3D Podium */}
          <div className="absolute -bottom-8 w-105 sm:w-120 h-40 pointer-events-none">
            {/* Top Ellipse Surface */}
            <div className="w-full h-27.5 rounded-[100%] bg-linear-to-b from-white via-[#FAFBFD] to-[#E9EDF8] shadow-[0_20px_45px_rgba(147,158,198,0.22)]" />
            {/* Cylindrical Base Body */}
            <div className="w-full h-16.25 -mt-11.25 rounded-b-[100%] bg-linear-to-b from-[#E2E7F5] via-[#D5DCF0] to-[#C9D3EC] shadow-[0_24px_50px_rgba(79,70,229,0.12)]" />
          </div>

          {/* Decorative Potted Plant (Left of Laptop) */}
          <div className="absolute bottom-10 left-6 sm:left-12 z-10 hidden sm:flex flex-col items-center">
            {/* Indigo / Purple Leaves */}
            <svg width="48" height="52" viewBox="0 0 52 56" fill="none" className="drop-shadow-sm">
              <path
                d="M26 34C26 34 20 24 10 26C10 34 18 36 26 36"
                fill="#6366F1"
                opacity="0.9"
              />
              <path
                d="M26 36C26 36 32 24 42 26C42 34 34 36 26 38"
                fill="#818CF8"
              />
              <path
                d="M26 28C26 28 22 14 14 16C14 24 22 26 26 28"
                fill="#4F46E5"
              />
              <path
                d="M26 28C26 28 30 14 38 16C38 24 30 26 26 28"
                fill="#6366F1"
              />
              <path
                d="M26 20C26 20 23 4 26 2C29 4 26 20 26 20"
                fill="#4338CA"
              />
            </svg>
            {/* White Minimal Ceramic Pot */}
            <div className="w-8 h-9 -mt-1 rounded-b-md rounded-t-sm bg-linear-to-b from-white via-slate-50 to-slate-200 shadow-md border-t border-slate-100" />
            <div className="w-6 h-1 rounded-full bg-slate-400/20 blur-[1px] mt-0.5" />
          </div>

          {/* Premium Laptop Mockup (Angled 3/4 Perspective) */}
          <div className="relative z-10 w-85 sm:w-102.5 transform hover:scale-[1.01] transition-transform duration-500 ease-out">
            {/* Laptop Display Screen */}
            <div className="relative mx-auto w-77.5 sm:w-92.5 h-50 sm:h-58.75 bg-[#0B0F19] rounded-t-2xl p-2.5 sm:p-3 shadow-2xl border-[1.5px] border-slate-700/60 ring-1 ring-white/10">
              {/* Webcam */}
              <div className="absolute top-1.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-slate-800 ring-1 ring-slate-700" />

              {/* Screen Content: Modern Xempla Workspace */}
              <div className="w-full h-full bg-white rounded-lg overflow-hidden flex flex-col shadow-inner">
                {/* Top Navbar */}
                <div className="h-7 bg-[#1E1B4B] px-2.5 flex items-center justify-between border-b border-indigo-900/40">
                  <div className="flex items-center gap-1.5">
                    {/* Small Xempla logo */}
                    <div className="w-3.5 h-3.5 rounded bg-linear-to-br from-blue-400 to-indigo-600 flex items-center justify-center text-[8px] font-bold text-white">
                      ✕
                    </div>
                    <span className="text-[10px] font-semibold text-white tracking-tight">
                      Xempla
                    </span>
                  </div>
                  {/* Search Bar pill */}
                  <div className="w-24 h-3.5 bg-indigo-950/60 rounded-full px-2 flex items-center text-[7px] text-indigo-300/80">
                    Search workspace...
                  </div>
                  {/* User Avatar */}
                  <div className="w-4 h-4 rounded-full bg-indigo-500/80 border border-indigo-300/40 flex items-center justify-center text-[8px] text-white font-medium">
                    J
                  </div>
                </div>

                {/* Dashboard Body */}
                <div className="flex-1 flex bg-[#F8FAFC]">
                  {/* Mini Sidebar */}
                  <div className="w-10 sm:w-12 bg-white border-r border-slate-100 py-2 flex flex-col items-center gap-2.5">
                    <div className="w-6 h-6 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
                      <div className="w-2.5 h-2.5 border-t-2 border-l-2 border-white rotate-45 -mt-0.5" />
                    </div>
                    <div className="w-5 h-5 rounded-md hover:bg-slate-100 flex items-center justify-center text-slate-400">
                      <div className="w-2.5 h-2.5 rounded-sm bg-slate-300" />
                    </div>
                    <div className="w-5 h-5 rounded-md hover:bg-slate-100 flex items-center justify-center text-slate-400">
                      <div className="w-2.5 h-2.5 rounded-sm bg-slate-300" />
                    </div>
                    <div className="w-5 h-5 rounded-md hover:bg-slate-100 flex items-center justify-center text-slate-400">
                      <div className="w-2.5 h-2.5 rounded-sm bg-slate-300" />
                    </div>
                  </div>

                  {/* Main Analytics Content */}
                  <div className="flex-1 p-2.5 sm:p-3 flex flex-col gap-2 overflow-hidden">
                    {/* Metrics Top Row */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-white p-2 rounded-lg border border-slate-100 shadow-sm">
                        <span className="text-[7px] font-medium text-slate-400 uppercase tracking-wider block">
                          Total Credits
                        </span>
                        <div className="flex items-baseline gap-1 mt-0.5">
                          <span className="text-xs font-bold text-slate-900">
                            200 pts
                          </span>
                          <span className="text-[7px] font-semibold text-emerald-500">
                            +100%
                          </span>
                        </div>
                      </div>
                      <div className="bg-white p-2 rounded-lg border border-slate-100 shadow-sm">
                        <span className="text-[7px] font-medium text-slate-400 uppercase tracking-wider block">
                          Workspace Status
                        </span>
                        <div className="flex items-baseline gap-1 mt-0.5">
                          <span className="text-xs font-bold text-indigo-600">
                            Active
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Charts Area */}
                    <div className="flex-1 grid grid-cols-5 gap-2 items-center bg-white p-2 rounded-lg border border-slate-100 shadow-sm">
                      {/* Bar Chart (Left 3 columns) */}
                      <div className="col-span-3 h-full flex flex-col justify-between">
                        <span className="text-[8px] font-bold text-slate-700">
                          Resource Usage
                        </span>
                        <div className="flex items-end gap-1.5 h-14 sm:h-16 pt-1">
                          <div className="w-2.5 bg-indigo-200 rounded-t-sm h-[40%]" />
                          <div className="w-2.5 bg-indigo-300 rounded-t-sm h-[65%]" />
                          <div className="w-2.5 bg-indigo-500 rounded-t-sm h-[90%]" />
                          <div className="w-2.5 bg-indigo-600 rounded-t-sm h-[75%]" />
                          <div className="w-2.5 bg-indigo-700 rounded-t-sm h-[95%]" />
                          <div className="w-2.5 bg-blue-500 rounded-t-sm h-[60%]" />
                        </div>
                      </div>

                      {/* Donut Chart (Right 2 columns) */}
                      <div className="col-span-2 flex flex-col items-center justify-center">
                        <div className="relative w-12 h-12 flex items-center justify-center">
                          <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                            <path
                              className="text-slate-100"
                              strokeWidth="4"
                              stroke="currentColor"
                              fill="none"
                              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                            />
                            <path
                              className="text-indigo-600"
                              strokeDasharray="75, 100"
                              strokeWidth="4"
                              strokeLinecap="round"
                              stroke="currentColor"
                              fill="none"
                              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                            />
                          </svg>
                          <span className="absolute text-[8px] font-bold text-slate-800">
                            75%
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Laptop Base / Keyboard Deck */}
            <div className="relative mx-auto w-85 sm:w-102.5 h-3.5 bg-linear-to-b from-[#CBD5E1] to-[#94A3B8] rounded-b-xl shadow-lg border-t border-slate-300">
              {/* Display Opening Notch */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-14 h-1 bg-slate-500 rounded-b-sm" />
            </div>
            {/* Soft Shadow under laptop */}
            <div className="w-75 sm:w-90 h-3 mx-auto bg-slate-800/15 rounded-full blur-xs mt-0.5" />
          </div>
        </div>
      </div>

      {/* Bottom Text and Carousel Indicators */}
      <div className="relative z-10 w-full max-w-md mx-auto text-center mt-6">
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 font-sans">
          One account. More possibilities.
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 mt-2 leading-relaxed">
          Access your workspace, collaborate with your team, and get instant credit points based on your email.
        </p>

        {/* Carousel Pagination Indicator Dots */}
        <div className="flex items-center justify-center gap-1.5 mt-5">
          {/* Active Pill */}
          <div className="w-6 h-1.5 bg-[#3B28CC] rounded-full transition-all duration-300" />
          {/* Inactive Dots */}
          <div className="w-1.5 h-1.5 bg-indigo-200 rounded-full" />
          <div className="w-1.5 h-1.5 bg-indigo-200 rounded-full" />
        </div>
      </div>
    </div>
  );
}
