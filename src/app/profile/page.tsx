"use client";

import { useEffect, useState, type ChangeEvent } from "react";
import { FileUp, Save, User } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getProfile, saveProfile } from "@/lib/storage";
import type { UserProfileLocal } from "@/lib/types";

const MAX_CV_BYTES = 1.8 * 1024 * 1024;

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfileLocal>({
    email: "",
    fullName: "",
    locationLabel: "United Kingdom",
  });

  useEffect(() => {
    setProfile(getProfile());
  }, []);

  function persist(next: UserProfileLocal) {
    setProfile(next);
    saveProfile(next);
  }

  function onSave() {
    if (!profile.email.trim()) {
      toast.error("Email is required for applications");
      return;
    }
    saveProfile(profile);
    toast.success("Profile saved");
  }

  async function onCv(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== "application/pdf") {
      toast.error("Please upload a PDF CV");
      return;
    }
    if (file.size > MAX_CV_BYTES) {
      toast.error("CV must be under ~1.8MB for browser storage");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || "");
      persist({
        ...profile,
        cvFileName: file.name,
        cvDataUrl: dataUrl,
      });
      toast.success("CV uploaded");
    };
    reader.onerror = () => toast.error("Could not read file");
    reader.readAsDataURL(file);
  }

  return (
    <main className="mx-auto max-w-lg px-4 py-8">
      <div className="mb-6 flex items-center gap-3">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-pink-100 text-pink-600">
          <User className="h-6 w-6" />
        </span>
        <div>
          <h1 className="text-2xl font-semibold text-pink-950">Your profile</h1>
          <p className="text-sm text-pink-500">
            Saved locally — used for cover letters & apply
          </p>
        </div>
      </div>

      <div className="space-y-3 rounded-3xl border border-pink-100 bg-white/80 p-5 shadow-sm shadow-pink-100">
        <label className="block text-sm font-medium text-pink-800">
          Full name
          <Input
            className="mt-1.5"
            value={profile.fullName}
            onChange={(e) =>
              setProfile((p) => ({ ...p, fullName: e.target.value }))
            }
            placeholder="Your name"
          />
        </label>
        <label className="block text-sm font-medium text-pink-800">
          Email
          <Input
            className="mt-1.5"
            type="email"
            value={profile.email}
            onChange={(e) =>
              setProfile((p) => ({ ...p, email: e.target.value }))
            }
            placeholder="you@example.com"
            required
          />
        </label>
        <label className="block text-sm font-medium text-pink-800">
          Home location label
          <Input
            className="mt-1.5"
            value={profile.locationLabel}
            onChange={(e) =>
              setProfile((p) => ({ ...p, locationLabel: e.target.value }))
            }
            placeholder="London, UK"
          />
        </label>

        <div className="rounded-2xl border border-dashed border-pink-200 bg-rose-50/50 p-4">
          <p className="text-sm font-medium text-pink-800">CV (PDF)</p>
          <p className="mt-1 text-xs text-pink-400">
            Upload once — attached when you Apply (if email sending is configured).
          </p>
          {profile.cvFileName && (
            <p className="mt-2 text-sm text-pink-600">📄 {profile.cvFileName}</p>
          )}
          <label className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-xl border border-pink-200 bg-white px-4 py-2 text-sm text-pink-700 hover:bg-pink-50">
            <FileUp className="h-4 w-4" />
            {profile.cvFileName ? "Replace CV" : "Upload CV"}
            <input
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={onCv}
            />
          </label>
        </div>

        <Button className="w-full" onClick={onSave}>
          <Save className="h-4 w-4" />
          Save profile
        </Button>
      </div>
    </main>
  );
}
