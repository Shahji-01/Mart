import { useState, useRef } from "react";
import { AdminSidebar } from "./dashboard";
import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Upload, CheckCircle, XCircle, AlertCircle, Download } from "lucide-react";
import { authStore } from "@/lib/auth-store";
import { useToast } from "@/hooks/use-toast";
import { useGetCategories } from "@workspace/api-client";

interface ImportResult { success: number; errors: string[]; }

const CSV_TEMPLATE = `name,slug,categoryId,description,price,mrp,unit,unitValue,stock,imageUrl,isFeatured
Fresh Tomatoes,fresh-tomatoes,1,Fresh farm tomatoes,22,30,g,500,200,https://images.unsplash.com/photo-1546094096-0df4bcaaa337?w=400,false
Green Spinach,green-spinach,1,Tender spinach leaves,15,20,bunch,1,100,https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=400,false`;

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let inQuotes = false;
  let current = "";
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else { inQuotes = !inQuotes; }
    } else if (ch === "," && !inQuotes) {
      result.push(current.trim()); current = "";
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.trim().split(/\r?\n/);
  const headers = parseCSVLine(lines[0]);
  return lines.slice(1)
    .filter(l => l.trim())
    .map(line => {
      const vals = parseCSVLine(line);
      return Object.fromEntries(headers.map((h, i) => [h, vals[i] ?? ""]));
    })
    .filter(r => r.name);
}

export default function AdminBulkImport() {
  const [dragging, setDragging] = useState(false);
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { data: categories } = useGetCategories();

  function onFile(file: File) {
    const reader = new FileReader();
    reader.onload = e => {
      const parsed = parseCSV(e.target?.result as string);
      setRows(parsed);
      setResult(null);
    };
    reader.readAsText(file);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault(); setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file?.type === "text/csv" || file?.name.endsWith(".csv")) onFile(file);
    else toast({ title: "Please upload a CSV file", variant: "destructive" });
  }

  async function runImport() {
    if (!rows.length) return;
    setImporting(true);
    const token = authStore.getToken()!;
    try {
      const res = await fetch("/api/admin/import/products", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ rows }),
      });
      if (!res.ok) throw new Error("Import failed");
      const data: ImportResult = await res.json();
      setResult(data);
      if (data.success > 0) toast({ title: `Imported ${data.success} products successfully` });
      if (data.errors.length > 0) toast({ title: `${data.errors.length} rows had errors`, variant: "destructive" });
    } catch {
      toast({ title: "Import failed. Please try again.", variant: "destructive" });
    } finally {
      setImporting(false);
    }
  }

  function downloadTemplate() {
    const blob = new Blob([CSV_TEMPLATE], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "ntc-import-template.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-6 flex flex-col lg:flex-row gap-6">
        <AdminSidebar />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold">Bulk Product Import</h1>
              <p className="text-sm text-muted-foreground">Upload a CSV file to import multiple products at once</p>
            </div>
            <Button variant="outline" onClick={downloadTemplate}><Download className="h-4 w-4 mr-2" />Download Template</Button>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
            <p className="text-sm font-medium text-blue-700 mb-2 flex items-center gap-1.5">
              <AlertCircle className="h-4 w-4" />Category IDs for your store
            </p>
            <div className="flex flex-wrap gap-2">
              {(Array.isArray(categories) ? categories : []).map(c => <Badge key={c.id} variant="outline" className="text-xs">ID {c.id}: {c.name}</Badge>)}
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 text-xs text-amber-700">
            <strong>Tips:</strong> Fields with commas or quotes must be wrapped in double quotes (e.g., <code>"Sharma's Ghee, Premium"</code>). The template handles this automatically.
          </div>

          <div
            className={`border-2 border-dashed rounded-2xl p-12 text-center mb-4 transition-colors cursor-pointer ${dragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}`}
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            onClick={() => fileRef.current?.click()}
          >
            <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="font-medium mb-1">Drop CSV file here or click to browse</p>
            <p className="text-sm text-muted-foreground">Only .csv files supported</p>
            <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) onFile(f); }} />
          </div>

          {rows.length > 0 && !result && (
            <div className="bg-card border rounded-xl p-4 mb-4">
              <div className="flex items-center justify-between mb-3">
                <p className="font-semibold">{rows.length} rows ready to import</p>
                <Button onClick={runImport} disabled={importing} className="bg-primary">
                  {importing ? "Importing…" : `Import ${rows.length} Products`}
                </Button>
              </div>
              <div className="overflow-x-auto max-h-64 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-card">
                    <tr className="border-b">
                      {Object.keys(rows[0]).map(h => <th key={h} className="text-left py-1.5 pr-3 text-muted-foreground">{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.slice(0, 10).map((row, i) => (
                      <tr key={i} className="border-b last:border-0">
                        {Object.values(row).map((v, j) => <td key={j} className="py-1.5 pr-3 max-w-[120px] truncate">{v}</td>)}
                      </tr>
                    ))}
                    {rows.length > 10 && (
                      <tr><td colSpan={Object.keys(rows[0]).length} className="py-2 text-muted-foreground text-center">…and {rows.length - 10} more rows</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {result && (
            <div className="bg-card border rounded-xl p-5 space-y-3">
              <div className="flex items-center gap-2 text-green-700">
                <CheckCircle className="h-5 w-5" />
                <span className="font-semibold">{result.success} products imported successfully</span>
              </div>
              {result.errors.length > 0 && (
                <div className="space-y-1">
                  <p className="text-sm font-medium text-red-600 flex items-center gap-1.5">
                    <XCircle className="h-4 w-4" />{result.errors.length} rows had errors
                  </p>
                  <div className="max-h-40 overflow-y-auto space-y-1">
                    {result.errors.map((e, i) => <p key={i} className="text-xs text-muted-foreground bg-red-50 border border-red-100 rounded p-2">{e}</p>)}
                  </div>
                </div>
              )}
              <Button variant="outline" onClick={() => { setRows([]); setResult(null); }}>Import Another File</Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
