import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

export default async function handler(req, res) {
  // Verify the request is from Vercel Cron
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const { count, error } = await supabase
      .from("users")
      .select("*", { count: "exact", head: true });

    if (error) throw error;

    res.json({ ok: true, userCount: count, timestamp: new Date().toISOString() });
  } catch (err) {
    console.error("Keep-alive ping failed:", err.message);
    res.status(500).json({ error: err.message });
  }
}
