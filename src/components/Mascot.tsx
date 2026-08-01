import happy from "@/assets/mascot-happy.png";
import neutral from "@/assets/mascot-neutral.png";

/** Bit, the BitQuest mascot. Two expression states for now. */
export function Mascot({
  mood = "neutral",
  size = 96,
  className = "",
}: {
  mood?: "happy" | "neutral";
  size?: number;
  className?: string;
}) {
  return (
    <img
      src={mood === "happy" ? happy : neutral}
      alt={mood === "happy" ? "Bit the mascot celebrating" : "Bit the mascot waving"}
      width={size}
      height={size}
      loading="lazy"
      className={`mascot-bounce select-none ${className}`}
      style={{ width: size, height: size }}
    />
  );
}
