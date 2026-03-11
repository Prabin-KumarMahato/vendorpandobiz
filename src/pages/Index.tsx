import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, FileText, Clock, Receipt, Plus, ArrowRight, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

interface Stats {
  totalVendors: number;
  activeRequirements: number;
  pendingReplies: number;
  receivedQuotations: number;
}

const statCards = [
  { key: "totalVendors" as const, label: "Total Vendors", icon: Users, color: "text-primary", bgClass: "from-primary/20 to-primary/0" },
  { key: "activeRequirements" as const, label: "Active Reqs", icon: FileText, color: "text-info", bgClass: "from-info/20 to-info/0" },
  { key: "pendingReplies" as const, label: "Pending Replies", icon: Clock, color: "text-warning", bgClass: "from-warning/20 to-warning/0" },
  { key: "receivedQuotations" as const, label: "Quotations", icon: Receipt, color: "text-success", bgClass: "from-success/20 to-success/0" },
];

const Dashboard = () => {
  const [stats, setStats] = useState<Stats>({ totalVendors: 0, activeRequirements: 0, pendingReplies: 0, receivedQuotations: 0 });
  const navigate = useNavigate();

  useEffect(() => {
    const fetchStats = async () => {
      const [vendors, requirements, pending, quotations] = await Promise.all([
        supabase.from("vendors").select("id", { count: "exact", head: true }),
        supabase.from("requirements").select("id", { count: "exact", head: true }).eq("status", "active"),
        supabase.from("vendor_requirements").select("id", { count: "exact", head: true }).eq("status", "sent"),
        supabase.from("quotations").select("id", { count: "exact", head: true }),
      ]);
      setStats({
        totalVendors: vendors.count ?? 0,
        activeRequirements: requirements.count ?? 0,
        pendingReplies: pending.count ?? 0,
        receivedQuotations: quotations.count ?? 0,
      });
    };
    fetchStats();
  }, []);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-semibold tracking-wider uppercase mb-4 shadow-sm backdrop-blur-sm border border-primary/10">
            <Sparkles className="h-3.5 w-3.5" /> Dashboard Overview
          </div>
          <img src="/assets/logo.png" alt="PandoBiz" className="h-12 md:h-16 object-contain drop-shadow-lg mb-6 hover:scale-105 transition-transform origin-left duration-500" />
          <h1 className="text-3xl md:text-5xl font-display font-bold text-foreground tracking-tight">Vendor Management</h1>
          <p className="text-muted-foreground mt-2 max-w-2xl leading-relaxed">Monitor your vendor ecosystem, track active requirements, and manage quotations all in one place.</p>
        </div>
        <div className="flex gap-3 mt-4 md:mt-0">
          <Button onClick={() => navigate("/requirements")} variant="outline" className="bg-background/50 backdrop-blur-sm border-white/10 hover:bg-accent hover:text-accent-foreground transition-all shadow-sm rounded-xl">
            <FileText className="h-4 w-4 mr-2" /> New Requirement
          </Button>
          <Button onClick={() => navigate("/vendors")} className="shadow-lg shadow-primary/25 hover:-translate-y-0.5 transition-all rounded-xl active:scale-95">
            <Plus className="h-4 w-4 mr-2" /> Add Vendor
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card, i) => (
          <motion.div key={card.key} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1, duration: 0.4, ease: "easeOut" }}>
            <Card className="relative overflow-hidden group hover:-translate-y-1 hover:shadow-2xl hover:shadow-primary/5 transition-all duration-300 bg-card/40 backdrop-blur-xl border-white/10 rounded-2xl">
              <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl ${card.bgClass} rounded-bl-full opacity-50 group-hover:scale-110 transition-transform duration-500`} />
              <CardHeader className="flex flex-row items-center justify-between pb-2 relative z-10">
                <CardTitle className="text-sm font-medium text-muted-foreground/80">{card.label}</CardTitle>
                <div className={`p-2.5 rounded-xl bg-background/50 backdrop-blur-sm ${card.color} shadow-sm border border-white/5`}>
                  <card.icon className="h-5 w-5" />
                </div>
              </CardHeader>
              <CardContent className="relative z-10">
                <div className="text-4xl md:text-5xl font-display font-bold tracking-tight text-foreground">{stats[card.key]}</div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3, duration: 0.5 }}>
          <Card className="bg-card/40 backdrop-blur-xl border-white/10 rounded-2xl shadow-xl shadow-black/5">
            <CardHeader>
              <CardTitle className="text-xl font-display font-semibold tracking-tight tracking-tight">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              {[
                { label: "Add New Vendor", desc: "Register a new supplier to the system", path: "/vendors", icon: Users },
                { label: "Create Requirement", desc: "Draft and send a new RFQ", path: "/requirements", icon: FileText },
                { label: "View Quotations", desc: "Check received pricing", path: "/quotations", icon: Receipt },
                { label: "Check Follow-ups", desc: "Review pending vendor communications", path: "/follow-ups", icon: Clock },
              ].map((action) => (
                <Button
                  key={action.path}
                  variant="ghost"
                  className="w-full justify-between h-auto py-4 px-4 bg-background/30 hover:bg-accent/50 hover:shadow-md transition-all duration-300 rounded-xl group border border-white/5"
                  onClick={() => navigate(action.path)}
                >
                  <div className="flex items-center gap-4">
                    <div className="p-2 rounded-lg bg-background shadow-sm border border-white/5 group-hover:scale-110 transition-transform">
                      <action.icon className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                    <div className="text-left">
                      <div className="font-semibold text-foreground">{action.label}</div>
                      <div className="text-xs text-muted-foreground">{action.desc}</div>
                    </div>
                  </div>
                  <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                </Button>
              ))}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4, duration: 0.5 }}>
          <Card className="h-full bg-card/40 backdrop-blur-xl border-white/10 rounded-2xl shadow-xl shadow-black/5">
            <CardHeader>
              <CardTitle className="text-xl font-display font-semibold tracking-tight">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center h-[300px] text-center p-6">
              <div className="h-16 w-16 rounded-full border border-dashed border-muted-foreground/30 flex items-center justify-center mb-4 bg-background/50 backdrop-blur-sm">
                <Clock className="h-6 w-6 text-muted-foreground/50" />
              </div>
              <p className="text-muted-foreground/80 font-medium">No recent activity yet.</p>
              <p className="text-sm text-muted-foreground/60 mt-1 max-w-[250px]">Start by navigating to Vendors or Requirements to begin your workflow.</p>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default Dashboard;
