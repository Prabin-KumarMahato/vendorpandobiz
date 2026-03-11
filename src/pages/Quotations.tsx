import { useEffect, useState } from "react";
import { collection, getDocs, addDoc, updateDoc, doc, query, orderBy, serverTimestamp, deleteDoc } from "firebase/firestore";
import { db } from "@/firebase";
import { uploadToCloudinary } from "@/utils/cloudinary";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription as RadixDialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, ExternalLink, Trash2 } from "lucide-react";

interface VendorRequirement {
  id: string;
  vendorId: string;
  requirementId: string;
  status: string | null;
  vendors: { vendorName: string } | null;
  requirements: { title: string } | null;
}

interface Quotation {
  id: string;
  vendorRequirementId: string;
  vendorId: string;
  requirementId: string;
  price: number | null;
  deliveryTime: string | null;
  notes: string | null;
  fileUrl: string | null;
  createdAt: any;
  vendors: { vendorName: string } | null;
  requirements: { title: string } | null;
}

const Quotations = () => {
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [vendorReqs, setVendorReqs] = useState<VendorRequirement[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedVR, setSelectedVR] = useState("");
  const [form, setForm] = useState({ price: "", deliveryTime: "", notes: "" });
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    try {
      const [qSnap, vrSnap, vSnap, reqSnap] = await Promise.all([
        getDocs(query(collection(db, "quotations"), orderBy("createdAt", "desc"))),
        getDocs(collection(db, "vendor_requirements")),
        getDocs(collection(db, "vendors")),
        getDocs(collection(db, "requirements"))
      ]);

      const vendorsMap: Record<string, any> = {};
      vSnap.forEach(d => vendorsMap[d.id] = d.data());

      const reqMap: Record<string, any> = {};
      reqSnap.forEach(d => reqMap[d.id] = d.data());

      const vrData = vrSnap.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          vendorId: data.vendorId,
          requirementId: data.requirementId,
          status: data.status,
          vendors: { vendorName: vendorsMap[data.vendorId]?.vendorName || "Unknown Vendor" },
          requirements: { title: reqMap[data.requirementId]?.title || "Unknown Requirement" }
        } as VendorRequirement;
      });

      const qData = qSnap.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          vendors: { vendorName: vendorsMap[data.vendorId]?.vendorName || "Unknown Vendor" },
          requirements: { title: reqMap[data.requirementId]?.title || "Unknown Requirement" }
        } as Quotation;
      });

      setQuotations(qData);
      setVendorReqs(vrData);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleAdd = async () => {
    if (!selectedVR) { toast.error("Select a vendor-requirement"); return; }
    setSaving(true);
    let fileUrl: string | null = null;
    try {
      if (file) {
        fileUrl = await uploadToCloudinary(file);
      }
      const vr = vendorReqs.find((v) => v.id === selectedVR);
      if (!vr) { toast.error("Invalid selection"); setSaving(false); return; }

      await addDoc(collection(db, "quotations"), {
        vendorRequirementId: selectedVR,
        vendorId: vr.vendorId,
        requirementId: vr.requirementId,
        price: form.price ? Number(form.price) : null,
        deliveryTime: form.deliveryTime || null,
        notes: form.notes || null,
        fileUrl: fileUrl,
        createdAt: serverTimestamp()
      });

      await updateDoc(doc(db, "vendor_requirements", selectedVR), { 
        status: "quotation_received", 
        respondedAt: serverTimestamp() 
      });

      toast.success("Quotation added");
      setDialogOpen(false);
      setForm({ price: "", deliveryTime: "", notes: "" });
      setFile(null);
      setSelectedVR("");
      fetchData();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, vrId: string) => {
    if (window.confirm("Are you sure you want to delete this quotation?")) {
      try {
        await deleteDoc(doc(db, "quotations", id));
        // Also update VR status back to sent perhaps?
        await updateDoc(doc(db, "vendor_requirements", vrId), {
           status: "sent" 
        });
        toast.success("Quotation deleted");
        fetchData();
      } catch (error: any) {
        toast.error("Failed to delete quotation: " + error.message);
      }
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl md:text-3xl font-display font-bold">Quotations</h1>
        <Button onClick={() => setDialogOpen(true)} size="sm"><Plus className="h-4 w-4 mr-1" /> Add Quotation</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vendor</TableHead>
                <TableHead>Requirement</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Delivery Time</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead>File</TableHead>
                <TableHead className="w-[80px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
              ) : quotations.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No quotations yet.</TableCell></TableRow>
              ) : quotations.map((q) => (
                <TableRow key={q.id}>
                  <TableCell className="font-medium">{q.vendors?.vendorName}</TableCell>
                  <TableCell>{q.requirements?.title}</TableCell>
                  <TableCell>{q.price != null ? `₹${q.price.toLocaleString()}` : "-"}</TableCell>
                  <TableCell>{q.deliveryTime || "-"}</TableCell>
                  <TableCell className="max-w-[200px] truncate">{q.notes || "-"}</TableCell>
                  <TableCell>
                    {q.fileUrl ? (
                      <a href={q.fileUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">
                        View <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : "-"}
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(q.id, q.vendorRequirementId)}>
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent aria-describedby="add-quotation-description">
          <DialogHeader>
            <DialogTitle className="font-display">Add Quotation</DialogTitle>
            <RadixDialogDescription id="add-quotation-description" className="sr-only">
              Add a new quotation from a vendor.
            </RadixDialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Vendor - Requirement *</Label>
              <Select value={selectedVR} onValueChange={setSelectedVR}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {vendorReqs.map((vr) => (
                    <SelectItem key={vr.id} value={vr.id}>
                      {vr.vendors?.vendorName} — {vr.requirements?.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Price (₹)</Label>
                <Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Delivery Time</Label>
                <Input value={form.deliveryTime} onChange={(e) => setForm({ ...form, deliveryTime: e.target.value })} placeholder="e.g. 7 days" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
            </div>
            <div className="space-y-2">
              <Label>Quotation File</Label>
              <Input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={saving}>{saving ? "Saving..." : "Add Quotation"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Quotations;
