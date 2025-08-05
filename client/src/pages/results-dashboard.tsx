import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Download, Users, TrendingUp, CheckCircle, Clock, RefreshCw } from "lucide-react";
import type { TestWithStats, TestAttempt } from "@shared/schema";

export default function ResultsDashboard() {
  const [, params] = useRoute("/results/:testId");
  const testId = params?.testId || "";
  const [currentTime, setCurrentTime] = useState(new Date());

  const { data: testStats, isLoading: statsLoading, refetch: refetchStats } = useQuery<TestWithStats>({
    queryKey: ["/api/tests", testId, "stats"],
    enabled: !!testId,
    refetchInterval: 30000, // Refetch every 30 seconds for live updates
  });

  const { data: attempts, isLoading: attemptsLoading, refetch: refetchAttempts } = useQuery<TestAttempt[]>({
    queryKey: ["/api/tests", testId, "attempts"],
    enabled: !!testId,
    refetchInterval: 10000, // Refetch every 10 seconds for live updates
  });

  // Update current time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  const formatTimeAgo = (date: string) => {
    const now = currentTime.getTime();
    const attemptTime = new Date(date).getTime();
    const diffMinutes = Math.floor((now - attemptTime) / (1000 * 60));
    
    if (diffMinutes < 1) return "Just now";
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)}h ago`;
    return `${Math.floor(diffMinutes / 1440)}d ago`;
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const getScoreColor = (percentage: number) => {
    if (percentage >= 80) return "text-emerald-600";
    if (percentage >= 60) return "text-blue-600";
    if (percentage >= 40) return "text-amber-600";
    return "text-red-600";
  };

  const getInitials = (name: string | null) => {
    if (!name) return "AN"; // Anonymous
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  if (statsLoading || attemptsLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading results...</p>
        </div>
      </div>
    );
  }

  if (!testStats) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Card className="max-w-md mx-4">
          <CardContent className="p-6 text-center">
            <h2 className="text-xl font-bold text-slate-800 mb-2">Test Not Found</h2>
            <p className="text-slate-600">The test results you're looking for don't exist.</p>
            <Button asChild className="mt-4">
              <Link href="/">Back to Home</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Navigation Header */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <Button variant="ghost" asChild>
                <Link href="/">
                  <ArrowLeft className="mr-2" size={16} />
                  Back to Home
                </Link>
              </Button>
            </div>
            <div className="flex space-x-3">
              <Button variant="outline" onClick={() => { refetchStats(); refetchAttempts(); }}>
                <RefreshCw className="mr-2" size={16} />
                Refresh
              </Button>
              <Button className="bg-emerald-500 hover:bg-emerald-600">
                <Download className="mr-2" size={16} />
                Export Results
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Dashboard Header */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-slate-800">Test Results Dashboard</h2>
          <p className="text-slate-600 mt-1">{testStats.title} - Live Results</p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Total Attempts</p>
                  <p className="text-3xl font-bold text-slate-800">{testStats.totalAttempts}</p>
                </div>
                <div className="bg-blue-100 w-12 h-12 rounded-lg flex items-center justify-center">
                  <Users className="text-blue-500" size={24} />
                </div>
              </div>
              <div className="mt-2">
                <span className="text-emerald-500 text-sm font-medium">
                  {testStats.totalAttempts > 0 ? "Active" : "No attempts yet"}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Average Score</p>
                  <p className="text-3xl font-bold text-slate-800">
                    {testStats.totalAttempts > 0 ? `${testStats.averageScore.toFixed(1)}%` : "N/A"}
                  </p>
                </div>
                <div className="bg-emerald-100 w-12 h-12 rounded-lg flex items-center justify-center">
                  <TrendingUp className="text-emerald-500" size={24} />
                </div>
              </div>
              <div className="mt-2">
                <span className="text-emerald-500 text-sm font-medium">
                  {testStats.averageScore >= 75 ? "Above target" : "Below target"}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Completion Rate</p>
                  <p className="text-3xl font-bold text-slate-800">
                    {testStats.totalAttempts > 0 ? `${testStats.completionRate.toFixed(1)}%` : "N/A"}
                  </p>
                </div>
                <div className="bg-indigo-100 w-12 h-12 rounded-lg flex items-center justify-center">
                  <CheckCircle className="text-indigo-500" size={24} />
                </div>
              </div>
              <div className="mt-2">
                <span className="text-emerald-500 text-sm font-medium">
                  {testStats.completionRate >= 90 ? "Excellent engagement" : "Good engagement"}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Avg. Time</p>
                  <p className="text-3xl font-bold text-slate-800">
                    {testStats.totalAttempts > 0 ? formatDuration(testStats.averageTime) : "N/A"}
                  </p>
                </div>
                <div className="bg-amber-100 w-12 h-12 rounded-lg flex items-center justify-center">
                  <Clock className="text-amber-500" size={24} />
                </div>
              </div>
              <div className="mt-2">
                <span className="text-slate-500 text-sm font-medium">
                  Out of {testStats.duration} minutes
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Live Results Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold text-slate-800">Live Test Attempts</CardTitle>
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                  <span className="text-sm text-slate-600">Live Updates</span>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {!attempts || attempts.length === 0 ? (
              <div className="text-center py-12">
                <Users className="mx-auto text-slate-400 mb-4" size={48} />
                <h3 className="text-lg font-medium text-slate-800 mb-2">No Attempts Yet</h3>
                <p className="text-slate-600">Test attempts will appear here once students start taking the test.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Score</TableHead>
                      <TableHead>Correct/Total</TableHead>
                      <TableHead>Time Taken</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Submitted At</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {attempts.map((attempt) => {
                      const percentage = attempt.totalMarks > 0 ? (attempt.score / attempt.totalMarks) * 100 : 0;
                      const correctAnswers = Math.round((attempt.score / attempt.totalMarks) * Object.keys(attempt.answers as object).length) || 0;
                      const totalQuestions = Object.keys(attempt.answers as object).length || 0;
                      
                      return (
                        <TableRow key={attempt.id} className="hover:bg-slate-50">
                          <TableCell>
                            <div className="flex items-center">
                              <div className="bg-blue-100 w-8 h-8 rounded-full flex items-center justify-center mr-3">
                                <span className="text-blue-600 text-sm font-medium">
                                  {getInitials(attempt.studentName)}
                                </span>
                              </div>
                              <span className="text-sm font-medium text-slate-900">
                                {attempt.studentName || "Anonymous"}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center">
                              <span className={`text-sm font-semibold ${getScoreColor(percentage)} mr-2`}>
                                {percentage.toFixed(0)}%
                              </span>
                              <div className="w-16 bg-slate-200 rounded-full h-2">
                                <div 
                                  className={`h-2 rounded-full ${
                                    percentage >= 80 ? 'bg-emerald-500' : 
                                    percentage >= 60 ? 'bg-blue-500' : 
                                    percentage >= 40 ? 'bg-amber-500' : 'bg-red-500'
                                  }`}
                                  style={{ width: `${Math.min(percentage, 100)}%` }}
                                />
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-slate-900">
                            {correctAnswers}/{totalQuestions}
                          </TableCell>
                          <TableCell className="text-sm text-slate-900">
                            {formatDuration(attempt.timeTaken)}
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant={attempt.isCompleted ? "default" : "secondary"}
                              className={
                                attempt.isCompleted 
                                  ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-100" 
                                  : "bg-amber-100 text-amber-800 hover:bg-amber-100"
                              }
                            >
                              {attempt.isCompleted ? "Completed" : "In Progress"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-slate-500">
                            {attempt.submittedAt ? formatTimeAgo(attempt.submittedAt.toString()) : "-"}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
