import { useState, useEffect, useMemo } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/firebase";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, MapPin, Phone, Mail } from "lucide-react";

interface Vendor {
  id: string;
  vendorName: string;
  category: string | null;
  contactPerson: string | null;
  phone: string | null;
  email: string | null;
  location: string | null;
  products: string | null;
}

const SearchPage = () => {
  const [query, setQuery] = useState("");
  const [allVendors, setAllVendors] = useState<Vendor[]>([]);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    const fetchVendors = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "vendors"));
        const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Vendor));
        setAllVendors(data);
      } catch (error) {
        console.error("Error fetching vendors for search:", error);
      }
    };
    fetchVendors();
  }, []);

  const handleSearch = (q: string) => {
    setQuery(q);
    if (q.length < 2) {
      setSearched(false);
    } else {
      setSearched(true);
    }
  };

  const results = useMemo(() => {
    if (query.length < 2) return [];
    const qLower = query.toLowerCase();
    return allVendors.filter(v => 
      v.vendorName?.toLowerCase().includes(qLower) ||
      v.category?.toLowerCase().includes(qLower) ||
      v.products?.toLowerCase().includes(qLower) ||
      v.location?.toLowerCase().includes(qLower)
    );
  }, [query, allVendors]);

  const highlight = (text: string | null) => {
    if (!text || !query || query.length < 2) return text;
    // Escape regex characters in query
    const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`(${escapedQuery})`, "gi");
    return text.split(re).map((part, i) =>
      re.test(part) ? <mark key={i} className="bg-primary/20 text-foreground rounded px-0.5">{part}</mark> : part
    );
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl md:text-3xl font-display font-bold">Vendor Search</h1>
      <div className="relative max-w-xl">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input
          placeholder='Search by vendor name, product, category, or location (e.g. "pump vendors")'
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          className="pl-11 h-12 text-base"
        />
      </div>

      {searched && (
        <p className="text-sm text-muted-foreground">{results.length} result(s) found</p>
      )}

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {results.map((v) => (
          <Card key={v.id} className="hover:shadow-md transition-shadow">
            <CardContent className="pt-4 space-y-2">
              <div className="flex items-start justify-between">
                <h3 className="font-display font-semibold">{highlight(v.vendorName)}</h3>
                {v.category && <Badge variant="secondary">{highlight(v.category)}</Badge>}
              </div>
              {v.products && <p className="text-sm text-muted-foreground">{highlight(v.products)}</p>}
              <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                {v.contactPerson && <span>{v.contactPerson}</span>}
                {v.location && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {highlight(v.location)}</span>}
                {v.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {v.phone}</span>}
                {v.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" /> {v.email}</span>}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default SearchPage;
