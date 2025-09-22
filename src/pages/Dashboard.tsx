import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import { Calendar, TrendingUp, Target, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface DashboardMetrics {
  masteryPct: number;
  dueToday: number;
  streakDays: number;
  totalCards: number;
}

interface ScoreData {
  date: string;
  avgScore: number;
}

interface WeakCard {
  id: string;
  front: string;
  avgScore: number;
}

export const Dashboard = () => {
  const { dbUser } = useAuth();
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    masteryPct: 0,
    dueToday: 0,
    streakDays: 0,
    totalCards: 0
  });
  const [scoreData, setScoreData] = useState<ScoreData[]>([]);
  const [weakCards, setWeakCards] = useState<WeakCard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (dbUser) {
      fetchDashboardData();
    }
  }, [dbUser]);

  const fetchDashboardData = async () => {
    if (!dbUser) return;

    try {
      // Fetch overall metrics
      const { data: sessions } = await supabase
        .from('sessions')
        .select('*, session_events(*)')
        .eq('user_id', dbUser.id)
        .order('started_at', { ascending: false });

      const { data: allCards } = await supabase
        .from('cards')
        .select('*');

      // Calculate metrics
      let totalEvents = 0;
      let totalScore = 0;
      let dueCount = 0;
      const dailyScores: { [key: string]: { total: number; count: number } } = {};

      sessions?.forEach(session => {
        session.session_events?.forEach((event: any) => {
          if (event.ai_score !== null) {
            totalEvents++;
            totalScore += event.ai_score;
            
            // Group by date for line chart
            const date = new Date(event.created_at).toISOString().split('T')[0];
            if (!dailyScores[date]) {
              dailyScores[date] = { total: 0, count: 0 };
            }
            dailyScores[date].total += event.ai_score;
            dailyScores[date].count++;
          }

          // Check if card is due
          if (event.next_due && new Date(event.next_due) <= new Date()) {
            dueCount++;
          }
        });
      });

      const masteryPct = totalEvents > 0 ? (totalScore / totalEvents) * 100 : 0;

      // Calculate streak (simplified - consecutive days with sessions)
      const recentDays = sessions?.reduce((acc: string[], session) => {
        const date = new Date(session.started_at!).toISOString().split('T')[0];
        if (!acc.includes(date)) acc.push(date);
        return acc;
      }, []) || [];

      const streakDays = Math.min(recentDays.length, 7); // Last 7 days max

      setMetrics({
        masteryPct: Math.round(masteryPct),
        dueToday: dueCount,
        streakDays,
        totalCards: allCards?.length || 0
      });

      // Prepare score data for chart
      const chartData = Object.entries(dailyScores)
        .map(([date, scores]) => ({
          date,
          avgScore: Math.round((scores.total / scores.count) * 100)
        }))
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(-7); // Last 7 days

      setScoreData(chartData);

      // Calculate weakest cards
      const cardScores: { [key: string]: { scores: number[]; front: string } } = {};
      
      sessions?.forEach(session => {
        session.session_events?.forEach((event: any) => {
          if (event.card_id && event.ai_score !== null) {
            if (!cardScores[event.card_id]) {
              cardScores[event.card_id] = { scores: [], front: '' };
            }
            cardScores[event.card_id].scores.push(event.ai_score);
          }
        });
      });

      // Get card details and calculate averages
      const weakCardData = await Promise.all(
        Object.entries(cardScores)
          .filter(([_, data]) => data.scores.length >= 2) // At least 2 attempts
          .map(async ([cardId, data]) => {
            const { data: card } = await supabase
              .from('cards')
              .select('front')
              .eq('id', cardId)
              .single();
            
            const avgScore = data.scores.reduce((a, b) => a + b, 0) / data.scores.length;
            return {
              id: cardId,
              front: card?.front || 'Unknown',
              avgScore: Math.round(avgScore * 100)
            };
          })
      );

      const sortedWeakCards = weakCardData
        .sort((a, b) => a.avgScore - b.avgScore)
        .slice(0, 5);

      setWeakCards(sortedWeakCards);

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-6">Loading dashboard...</div>;
  }

  return (
    <div className="space-y-6 p-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Mastery</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.masteryPct}%</div>
            <p className="text-xs text-muted-foreground">Average score</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Due Today</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.dueToday}</div>
            <p className="text-xs text-muted-foreground">Cards to review</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Streak</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.streakDays}</div>
            <p className="text-xs text-muted-foreground">Study days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cards</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalCards}</div>
            <p className="text-xs text-muted-foreground">In collection</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Performance Trend</CardTitle>
            <CardDescription>Average session scores over time</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={scoreData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis domain={[0, 100]} />
                <Tooltip formatter={(value) => [`${value}%`, 'Score']} />
                <Line 
                  type="monotone" 
                  dataKey="avgScore" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  dot={{ fill: "hsl(var(--primary))" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Cards Needing Practice</CardTitle>
            <CardDescription>Cards with lowest average scores</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {weakCards.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  No practice data available yet
                </p>
              ) : (
                weakCards.map((card, index) => (
                  <div key={card.id} className="flex items-center justify-between p-3 rounded-lg bg-accent/50">
                    <div className="flex-1">
                      <span className="text-sm font-medium">{card.front}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-bold text-destructive">
                        {card.avgScore}%
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};