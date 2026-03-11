import { useEffect, useState, useRef } from "react";
import { collection, getDocs, addDoc, query, orderBy, serverTimestamp, deleteDoc, doc } from "firebase/firestore";
import { db } from "@/firebase";
import { uploadToCloudinary } from "@/utils/cloudinary";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription as RadixDialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Plus, Send, FileText, Users, Image as ImageIcon, Loader2, Trash2 } from "lucide-react";
import Tesseract from "tesseract.js";

const CATEGORIES = ["Pumps", "Motors", "LEDs", "Electronics", "Electrical", "Mechanical", "Raw Materials", "Packaging", "Chemicals", "Other"];

interface Requirement {
  id: string;
  title: string;
  productCategory: string | null;
  description: string | null;
  quantity: string | null;
  location: string | null;
  status: string | null;
  createdAt?: any;
  attachmentUrls: string[] | null;
  createdBy?: string;
}

interface Vendor {
  id: string;
  vendorName: string;
  category: string | null;
  products: string | null;
  email: string | null;
}

const Requirements = () => {
  const { user } = useAuth();
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [sendDialogOpen, setSendDialogOpen] = useState(false);
  const [selectedReq, setSelectedReq] = useState<Requirement | null>(null);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [selectedVendors, setSelectedVendors] = useState<string[]>([]);
  const [suggestedVendors, setSuggestedVendors] = useState<Vendor[]>([]);
  const [form, setForm] = useState({ title: "", productCategory: "", description: "", quantity: "", location: "" });
  const [files, setFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const [isProcessingOCR, setIsProcessingOCR] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchRequirements = async () => {
    try {
      const q = query(collection(db, "requirements"), orderBy("createdAt", "desc"));
      const querySnapshot = await getDocs(q);
      const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Requirement));
      setRequirements(data);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchVendors = async () => {
    try {
      const q = query(collection(db, "vendors"));
      const querySnapshot = await getDocs(q);
      const data = querySnapshot.docs.map(doc => ({ 
        id: doc.id, 
        vendorName: doc.data().vendorName,
        category: doc.data().category,
        products: doc.data().products,
        email: doc.data().email || null
      } as Vendor));
      setVendors(data);
    } catch (error: any) {
      console.error("Error fetching vendors:", error);
    }
  };

  useEffect(() => { fetchRequirements(); fetchVendors(); }, []);

  const handleCreate = async () => {
    if (!form.title.trim()) { toast.error("Title is required"); return; }
    setSaving(true);

    try {
      let attachmentUrls: string[] = [];
      for (const file of files) {
        const url = await uploadToCloudinary(file);
        attachmentUrls.push(url);
      }

      await addDoc(collection(db, "requirements"), {
        ...form,
        status: "active",
        attachmentUrls,
        createdBy: user?.uid || null,
        createdAt: serverTimestamp()
      });
      
      toast.success("Requirement created");
      setDialogOpen(false); 
      setForm({ title: "", productCategory: "", description: "", quantity: "", location: "" }); 
      setFiles([]); 
      fetchRequirements();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this requirement?")) {
      try {
        await deleteDoc(doc(db, "requirements", id));
        toast.success("Requirement deleted");
        fetchRequirements();
      } catch (error: any) {
        toast.error("Failed to delete: " + error.message);
      }
    }
  };

  const openSendDialog = (req: Requirement) => {
    setSelectedReq(req);
    const cat = req.productCategory?.toLowerCase();
    const suggested = vendors.filter((v) =>
      v.category?.toLowerCase() === cat || v.products?.toLowerCase().includes(cat ?? "")
    );
    setSuggestedVendors(suggested);
    setSelectedVendors(suggested.map((v) => v.id));
    setSendDialogOpen(true);
  };

  const handleSendToVendors = async () => {
    if (!selectedReq || selectedVendors.length === 0) { toast.error("Select at least one vendor"); return; }
    setSaving(true);
    
    try {
      let emailSuccessCount = 0;
      for (const vid of selectedVendors) {
        const vendor = vendors.find(v => v.id === vid);
        await addDoc(collection(db, "vendor_requirements"), {
          vendorId: vid,
          requirementId: selectedReq.id,
          status: "sent",
          createdAt: serverTimestamp()
        });

        if (vendor && vendor.email) {
          try {
            const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";
            const emailRes = await fetch(`${apiUrl}/api/send-email`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                to: vendor.email,
                subject: `New Requirement from Pandobiz: ${selectedReq.title}`,
                text: `Hello ${vendor.vendorName},\n\nYou have a new requirement matching your profile.\n\nTitle: ${selectedReq.title}\nCategory: ${selectedReq.productCategory}\nDescription: ${selectedReq.description}\nQuantity: ${selectedReq.quantity}\nLocation: ${selectedReq.location}\n\nPlease login to Requiro Hub to submit a quotation.\n\nThanks,\nPandobiz Team`,
                html: `<p>Hello <strong>${vendor.vendorName}</strong>,</p>
                <p>You have a new requirement matching your profile.</p>
                <ul>
                  <li><strong>Title:</strong> ${selectedReq.title}</li>
                  <li><strong>Category:</strong> ${selectedReq.productCategory || "N/A"}</li>
                  <li><strong>Description:</strong> ${selectedReq.description || "N/A"}</li>
                  <li><strong>Quantity:</strong> ${selectedReq.quantity || "N/A"}</li>
                  <li><strong>Location:</strong> ${selectedReq.location || "N/A"}</li>
                </ul>
                <p>Please login to Requiro Hub to submit a quotation.</p>
                <br/>
                <p>Thanks,<br/>Pandobiz Team</p>`
              })
            });
            if (emailRes.ok) emailSuccessCount++;
          } catch (err) {
            console.error("Failed to send email to", vendor.email, err);
          }
        }
      }
      
      toast.success(`Requirement sent to ${selectedVendors.length} vendors (Emails Sent: ${emailSuccessCount})`);
      setSendDialogOpen(false);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleVendor = (id: string) => {
    setSelectedVendors((prev) => prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]);
  };

  const handleOCRUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingOCR(true);
    toast.info("Analyzing image...");

    try {
      const result = await Tesseract.recognize(file, "eng");
      const text = result.data.text;
      
      // Heuristic string matching for Category
      const textLower = text.toLowerCase();
      let matchedCategory = "";
      for (const cat of CATEGORIES) {
        if (textLower.includes(cat.toLowerCase())) {
          matchedCategory = cat;
          break;
        }
      }

      // Add the file to attachments automatically
      setFiles(prev => [...prev, file]);

      // Populate form
      setForm(prev => ({
        ...prev,
        description: text.trim(),
        productCategory: matchedCategory || prev.productCategory,
        title: prev.title || (matchedCategory ? `${matchedCategory} Requirement` : "New Parsed Requirement")
      }));

      toast.success("Image text extracted successfully!");
    } catch (error) {
      console.error("OCR Error:", error);
      toast.error("Failed to extract text from image");
    } finally {
      setIsProcessingOCR(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl md:text-3xl font-display font-bold">Requirements</h1>
        <Button onClick={() => setDialogOpen(true)} size="sm"><Plus className="h-4 w-4 mr-1" /> New Requirement</Button>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : requirements.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">No requirements yet. Create your first one!</CardContent></Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {requirements.map((req) => (
            <Card key={req.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-base font-display">{req.title}</CardTitle>
                  <Badge variant={req.status === "active" ? "default" : "secondary"}>{req.status || 'pending'}</Badge>
                </div>
                {req.productCategory && <CardDescription>{req.productCategory}</CardDescription>}
              </CardHeader>
              <CardContent className="space-y-2">
                {req.description && <p className="text-sm text-muted-foreground line-clamp-2">{req.description}</p>}
                <div className="flex gap-2 text-xs text-muted-foreground">
                  {req.quantity && <span>Qty: {req.quantity}</span>}
                  {req.location && <span>• {req.location}</span>}
                </div>
                {req.attachmentUrls && req.attachmentUrls.length > 0 && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <FileText className="h-3 w-3" /> {req.attachmentUrls.length} attachment(s)
                  </div>
                )}
                <div className="flex gap-2 w-full mt-2">
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => openSendDialog(req)}>
                    <Send className="h-3 w-3 mr-1" /> Send to Vendors
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => handleDelete(req.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Requirement Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg" aria-describedby="new-req-description">
          <DialogHeader>
            <DialogTitle className="font-display">New Requirement</DialogTitle>
            <RadixDialogDescription id="new-req-description" className="sr-only">
              Create a new requirement by filling out the details or uploading an image.
            </RadixDialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            
            {/* Auto-fill from Image Section */}
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="space-y-1">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <ImageIcon className="h-4 w-4 text-primary" />
                  Auto-fill from Screenshot
                </h4>
                <p className="text-xs text-muted-foreground">
                  Upload a WhatsApp screenshot. We'll extract the text and category.
                </p>
              </div>
              <div>
                <Input 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  ref={fileInputRef}
                  onChange={handleOCRUpload}
                />
                <Button 
                  type="button" 
                  size="sm" 
                  variant="secondary" 
                  disabled={isProcessingOCR}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {isProcessingOCR ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Analyzing...</>
                  ) : (
                    "Upload Image"
                  )}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Title *</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. 50HP Motor Required" />
            </div>
            <div className="space-y-2">
              <Label>Product Category</Label>
              <Select value={form.productCategory} onValueChange={(v) => setForm({ ...form, productCategory: v })}>
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} placeholder="Requirement details or raw extracted text" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Quantity</Label>
                <Input value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Location</Label>
                <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Attachments (Images/PDF) {files.length > 0 && <span className="text-xs text-primary font-medium ml-2">({files.length} selected)</span>}</Label>
              <Input type="file" multiple accept="image/*,.pdf" onChange={(e) => {
                const newFiles = Array.from(e.target.files ?? []);
                setFiles(prev => [...prev, ...newFiles]);
              }} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={saving}>{saving ? "Creating..." : "Create Requirement"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Send to Vendors Dialog */}
      <Dialog open={sendDialogOpen} onOpenChange={setSendDialogOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto" aria-describedby="send-vendors-description">
          <DialogHeader>
            <DialogTitle className="font-display">Send to Vendors</DialogTitle>
            <RadixDialogDescription id="send-vendors-description" className="sr-only">
              Select which vendors you want to send this requirement to.
            </RadixDialogDescription>
          </DialogHeader>
          {suggestedVendors.length > 0 && (
            <div className="mb-2">
              <p className="text-sm text-muted-foreground mb-1">
                <Users className="inline h-3 w-3 mr-1" />
                {suggestedVendors.length} suggested vendor(s) based on category match
              </p>
            </div>
          )}
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {vendors.map((v) => (
              <label key={v.id} className="flex items-center gap-3 p-2 rounded-md hover:bg-accent cursor-pointer">
                <Checkbox checked={selectedVendors.includes(v.id)} onCheckedChange={() => toggleVendor(v.id)} />
                <div>
                  <span className="font-medium text-sm">{v.vendorName}</span>
                  {v.category && <Badge variant="secondary" className="ml-2 text-xs">{v.category}</Badge>}
                </div>
              </label>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSendDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSendToVendors} disabled={saving}>
              {saving ? "Sending..." : `Send to ${selectedVendors.length} Vendor(s)`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Requirements;
