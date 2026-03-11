import { useEffect, useState, useMemo } from "react";
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy, serverTimestamp } from "firebase/firestore";
import { db } from "@/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Download, Upload, Search } from "lucide-react";
import * as XLSX from "xlsx";

interface Vendor {
  id: string;
  vendorName: string;
  category: string | null;
  contactPerson: string | null;
  phone: string | null;
  email: string | null;
  location: string | null;
  products: string | null;
  gstVerified: boolean | null;
  website: string | null;
  notes: string | null;
  sourceOfContact: string | null;
  quotationLink: string | null;
  createdAt?: any;
}

const emptyVendor = {
  vendorName: "", category: "", contactPerson: "", phone: "", email: "",
  location: "", products: "", gstVerified: false, website: "", notes: "",
  sourceOfContact: "", quotationLink: "",
};

const CATEGORIES = ["Pumps", "Motors", "LEDs", "Electronics", "Electrical", "Mechanical", "Raw Materials", "Packaging", "Chemicals", "Other"];
const SOURCES = ["IndiaMart", "Justdial", "Website", "Reference", "Other"];

const Vendors = () => {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [form, setForm] = useState(emptyVendor);
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchVendors = async () => {
    try {
      const q = query(collection(db, "vendors"), orderBy("createdAt", "desc"));
      const querySnapshot = await getDocs(q);
      const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Vendor));
      setVendors(data);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchVendors(); }, []);

  const filtered = useMemo(() =>
    vendors.filter((v) => {
      const q = search.toLowerCase();
      return !q || v.vendorName?.toLowerCase().includes(q) || v.category?.toLowerCase().includes(q) ||
        v.products?.toLowerCase().includes(q) || v.location?.toLowerCase().includes(q);
    }), [vendors, search]);

  const openAdd = () => { setEditingVendor(null); setForm(emptyVendor); setDialogOpen(true); };
  const openEdit = (v: Vendor) => {
    setEditingVendor(v);
    setForm({
      vendorName: v.vendorName || "", category: v.category || "", contactPerson: v.contactPerson || "",
      phone: v.phone || "", email: v.email || "", location: v.location || "", products: v.products || "",
      gstVerified: v.gstVerified || false, website: v.website || "", notes: v.notes || "",
      sourceOfContact: v.sourceOfContact || "", quotationLink: v.quotationLink || "",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.vendorName.trim()) { toast.error("Vendor name is required"); return; }
    setSaving(true);
    try {
      if (editingVendor) {
        const vendorRef = doc(db, "vendors", editingVendor.id);
        await updateDoc(vendorRef, { ...form });
        toast.success("Vendor updated");
      } else {
        await addDoc(collection(db, "vendors"), { ...form, createdAt: serverTimestamp() });
        toast.success("Vendor added");
      }
      setDialogOpen(false);
      fetchVendors();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this vendor?")) return;
    try {
      await deleteDoc(doc(db, "vendors", id));
      toast.success("Vendor deleted");
      fetchVendors();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const exportCSV = () => {
    const ws = XLSX.utils.json_to_sheet(vendors);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Vendors");
    XLSX.writeFile(wb, "vendors.xlsx");
    toast.success("Exported!");
  };

  const importExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const wb = XLSX.read(ev.target?.result, { type: "binary" });
        const data = XLSX.utils.sheet_to_json<Record<string, any>>(wb.Sheets[wb.SheetNames[0]]);
        const rows = data.map((r) => ({
          vendorName: String(r["vendor_name"] || r["Vendor Name"] || r["Name"] || "Unknown"),
          category: r["category"] || r["Category"] || null,
          contactPerson: r["contact_person"] || r["Contact Person"] || null,
          phone: r["phone"] || r["Phone"] || r["Phone Number"] || null,
          email: r["email"] || r["Email"] || null,
          location: r["location"] || r["Location"] || null,
          products: r["products"] || r["Products"] || r["Products They Supply"] || null,
          gstVerified: r["gst_verified"] === true || r["GST Verified"] === "Yes",
          website: r["website"] || r["Website"] || null,
          notes: r["notes"] || r["Notes"] || null,
          sourceOfContact: r["source_of_contact"] || r["Source of Contact"] || null,
          quotationLink: r["quotation_link"] || r["Quotation Link"] || null,
          createdAt: serverTimestamp()
        }));
        
        for (const row of rows) {
          await addDoc(collection(db, "vendors"), row);
        }
        
        toast.success(`${rows.length} vendors imported`);
        fetchVendors();
      } catch (error: any) {
        toast.error(error.message);
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = "";
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <h1 className="text-2xl md:text-3xl font-display font-bold">Vendors</h1>
        <div className="flex gap-2 flex-wrap">
          <Button onClick={openAdd} size="sm"><Plus className="h-4 w-4 mr-1" /> Add Vendor</Button>
          <Button onClick={exportCSV} variant="outline" size="sm"><Download className="h-4 w-4 mr-1" /> Export</Button>
          <label>
            <Button variant="outline" size="sm" asChild><span><Upload className="h-4 w-4 mr-1" /> Import</span></Button>
            <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={importExcel} />
          </label>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Label htmlFor="vendor-search" className="sr-only">Search vendors</Label>
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input id="vendor-search" name="vendor-search" placeholder="Search vendors..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Vendor Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>GST</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={10} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={10} className="text-center py-8 text-muted-foreground">No vendors found. Add your first vendor!</TableCell></TableRow>
                ) : filtered.map((v, i) => (
                  <TableRow key={v.id}>
                    <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                    <TableCell className="font-medium">{v.vendorName}</TableCell>
                    <TableCell>{v.category && <Badge variant="secondary">{v.category}</Badge>}</TableCell>
                    <TableCell>{v.contactPerson}</TableCell>
                    <TableCell>{v.phone}</TableCell>
                    <TableCell>{v.email}</TableCell>
                    <TableCell>{v.location}</TableCell>
                    <TableCell>{v.gstVerified ? <Badge className="bg-success text-success-foreground">Yes</Badge> : <Badge variant="outline">No</Badge>}</TableCell>
                    <TableCell>{v.sourceOfContact}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" onClick={() => openEdit(v)}><Pencil className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => handleDelete(v.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" aria-describedby="vendor-dialog-description">
          <DialogHeader>
            <DialogTitle className="font-display">{editingVendor ? "Edit Vendor" : "Add Vendor"}</DialogTitle>
            <DialogDescription id="vendor-dialog-description" className="sr-only">
              Fill out the form below to {editingVendor ? "edit the selected vendor's details" : "add a new vendor"}.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Vendor Name *</Label>
              <Input value={form.vendorName} onChange={(e) => setForm({ ...form, vendorName: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Contact Person</Label>
              <Input value={form.contactPerson} onChange={(e) => setForm({ ...form, contactPerson: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Location</Label>
              <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Products They Supply</Label>
              <Input value={form.products} onChange={(e) => setForm({ ...form, products: e.target.value })} placeholder="e.g. Pumps, Motors, LEDs" />
            </div>
            <div className="space-y-2">
              <Label>Website</Label>
              <Input value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Source of Contact</Label>
              <Select value={form.sourceOfContact} onValueChange={(v) => setForm({ ...form, sourceOfContact: v })}>
                <SelectTrigger><SelectValue placeholder="Select source" /></SelectTrigger>
                <SelectContent>{SOURCES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={form.gstVerified as boolean} onCheckedChange={(v) => setForm({ ...form, gstVerified: v })} />
              <Label>GST Verified</Label>
            </div>
            <div className="space-y-2">
              <Label>Quotation Link</Label>
              <Input value={form.quotationLink} onChange={(e) => setForm({ ...form, quotationLink: e.target.value })} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? "Saving..." : editingVendor ? "Update" : "Add Vendor"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Vendors;
