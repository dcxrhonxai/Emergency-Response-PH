import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle, Clock, TrendingUp, Activity, CheckCircle, Download, FileText, RefreshCw } from "lucide-react";
import { format, subDays, startOfDay, endOfDay, differenceInMinutes } from "date-fns";
import { exportToCSV, exportToPDF } from "@/lib/exportUtils";
import { toast } from "sonner";
import AuditLogsViewer from "./AuditLogsViewer";

interface AlertStats {
  total: number;
  active: number;
  resolved: number;
  escalated: number;
  avgResponseTime: number;
}

interface AlertByType {
  type: string;
  count: number;
}

interface DailyActivity {
  date: string;
  alerts: number;
  resolved: number;
}

interface HourlyDistribution {
  hour: string;
  count: number;
}

const COLORS = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6", "#8b5cf6", "#ec4899"];

const AnalyticsDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState("7");
  const [stats, setStats] = useState<AlertStats>({
    total: 0,
    active: 0,
    resolved: 0,
    escalated: 0,
    avgResponseTime: 0
  });
  const [alertsByType, setAlertsByType] = useState<AlertByType[]>([]);
  const [dailyActivity, setDailyActivity] = useState<DailyActivity[]>([]);
  const [hourlyDistribution, setHourlyDistribution] = useState<HourlyDistribution[]>([]);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  useEffect(() => {
    loadAnalytics();

    // Set up real-time subscription
    const channel = supabase
      .channel("analytics-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "emergency_alerts"
        },
        () => {
          loadAnalytics();
          toast.info("Dashboard updated with new data");
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [dateRange]);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const days = parseInt(dateRange);
      const startDate = startOfDay(subDays(new Date(), days));
      const endDate = endOfDay(new Date());

      const { data: alerts, error } = await supabase
        .from("emergency_alerts")
        .select("*")
        .gte("created_at", startDate.toISOString())
        .lte("created_at", endDate.toISOString());

      if (error) throw error;

      if (!alerts || alerts.length === 0) {
        setStats({ total: 0, active: 0, resolved: 0, escalated: 0, avgResponseTime: 0 });
        setAlertsByType([]);
        setDailyActivity([]);
        setHourlyDistribution([]);
        setLoading(false);
        setLastUpdate(new Date());
        return;
      }

      const active = alerts.filter(a => a.status === "active").length;
      const resolved = alerts.filter(a => a.status === "resolved").length;
      const escalated = alerts.filter(a => a.status === "escalated").length;

      const resolvedAlerts = alerts.filter(a => a.resolved_at);
      let avgResponseTime = 0;
      if (resolvedAlerts.length > 0) {
        const totalMinutes = resolvedAlerts.reduce((sum, alert) => {
          const created = new Date(alert.created_at);
          const resolvedAt = new Date(alert.resolved_at!);
          return sum + differenceInMinutes(resolvedAt, created);
        }, 0);
        avgResponseTime = Math.round(totalMinutes / resolvedAlerts.length);
      }

      setStats({ total: alerts.length, active, resolved, escalated, avgResponseTime });

      const typeGroups: Record<string, number> = {};
      alerts.forEach(alert => {
        const type = alert.emergency_type || "Unknown";
        typeGroups[type] = (typeGroups[type] || 0) + 1;
      });
      setAlertsByType(
        Object.entries(typeGroups)
          .map(([type, count]) => ({ type, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 7)
      );

      const dailyGroups: Record<string, { alerts: number; resolved: number }> = {};
      for (let i = days; i >= 0; i--) {
        const date = format(subDays(new Date(), i), "MMM dd");
        dailyGroups[date] = { alerts: 0, resolved: 0 };
      }
      alerts.forEach(alert => {
        const date = format(new Date(alert.created_at), "MMM dd");
        if (dailyGroups[date]) {
          dailyGroups[date].alerts++;
          if (alert.status === "resolved") {
            dailyGroups[date].resolved++;
          }
        }
      });
      setDailyActivity(
        Object.entries(dailyGroups).map(([date, data]) => ({
          date,
          alerts: data.alerts,
          resolved: data.resolved
        }))
      );

      const hourlyGroups: Record<number, number> = {};
      for (let i = 0; i < 24; i++) {
        hourlyGroups[i] = 0;
      }
      alerts.forEach(alert => {
        const hour = new Date(alert.created_at).getHours();
        hourlyGroups[hour]++;
      });
      setHourlyDistribution(
        Object.entries(hourlyGroups).map(([hour, count]) => ({
          hour: `${hour.toString().padStart(2, "0")}:00`,
          count
        }))
      );

      setLastUpdate(new Date());
    } catch (error) {
      console.error("Error loading analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = (type: "pdf" | "csv") => {
    const exportData = {
      stats,
      alertsByType,
      dailyActivity,
      dateRange
    };

    try {
      if (type === "pdf") {
        exportToPDF(exportData);
        toast.success("PDF report downloaded");
      } else {
        exportToCSV(exportData);
        toast.success("CSV report downloaded");
      }
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export report");
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse space-y-3">
                  <div className="h-4 bg-muted rounded w-1/2" />
                  <div className="h-8 bg-muted rounded w-3/4" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Analytics Overview</h2>
          <p className="text-muted-foreground">
            Last updated: {format(lastUpdate, "PPp")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadAnalytics}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="14">Last 14 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleExport("pdf")}>
                <FileText className="h-4 w-4 mr-2" />
                Export as PDF
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport("csv")}>
                <FileText className="h-4 w-4 mr-2" />
                Export as CSV
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Alerts</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-500/10 rounded-lg">
                <Activity className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active</p>
                <p className="text-2xl font-bold">{stats.active}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Resolved</p>
                <p className="text-2xl font-bold">{stats.resolved}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-500/10 rounded-lg">
                <Clock className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Avg Response</p>
                <p className="text-2xl font-bold">{stats.avgResponseTime}m</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Daily Activity
            </CardTitle>
            <CardDescription>Alerts created vs resolved per day</CardDescription>
          </CardHeader>
          <CardContent>
            {dailyActivity.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={dailyActivity}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px"
                    }}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="alerts" stroke="#ef4444" strokeWidth={2} dot={{ fill: "#ef4444" }} name="Alerts" />
                  <Line type="monotone" dataKey="resolved" stroke="#22c55e" strokeWidth={2} dot={{ fill: "#22c55e" }} name="Resolved" />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                No data available
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Alert Types Distribution
            </CardTitle>
            <CardDescription>Breakdown by emergency type</CardDescription>
          </CardHeader>
          <CardContent>
            {alertsByType.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={alertsByType}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="count"
                    nameKey="type"
                    label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                  >
                    {alertsByType.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px"
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                No data available
              </div>
            )}
            {alertsByType.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-4 justify-center">
                {alertsByType.map((item, index) => (
                  <Badge key={item.type} variant="outline" className="text-xs" style={{ borderColor: COLORS[index % COLORS.length] }}>
                    <div className="w-2 h-2 rounded-full mr-1" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                    {item.type}: {item.count}
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Hourly Distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Hourly Distribution
          </CardTitle>
          <CardDescription>When alerts are most commonly reported</CardDescription>
        </CardHeader>
        <CardContent>
          {hourlyDistribution.some(h => h.count > 0) ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={hourlyDistribution}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="hour" className="text-xs" interval={2} />
                <YAxis className="text-xs" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px"
                  }}
                />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Alerts" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-muted-foreground">
              No data available
            </div>
          )}
        </CardContent>
      </Card>

      {/* Additional Stats */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-1">Resolution Rate</p>
              <p className="text-3xl font-bold text-green-500">
                {stats.total > 0 ? Math.round((stats.resolved / stats.total) * 100) : 0}%
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-1">Escalation Rate</p>
              <p className="text-3xl font-bold text-yellow-500">
                {stats.total > 0 ? Math.round((stats.escalated / stats.total) * 100) : 0}%
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-1">Avg Alerts/Day</p>
              <p className="text-3xl font-bold text-primary">
                {(stats.total / parseInt(dateRange)).toFixed(1)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Audit Logs */}
      <AuditLogsViewer />
    </div>
  );
};

export default AnalyticsDashboard;
