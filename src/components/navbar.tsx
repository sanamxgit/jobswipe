"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bookmark, Home, Settings, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { getSavedJobs } from "@/lib/storage";

const links = [
  { href: "/", label: "Swipe", icon: Home },
  { href: "/saved", label: "Saved", icon: Bookmark },
  { href: "/profile", label: "Profile", icon: Settings },
];

export function Navbar() {
  const pathname = usePathname();
  const [savedCount, setSavedCount] = useState(0);

  useEffect(() => {
    const refresh = () => setSavedCount(getSavedJobs().length);
    refresh();
    window.addEventListener("jobswipe:saved-updated", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("jobswipe:saved-updated", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  return (
    <header className="sticky top-0 z-40 border-b border-pink-200/80 bg-white/75 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-3xl items-center justify-between gap-3 px-4">
        <Link href="/" className="flex items-center gap-2 group">
          <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-pink-100 border border-pink-200 text-pink-600 group-hover:bg-pink-200/70 transition-colors">
            <Sparkles className="h-4 w-4" />
          </span>
          <div className="leading-tight">
            <p className="font-semibold tracking-tight text-pink-950">
              JobSwipe
            </p>
            <p className="text-[11px] text-pink-400 hidden sm:block">
             Especially made for you babyyyy.
            </p>
          </div>
        </Link>

        <nav className="flex items-center gap-1">
          {links.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "relative flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm transition-colors",
                  active
                    ? "bg-pink-100 text-pink-700"
                    : "text-pink-400 hover:text-pink-700 hover:bg-pink-50"
                )}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{label}</span>
                {href === "/saved" && savedCount > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-pink-500 px-1 text-[10px] font-bold text-white">
                    {savedCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
