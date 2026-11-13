import React from "react";
import Image from "next/image";
import { Building2, ClipboardCheck, Wrench } from "lucide-react";

const facilityServices = [
  { label: "Work orders", icon: ClipboardCheck },
  { label: "Maintenance", icon: Wrench },
  { label: "Facilities", icon: Building2 },
];

export function AuthIllustration() {
  return (
    <aside className="relative hidden h-full min-h-0 w-full bg-[#f4f4f4] p-3 lg:block xl:p-3">
      <div className="relative h-full w-full overflow-hidden rounded-[25px] bg-[#191c1f]">
        <Image
          src="/facility-technician.jpg"
          alt="Facility technician inspecting building electrical equipment"
          fill
          priority
          sizes="(min-width: 1280px) 52vw, 50vw"
          className="object-cover object-[center_38%]"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/20" />

        <div className="absolute inset-x-0 bottom-0 border-t border-white/30 bg-black/55 px-6 pb-6 pt-5 text-white backdrop-blur-md sm:px-8 sm:pb-8 sm:pt-7 xl:px-10 xl:pb-9">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.15em] text-white/75">
            Facilities, in sync
          </p>
          <h2 className="max-w-[620px] text-2xl font-semibold leading-[1.15] tracking-[-0.025em] sm:text-[30px] xl:text-[36px]">
            A better-run building starts with a clearer view.
          </h2>
          <div className="mt-5 flex flex-wrap items-center gap-2">
            {facilityServices.map(({ label, icon: Icon }) => (
              <span
                key={label}
                className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3 py-2 text-xs font-medium text-white/90"
              >
                <Icon aria-hidden="true" className="h-3.5 w-3.5" />
                {label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </aside>
  );
}
