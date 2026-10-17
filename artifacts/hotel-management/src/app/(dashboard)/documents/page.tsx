"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Download, Trash2 } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

type Document = {
  id: string;
  name?: string;
  documentType?: string;
  fileSize?: number;
  referenceType?: string;
  referenceId?: string;
  description?: string;
  url?: string;
  createdAt?: string;
};

const DOC_TYPES = ["image", "pdf", "document", "invoice", "receipt", "contract", "id_document", "passport", "other"];
const REF_TYPES = ["guest", "employee", "supplier", "invoice", "complaint", "conference", "transport", "general"];

type TabType = "all" | "upload";

function formatSize(bytes?: number): string {
  if (bytes == null) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function DocumentsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<TabType>("all");

  // Filters
  const [typeFilter, setTypeFilter] = useState("all");
  const [searchFilter, setSearchFilter] = useState("");

  // Upload form state
  const [file, setFile] = useState<File | null>(null);
  const [docType, setDocType] = useState("document");
  const [refType, setRefType] = useState("general");
  const [refId, setRefId] = useState("");
  const [description, setDescription] = useState("");
  const [uploading, setUploading] = useState(false);

  const params = new URLSearchParams();
  if (typeFilter !== "all") params.set("documentType", typeFilter);
  if (searchFilter) params.set("search", searchFilter);

  const { data: documents = [], isLoading } = useQuery<Document[]>({
    queryKey: ["documents", typeFilter, searchFilter],
    queryFn: () => apiFetch<Document[]>(`/documents?${params}`),
    enabled: tab === "all",
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiFetch(`/documents/${id}`, { method: "DELETE" }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["documents"] }); toast({ title: "Document deleted" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!file) { toast({ title: "Please select a file", variant: "destructive" }); return; }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("documentType", docType);
      formData.append("referenceType", refType);
      if (refId) formData.append("referenceId", refId);
      if (description) formData.append("description", description);

      const token = typeof window !== "undefined" ? localStorage.getItem("hms_token") : null;
      const res = await fetch("/api/documents/upload", {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(err.error ?? err.message ?? res.statusText);
      }
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      toast({ title: "Document uploaded successfully" });
      setFile(null);
      setRefId("");
      setDescription("");
      (e.target as HTMLFormElement).reset();
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  }

  const TABS: { key: TabType; label: string }[] = [
    { key: "all", label: "All Documents" },
    { key: "upload", label: "Upload" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Documents</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto border-b border-border pb-0">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition-colors ${
              tab === t.key ? "border-primary text-primary" : "border-transparent text-text-muted hover:text-text"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ALL DOCUMENTS TAB */}
      {tab === "all" && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="Document Type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {DOC_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>{t.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input placeholder="Search by name..." value={searchFilter} onChange={(e) => setSearchFilter(e.target.value)} className="w-[220px]" />
          </div>

          <div className="rounded-md border border-border bg-surface">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Reference Type</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  [...Array(4)].map((_, i) => (
                    <TableRow key={i}>{[...Array(6)].map((__, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}</TableRow>
                  ))
                ) : documents.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="h-24 text-center text-text-muted">No documents found.</TableCell></TableRow>
                ) : documents.map((doc) => (
                  <TableRow key={doc.id} className="hover:bg-muted/30">
                    <TableCell className="font-medium text-sm">{doc.name ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant={"secondary" as any} className="text-[10px] capitalize">{doc.documentType?.replace(/_/g, " ") ?? "—"}</Badge>
                    </TableCell>
                    <TableCell className="text-xs text-text-muted">{formatSize(doc.fileSize)}</TableCell>
                    <TableCell className="text-xs capitalize">{doc.referenceType ?? "—"}</TableCell>
                    <TableCell className="text-xs text-text-muted">{doc.createdAt ? new Date(doc.createdAt).toLocaleDateString() : "—"}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {doc.url && (
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => window.open(doc.url, "_blank")}>
                            <Download className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-danger hover:text-danger"
                          disabled={deleteMutation.isPending}
                          onClick={() => { if (confirm("Delete this document?")) deleteMutation.mutate(doc.id); }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* UPLOAD TAB */}
      {tab === "upload" && (
        <div className="max-w-lg">
          <Card className="bg-surface/50 border border-border rounded-lg p-6">
            <CardHeader className="px-0 pt-0">
              <CardTitle>Upload Document</CardTitle>
            </CardHeader>
            <CardContent className="px-0 pb-0">
              <form onSubmit={handleUpload} className="space-y-4">
                <div className="grid gap-1.5">
                  <Label>File *</Label>
                  <input
                    type="file"
                    accept="image/*,.pdf,.doc,.docx"
                    className="flex h-10 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm file:border-0 file:bg-transparent file:text-sm file:font-medium cursor-pointer"
                    onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                    required
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label>Document Type</Label>
                  <select value={docType} onChange={(e) => setDocType(e.target.value)} className="flex h-10 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm">
                    {DOC_TYPES.map((t) => (
                      <option key={t} value={t}>{t.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}</option>
                    ))}
                  </select>
                </div>
                <div className="grid gap-1.5">
                  <Label>Reference Type</Label>
                  <select value={refType} onChange={(e) => setRefType(e.target.value)} className="flex h-10 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm">
                    {REF_TYPES.map((t) => (
                      <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                    ))}
                  </select>
                </div>
                <div className="grid gap-1.5">
                  <Label>Reference ID</Label>
                  <Input value={refId} onChange={(e) => setRefId(e.target.value)} placeholder="Optional reference ID" />
                </div>
                <div className="grid gap-1.5">
                  <Label>Description</Label>
                  <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="flex w-full rounded-md border border-border bg-surface px-3 py-2 text-sm" placeholder="Optional description..." />
                </div>
                <Button type="submit" className="w-full" disabled={uploading}>
                  {uploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Upload Document
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
