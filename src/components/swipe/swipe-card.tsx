"use client";

import { useState } from "react";
import {
  motion,
  useMotionValue,
  useTransform,
  type PanInfo,
} from "framer-motion";
import type { Job, SwipeDirection } from "@/lib/types";
import { JobCard } from "@/components/swipe/job-card";

type SwipeCardProps = {
  job: Job;
  active: boolean;
  onSwipe: (direction: SwipeDirection) => void;
  onOpenDetails: () => void;
};

const THRESHOLD = 100;

export function SwipeCard({
  job,
  active,
  onSwipe,
  onOpenDetails,
}: SwipeCardProps) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-18, 18]);
  const [overlay, setOverlay] = useState<"left" | "right" | "up" | null>(null);

  const handleDrag = (_: unknown, info: PanInfo) => {
    const { offset } = info;
    if (offset.y < -THRESHOLD && Math.abs(offset.y) > Math.abs(offset.x)) {
      setOverlay("up");
    } else if (offset.x > THRESHOLD) {
      setOverlay("right");
    } else if (offset.x < -THRESHOLD) {
      setOverlay("left");
    } else {
      setOverlay(null);
    }
  };

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    const { offset, velocity } = info;
    const swipePowerX = Math.abs(offset.x) * Math.abs(velocity.x);
    const swipePowerY = Math.abs(offset.y) * Math.abs(velocity.y);

    if (
      (offset.y < -THRESHOLD || swipePowerY > 12000) &&
      Math.abs(offset.y) > Math.abs(offset.x) * 0.85
    ) {
      onSwipe("up");
      return;
    }
    if (offset.x > THRESHOLD || swipePowerX > 14000) {
      onSwipe("right");
      return;
    }
    if (offset.x < -THRESHOLD || (offset.x < 0 && swipePowerX > 14000)) {
      onSwipe("left");
      return;
    }
    setOverlay(null);
  };

  return (
    <motion.div
      className="absolute inset-0 touch-none"
      style={{ x, y, rotate, zIndex: active ? 20 : 10 }}
      drag={active}
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      dragElastic={0.9}
      onDrag={handleDrag}
      onDragEnd={handleDragEnd}
      initial={{ scale: active ? 1 : 0.96, opacity: active ? 1 : 0.85 }}
      animate={{
        scale: active ? 1 : 0.96,
        opacity: active ? 1 : 0.85,
      }}
      exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.18 } }}
      transition={{ type: "spring", stiffness: 320, damping: 28 }}
    >
      <JobCard
        job={job}
        dragOverlay={active ? overlay : null}
        onOpenDetails={onOpenDetails}
      />
    </motion.div>
  );
}
