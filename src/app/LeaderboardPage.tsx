import React, { useEffect, useState } from "react";
import { Card } from "../components/Card";
import { apiFetch } from "../lib/api";

interface LeaderboardEntry {
  rank: number;
  name: string;
}

export const LeaderboardPage: React.FC = () => {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const data = await apiFetch<{ leaderboard: LeaderboardEntry[] }>("/api/leaderboard");
      setEntries(data.leaderboard);
      setLoading(false);
    };
    load();
  }, []);

  if (loading) {
    return <div className="py-12 text-center text-[var(--text-muted)]">Loading leaderboard...</div>;
  }

  return (
    <Card className="space-y-4">
      <h2 className="font-display text-2xl">Leaderboard</h2>
      <div className="space-y-2 text-sm">
        {entries.map((entry) => (
          <div key={entry.rank} className="flex justify-between border-b border-[var(--border)] pb-2">
            <span>#{entry.rank}</span>
            <span className="font-medium">{entry.name}</span>
          </div>
        ))}
      </div>
    </Card>
  );
};
