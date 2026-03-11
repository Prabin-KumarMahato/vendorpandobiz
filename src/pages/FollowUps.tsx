import { useEffect, useState } from "react";
import { collection, getDocs, updateDoc, doc, query, orderBy, serverTimestamp } from "firebase/firestore";
import { db } from "@/firebase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Clock, CheckCircle2, Send, Eye, AlertTriangle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface VendorReq {
  id: string;
  status: string | null;
  sentAt: string | null;
  viewedAt: string | null;
  respondedAt: string | null;
  createdAt: any;
  vendors: { vendorName: string; phone: string | null; email: string | null } | null;
  requirements: { title: string } | null;
}

const STATUS_OPTIONS = ["sent", "viewed", "quotation_received", "follow_up_pending", "final_selected"];
const STATUS_COLORS: Record<string, string> = {
  sent: "bg-info text-info-foreground",
  viewed: "bg-warning text-warning-foreground",
  quotation_received: "bg-success text-success-foreground",
  follow_up_pending: "bg-destructive text-destructive-foreground",
  final_selected: "bg-primary text-primary-foreground",
};

const FollowUps = () => {
  const [items, setItems] = useState<VendorReq[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const [vrSnap, vSnap, reqSnap] = await Promise.all([
        getDocs(query(collection(db, "vendor_requirements"), orderBy("createdAt", "desc"))),
        getDocs(collection(db, "vendors")),
        getDocs(collection(db, "requirements"))
      ]);

      const vendorsMap: Record<string, any> = {};
      vSnap.forEach(d => vendorsMap[d.id] = d.data());

      const reqMap: Record<string, any> = {};
      reqSnap.forEach(d => reqMap[d.id] = d.data());

      const data = vrSnap.docs.map(doc => {
        const d = doc.data();
        let sentAtIso = d.createdAt?.toDate ? d.createdAt.toDate().toISOString() : null;
        let viewedAtIso = d.viewedAt?.toDate ? d.viewedAt.toDate().toISOString() : d.viewedAt;
        let respondedAtIso = d.respondedAt?.toDate ? d.respondedAt.toDate().toISOString() : d.respondedAt;

        return {
          id: doc.id,
          ...d,
          sentAt: sentAtIso,
          viewedAt: viewedAtIso,
          respondedAt: respondedAtIso,
          vendors: { 
            vendorName: vendorsMap[d.vendorId]?.vendorName || "Unknown Vendor",
            phone: vendorsMap[d.vendorId]?.phone,
            email: vendorsMap[d.vendorId]?.email
          },
          requirements: { title: reqMap[d.requirementId]?.title || "Unknown Requirement" }
        } as VendorReq;
      });

      setItems(data);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const updateStatus = async (id: string, status: string) => {
    const updates: Record<string, any> = { status };
    if (status === "viewed") updates.viewedAt = serverTimestamp();
    if (status === "quotation_received") updates.respondedAt = serverTimestamp();
    
    try {
      await updateDoc(doc(db, "vendor_requirements", id), updates);
      toast.success("Status updated");
      fetchData();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const needsFollowUp = (item: VendorReq) => {
    if (item.status !== "sent" || !item.sentAt) return false;
    const diff = Date.now() - new Date(item.sentAt).getTime();
    return diff > 2 * 24 * 60 * 60 * 1000; // 2 days
  };

  const overdue = items.filter(needsFollowUp);
  const active = items.filter((i) => !needsFollowUp(i));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl md:text-3xl font-display font-bold">Follow-ups & Tracking</h1>

      {overdue.length > 0 && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-display flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-4 w-4" /> Overdue ({overdue.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {overdue.map((item) => (
              <div key={item.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 p-3 bg-card rounded-lg border">
                <div>
                  <p className="font-medium text-sm">{item.vendors?.vendorName}</p>
                  <p className="text-xs text-muted-foreground">{item.requirements?.title} • Sent {item.sentAt && formatDistanceToNow(new Date(item.sentAt), { addSuffix: true })}</p>
                </div>
                <Button size="sm" variant="destructive" onClick={() => updateStatus(item.id, "follow_up_pending")}>
                  Mark Follow-up
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {loading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : items.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">No vendor requirements tracked yet.</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {[...overdue, ...active.filter(i => !overdue.includes(i))].map((item) => (
            <Card key={item.id}>
              <CardContent className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 py-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium">{item.vendors?.vendorName}</p>
                    <Badge className={STATUS_COLORS[item.status ?? "sent"]}>{item.status?.replace(/_/g, " ")}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{item.requirements?.title}</p>
                  <div className="flex gap-4 mt-1 text-xs text-muted-foreground">
                    {item.sentAt && <span className="flex items-center gap-1"><Send className="h-3 w-3" /> Sent {formatDistanceToNow(new Date(item.sentAt), { addSuffix: true })}</span>}
                    {item.viewedAt && <span className="flex items-center gap-1"><Eye className="h-3 w-3" /> Viewed</span>}
                    {item.respondedAt && <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Responded</span>}
                  </div>
                </div>
                <Select value={item.status ?? "sent"} onValueChange={(v) => updateStatus(item.id, v)}>
                  <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>)}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default FollowUps;
