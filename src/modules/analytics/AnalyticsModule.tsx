import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ModulePage } from "../../components/ModulePage";
import { DataTable } from "../../components/DataTable";
import { useAuthStore } from "../../store/authStore";
import { useToastStore } from "../../store/toastStore";
import {
  getAdminAnalytics,
  listAuditLogs,
  listUserSessions,
  type AdminAnalytics,
  type AuditEntry,
  type UserSession,
} from "./api";
import { Activity, Clock, ShieldAlert, FileText, Database, Users } from "lucide-react";

export function AnalyticsModule() {
  const { t } = useTranslation("analytics");
  const { companyId } = useAuthStore();
  const { addToast } = useToastStore();

  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditEntry[]>([]);
  const [sessions, setSessions] = useState<UserSession[]>([]);
  
  const [activeTab, setActiveTab] = useState<"audit" | "sessions">("audit");

  const currentCompanyId = companyId || 1;

  useEffect(() => {
    loadData();
  }, [currentCompanyId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [stats, logs, sess] = await Promise.all([
        getAdminAnalytics(currentCompanyId),
        listAuditLogs(),
        listUserSessions(),
      ]);
      setAnalytics(stats);
      setAuditLogs(logs);
      setSessions(sess);
    } catch (err) {
      addToast(err instanceof Error ? err.message : "Failed to load analytics", "error");
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ label, value, icon: Icon, color }: any) => (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-sm flex items-center justify-between transition-transform hover:scale-[1.02]">
      <div>
        <p className="text-[10px] font-black uppercase text-text-muted tracking-widest">{label}</p>
        <p className="text-3xl font-black text-text-primary tracking-tight mt-2">{value}</p>
      </div>
      <div className={`rounded-xl ${color} p-4 shadow-inner`}>
        <Icon className="h-8 w-8" />
      </div>
    </div>
  );

  return (
    <ModulePage
      title={t("title", "Admin Analytics")}
      subtitle={t("subtitle", "Monitor user activity and system modifications")}
      loading={loading}
    >
      <div className="space-y-8 p-6">
        {analytics && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard label={t("invoices_today", "Invoices (Today)")} value={analytics.invoices_today} icon={FileText} color="bg-primary/10 text-primary" />
            <StatCard label={t("quotes_today", "Quotations (Today)")} value={analytics.quotations_today} icon={Database} color="bg-warning/10 text-warning" />
            <StatCard label={t("active_users", "Active Users (Today)")} value={analytics.active_users_today} icon={Users} color="bg-success/10 text-success" />
            <StatCard label={t("actions_today", "Actions Tracked")} value={analytics.total_actions_today} icon={Activity} color="bg-error/10 text-error" />
          </div>
        )}

        <div className="flex items-center gap-4 border-b border-border">
          <button
            onClick={() => setActiveTab("audit")}
            className={`px-4 py-3 text-sm font-bold uppercase tracking-wider border-b-2 transition-colors ${activeTab === "audit" ? "border-primary text-primary" : "border-transparent text-text-muted hover:text-text-primary"}`}
          >
            {t("audit_logs", "Audit Logs")}
          </button>
          <button
            onClick={() => setActiveTab("sessions")}
            className={`px-4 py-3 text-sm font-bold uppercase tracking-wider border-b-2 transition-colors ${activeTab === "sessions" ? "border-primary text-primary" : "border-transparent text-text-muted hover:text-text-primary"}`}
          >
            {t("user_sessions", "User Sessions")}
          </button>
        </div>

        <div>
          {activeTab === "audit" ? (
            <DataTable
              data={auditLogs}
              keyExtractor={(item) => item.id}
              emptyMessage={t("no_audit", "No audit logs found")}
              emptyIcon={<ShieldAlert className="h-10 w-10 text-text-muted/30" />}
              columns={[
                {
                  header: t("timestamp", "Timestamp"),
                  accessor: (row) => (
                    <span className="text-xs text-text-muted">
                      {new Date(row.created_at).toLocaleString()}
                    </span>
                  )
                },
                {
                  header: t("user", "User"),
                  accessor: (row) => (
                    <span className="font-bold text-sm text-text-primary">{row.username}</span>
                  )
                },
                {
                  header: t("action", "Action"),
                  accessor: (row) => (
                    <span className="px-2 py-1 rounded bg-primary/10 text-primary text-[10px] font-black uppercase">
                      {row.action}
                    </span>
                  )
                },
                {
                  header: t("entity", "Entity"),
                  accessor: (row) => (
                    <span className="text-xs font-bold text-text-primary">
                      {row.entity_type} <span className="opacity-50">#{row.entity_id}</span>
                    </span>
                  )
                }
              ]}
            />
          ) : (
            <DataTable
              data={sessions}
              keyExtractor={(item) => item.id}
              emptyMessage={t("no_sessions", "No user sessions found")}
              emptyIcon={<Clock className="h-10 w-10 text-text-muted/30" />}
              columns={[
                {
                  header: t("user", "User"),
                  accessor: (row) => (
                    <span className="font-bold text-sm text-text-primary">{row.username}</span>
                  )
                },
                {
                  header: t("time_in", "Time In"),
                  accessor: (row) => (
                    <span className="text-xs text-text-primary font-medium">
                      {new Date(row.time_in).toLocaleString()}
                    </span>
                  )
                },
                {
                  header: t("time_out", "Time Out"),
                  accessor: (row) => (
                    <span className="text-xs text-text-muted">
                      {row.time_out ? new Date(row.time_out).toLocaleString() : t("active", "Active")}
                    </span>
                  )
                },
                {
                  header: t("duration", "Duration"),
                  accessor: (row) => {
                    const end = row.time_out ? new Date(row.time_out).getTime() : new Date().getTime();
                    const start = new Date(row.time_in).getTime();
                    const diffMins = Math.floor((end - start) / 60000);
                    const hrs = Math.floor(diffMins / 60);
                    const mins = diffMins % 60;
                    return (
                      <span className="text-xs font-bold text-primary">
                        {hrs > 0 ? `${hrs}h ` : ''}{mins}m
                      </span>
                    )
                  }
                }
              ]}
            />
          )}
        </div>
      </div>
    </ModulePage>
  );
}
