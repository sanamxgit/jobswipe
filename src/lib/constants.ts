export const DEFAULT_TOPIC = "cyber security";

/** True when the feed should stay cyber-focused (default + cyber-related searches). */
export function isCyberTopic(topic: string): boolean {
  const t = topic.trim().toLowerCase();
  if (!t || t === DEFAULT_TOPIC.toLowerCase()) return true;
  return /cyber|security|infosec|soc\b|pentest|penetration|grc|appsec|devsecops|ciso|information security|cloud security|blue team|red team|threat|vulnerability/.test(
    t
  );
}
