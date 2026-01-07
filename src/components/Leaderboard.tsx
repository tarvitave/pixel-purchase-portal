import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { lamportsToSol } from '@/hooks/usePixels';
import { Trophy, Coins } from 'lucide-react';

interface LeaderboardEntry {
  owner_wallet: string;
  pixel_count: number;
  total_spent_lamports: number;
}

export const Leaderboard = () => {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'pixels' | 'spent'>('pixels');

  useEffect(() => {
    const fetchLeaderboard = async () => {
      const { data, error } = await supabase
        .from('pixels')
        .select('owner_wallet, price_lamports')
        .not('owner_wallet', 'is', null);

      if (error) {
        console.error('Error fetching leaderboard:', error);
        setLoading(false);
        return;
      }

      // Aggregate by wallet
      const walletStats = new Map<string, { count: number; spent: number }>();
      
      data?.forEach((pixel) => {
        if (!pixel.owner_wallet) return;
        const existing = walletStats.get(pixel.owner_wallet) || { count: 0, spent: 0 };
        walletStats.set(pixel.owner_wallet, {
          count: existing.count + 1,
          spent: existing.spent + Number(pixel.price_lamports),
        });
      });

      const leaderboard: LeaderboardEntry[] = Array.from(walletStats.entries()).map(
        ([wallet, stats]) => ({
          owner_wallet: wallet,
          pixel_count: stats.count,
          total_spent_lamports: stats.spent,
        })
      );

      setEntries(leaderboard);
      setLoading(false);
    };

    fetchLeaderboard();

    // Subscribe to real-time updates
    const channel = supabase
      .channel('leaderboard-updates')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'pixels' },
        () => fetchLeaderboard()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const sortedEntries = [...entries].sort((a, b) => {
    if (view === 'pixels') {
      return b.pixel_count - a.pixel_count;
    }
    return b.total_spent_lamports - a.total_spent_lamports;
  });

  const truncateWallet = (wallet: string) => {
    return `${wallet.slice(0, 4)}...${wallet.slice(-4)}`;
  };

  const getRankColor = (index: number) => {
    if (index === 0) return 'text-yellow-400';
    if (index === 1) return 'text-gray-300';
    if (index === 2) return 'text-amber-600';
    return 'text-muted-foreground';
  };

  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
          <Trophy className="w-4 h-4 text-primary" />
          Leaderboard
        </h3>
        <div className="flex gap-1">
          <button
            onClick={() => setView('pixels')}
            className={`px-2 py-1 text-xs rounded transition-colors ${
              view === 'pixels'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:text-foreground'
            }`}
          >
            Pixels
          </button>
          <button
            onClick={() => setView('spent')}
            className={`px-2 py-1 text-xs rounded transition-colors ${
              view === 'spent'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:text-foreground'
            }`}
          >
            SOL Spent
          </button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-8 bg-muted/50 rounded animate-pulse" />
          ))}
        </div>
      ) : sortedEntries.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-4">
          No pixels claimed yet. Be the first!
        </p>
      ) : (
        <div className="space-y-1.5">
          {sortedEntries.slice(0, 10).map((entry, index) => (
            <div
              key={entry.owner_wallet}
              className="flex items-center justify-between text-xs py-1.5 px-2 rounded bg-muted/30 hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className={`font-bold w-4 ${getRankColor(index)}`}>
                  {index + 1}
                </span>
                <span className="font-mono text-foreground">
                  {truncateWallet(entry.owner_wallet)}
                </span>
              </div>
              <div className="flex items-center gap-1">
                {view === 'pixels' ? (
                  <>
                    <span className="font-semibold text-primary">
                      {entry.pixel_count.toLocaleString()}
                    </span>
                    <span className="text-muted-foreground">px</span>
                  </>
                ) : (
                  <>
                    <Coins className="w-3 h-3 text-accent" />
                    <span className="font-semibold text-accent">
                      {lamportsToSol(entry.total_spent_lamports).toFixed(4)}
                    </span>
                    <span className="text-muted-foreground">SOL</span>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
