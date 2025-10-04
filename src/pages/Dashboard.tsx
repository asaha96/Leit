import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import { Calendar, TrendingUp, Target, Clock, BookOpen, CheckCircle2, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { canvasService, type CanvasData, type CanvasAssignment } from '@/services/canvasService';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

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
  
  // Canvas integration state
  const [canvasData, setCanvasData] = useState<CanvasData | null>(null);
  const [canvasLoading, setCanvasLoading] = useState(false);
  const [canvasConfigured, setCanvasConfigured] = useState(false);

  useEffect(() => {
    if (dbUser) {
      fetchDashboardData();
    }
    
    // Check if Canvas is configured and fetch data
    setCanvasConfigured(canvasService.isConfigured());
    if (canvasService.isConfigured()) {
      fetchCanvasData();
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

  const fetchCanvasData = async () => {
    setCanvasLoading(true);
    try {
      const data = await canvasService.getAllData();
      setCanvasData(data);
    } catch (error) {
      console.error('Error fetching Canvas data:', error);
    } finally {
      setCanvasLoading(false);
    }
  };

  const formatDueDate = (dueDate: string) => {
    const date = new Date(dueDate);
    const now = new Date();
    const diffTime = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Due today';
    if (diffDays === 1) return 'Due tomorrow';
    if (diffDays < 7) return `Due in ${diffDays} days`;
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  if (loading) {
    return <div className="p-6">Loading dashboard...</div>;
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        {canvasConfigured && (
          <Badge variant="outline" className="gap-2">
            <BookOpen className="h-4 w-4" />
            Canvas Connected
          </Badge>
        )}
      </div>

      <Tabs defaultValue="flashcards" className="space-y-6">
        <TabsList>
          <TabsTrigger value="flashcards">Flashcard Analytics</TabsTrigger>
          {canvasConfigured && (
            <TabsTrigger value="canvas">Canvas LMS</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="flashcards" className="space-y-6">
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
        </TabsContent>

        {canvasConfigured && (
          <TabsContent value="canvas" className="space-y-6">
            {canvasLoading ? (
              <div className="text-center p-8">Loading Canvas data...</div>
            ) : (
              <>
                {/* Canvas Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Active Courses</CardTitle>
                      <BookOpen className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{canvasData?.activeCourses.length || 0}</div>
                      <p className="text-xs text-muted-foreground">
                        Student enrollments
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Assignments</CardTitle>
                      <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {canvasData?.currentAssignments.length || 0}
                      </div>
                      <p className="text-xs text-muted-foreground">From all courses</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Due This Week</CardTitle>
                      <AlertCircle className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {canvasData?.upcomingAssignments.length || 0}
                      </div>
                      <p className="text-xs text-muted-foreground">Upcoming deadlines</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Active Courses List */}
                <Card>
                  <CardHeader>
                    <CardTitle>Active Courses</CardTitle>
                    <CardDescription>Courses where you are enrolled as a student</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {!canvasData?.activeCourses || canvasData.activeCourses.length === 0 ? (
                        <p className="text-muted-foreground text-center py-4">
                          No active courses found
                        </p>
                      ) : (
                        canvasData.activeCourses.map((course) => (
                          <div 
                            key={course.id} 
                            className="flex items-center justify-between p-3 rounded-lg bg-accent/50"
                          >
                            <div>
                              <h4 className="text-sm font-semibold">{course.name}</h4>
                              <p className="text-xs text-muted-foreground">{course.course_code}</p>
                            </div>
                            <Badge variant="outline">{course.course_code}</Badge>
                          </div>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Upcoming Assignments */}
                <Card>
                  <CardHeader>
                    <CardTitle>Upcoming Assignments</CardTitle>
                    <CardDescription>Assignments due in the next 7 days</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {!canvasData?.upcomingAssignments || canvasData.upcomingAssignments.length === 0 ? (
                        <p className="text-muted-foreground text-center py-4">
                          No upcoming assignments in the next week
                        </p>
                      ) : (
                        canvasData.upcomingAssignments.map((assignment) => (
                          <div 
                            key={assignment.id} 
                            className="flex items-start justify-between p-4 rounded-lg bg-accent/50 hover:bg-accent/70 transition-colors"
                          >
                            <div className="flex-1 space-y-1">
                              <h4 className="text-sm font-semibold">{assignment.name}</h4>
                              <p className="text-xs text-muted-foreground">
                                {assignment.course_name} ({assignment.course_code})
                              </p>
                              {assignment.description && (
                                <p 
                                  className="text-xs text-muted-foreground line-clamp-2"
                                  dangerouslySetInnerHTML={{ 
                                    __html: assignment.description.replace(/<[^>]*>/g, '').substring(0, 100) 
                                  }}
                                />
                              )}
                              <div className="flex items-center gap-2 mt-2">
                                <Badge variant="outline" className="text-xs">
                                  {assignment.points_possible} points
                                </Badge>
                                {assignment.due_at && (
                                  <span className="text-xs text-muted-foreground">
                                    {formatDueDate(assignment.due_at)}
                                  </span>
                                )}
                              </div>
                            </div>
                            <Clock className="h-4 w-4 text-muted-foreground ml-4 flex-shrink-0" />
                          </div>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};