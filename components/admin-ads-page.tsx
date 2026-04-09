"use client";

import { useState } from "react";
import { Megaphone, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  createAdminAdAction,
  deleteAdminAdAction,
  refreshAdminAdsListAction,
  type AdminAdListItem,
  updateAdminAdAction,
  uploadAdminAdImageAction,
} from "@/lib/admin-ads-actions";
import { cn } from "@/lib/utils";

type AdFormState = {
  title: string;
  type: "banner" | "popup" | "text";
  imageUrl: string;
  description: string;
  link: string;
  regionTarget: string;
  pageTarget: "home" | "products" | "store";
  maxViewsPerUser: string;
  popupDelayMs: string;
  isActive: boolean;
};

const emptyForm: AdFormState = {
  title: "",
  type: "banner",
  imageUrl: "",
  description: "",
  link: "",
  regionTarget: "",
  pageTarget: "home",
  maxViewsPerUser: "3",
  popupDelayMs: "0",
  isActive: true,
};

export function AdminAdsPage({ initialAds = [] }: { initialAds?: AdminAdListItem[] }) {
  const [ads, setAds] = useState<AdminAdListItem[]>(initialAds);
  const [refreshing, setRefreshing] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [form, setForm] = useState<AdFormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  async function handleImageFile(file: File | undefined) {
    if (!file) return;
    setUploadBusy(true);
    setErr(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await uploadAdminAdImageAction(fd);
      if (!res.ok) {
        setErr(res.error);
        return;
      }
      setForm((f) => ({ ...f, imageUrl: res.url }));
    } finally {
      setUploadBusy(false);
    }
  }

  async function load() {
    setErr(null);
    setRefreshing(true);
    try {
      const res = await refreshAdminAdsListAction();
      if (!res.ok) {
        setErr(res.error);
        return;
      }
      setAds(res.ads);
    } finally {
      setRefreshing(false);
    }
  }

  async function createOrUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (uploadBusy) {
      setErr("Wait for the image upload to finish, then save again.");
      return;
    }
    setSaving(true);
    setErr(null);
    try {
      const body = {
        title: form.title.trim(),
        type: form.type,
        imageUrl: form.imageUrl.trim() || null,
        description: form.description.trim() || null,
        link: form.link.trim() || null,
        regionTarget: form.regionTarget.trim() || null,
        pageTarget: form.pageTarget,
        isActive: form.isActive,
        maxViewsPerUser: form.maxViewsPerUser === "" ? null : Number(form.maxViewsPerUser),
        popupDelayMs: Number(form.popupDelayMs) || 0,
      };
      if (Number.isNaN(body.maxViewsPerUser as number) && body.maxViewsPerUser !== null) {
        setErr("Max views must be a number or empty for default (3).");
        setSaving(false);
        return;
      }
      const res = editingId
        ? await updateAdminAdAction(editingId, body)
        : await createAdminAdAction(body);
      if (!res.ok) {
        setErr(res.error);
        return;
      }
      setForm(emptyForm);
      setEditingId(null);
      await load();
    } finally {
      setSaving(false);
    }
  }

  function startEdit(a: AdminAdListItem) {
    setEditingId(a.id);
    setForm({
      title: a.title,
      type: a.type,
      imageUrl: a.imageUrl ?? "",
      description: a.description ?? "",
      link: a.link ?? "",
      regionTarget: a.regionTarget ?? "",
      pageTarget: a.pageTarget,
      maxViewsPerUser: a.maxViewsPerUser == null ? "" : String(a.maxViewsPerUser),
      popupDelayMs: String(a.popupDelayMs),
      isActive: a.isActive,
    });
  }

  async function remove(id: string) {
    if (!confirm("Delete this ad?")) return;
    const res = await deleteAdminAdAction(id);
    if (!res.ok) {
      setErr(res.error);
      return;
    }
    await load();
  }

  async function toggleActive(a: AdminAdListItem) {
    const res = await updateAdminAdAction(a.id, { isActive: !a.isActive });
    if (!res.ok) {
      setErr(res.error);
      return;
    }
    await load();
  }

  return (
    <div className="space-y-8">
      <div>
        <div className="flex flex-wrap items-baseline gap-2">
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Advertising</h1>
          {refreshing ? <span className="text-xs text-muted-foreground">Updating…</span> : null}
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Target logged-in customers by region and page. Vendors and admins never see ads.
        </p>
      </div>

      {err ? <p className="text-sm text-destructive">{err}</p> : null}

      <Card className="rounded-2xl border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Plus className="size-5 text-brand-secondary" />
            {editingId ? "Edit ad" : "Create ad"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={(e) => void createOrUpdate(e)} className="grid gap-4 sm:grid-cols-2">
            <label className="sm:col-span-2">
              <span className="text-xs font-medium text-muted-foreground">Title</span>
              <Input
                required
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                className="mt-1"
              />
            </label>
            <label>
              <span className="text-xs font-medium text-muted-foreground">Type</span>
              <select
                className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={form.type}
                onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as typeof form.type }))}
              >
                <option value="banner">Banner</option>
                <option value="popup">Popup</option>
                <option value="text">Text</option>
              </select>
            </label>
            <label>
              <span className="text-xs font-medium text-muted-foreground">Page</span>
              <select
                className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={form.pageTarget}
                onChange={(e) => setForm((f) => ({ ...f, pageTarget: e.target.value as typeof form.pageTarget }))}
              >
                <option value="home">Home</option>
                <option value="products">Products</option>
                <option value="store">Store detail</option>
              </select>
            </label>
            <div className="sm:col-span-2 space-y-2">
              <span className="text-xs font-medium text-muted-foreground">Image</span>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  disabled={uploadBusy}
                  className="block w-full max-w-md text-sm text-foreground file:mr-3 file:rounded-lg file:border file:border-border file:bg-muted file:px-3 file:py-1.5 file:text-sm file:font-medium"
                  onChange={(e) => void handleImageFile(e.target.files?.[0])}
                />
                {uploadBusy ? <span className="text-xs text-muted-foreground">Uploading…</span> : null}
              </div>
              <p className="text-[11px] text-muted-foreground">
                JPEG, PNG, GIF, or WebP — max 3MB (under ~900KB on Vercel for embedded images). Wait for the preview below
                before saving. On Vercel, uploads are stored in the database so images still show after deploy. You can also
                paste a direct <span className="font-medium">https://</span> image URL.
              </p>
              <Input
                value={form.imageUrl}
                onChange={(e) => setForm((f) => ({ ...f, imageUrl: e.target.value }))}
                placeholder="https://… or /uploads/ads/…"
                className="mt-1"
              />
              {form.imageUrl.trim() ? (
                <div className="relative mt-2 h-28 w-full max-w-sm overflow-hidden rounded-lg border border-border bg-muted">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={form.imageUrl} alt="" className="h-full w-full object-contain p-1" />
                </div>
              ) : null}
            </div>
            <label className="sm:col-span-2">
              <span className="text-xs font-medium text-muted-foreground">Description</span>
              <Input
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                className="mt-1"
              />
            </label>
            <label className="sm:col-span-2">
              <span className="text-xs font-medium text-muted-foreground">Link (https)</span>
              <Input
                value={form.link}
                onChange={(e) => setForm((f) => ({ ...f, link: e.target.value }))}
                className="mt-1"
              />
            </label>
            <label>
              <span className="text-xs font-medium text-muted-foreground">Region (empty = all)</span>
              <Input
                value={form.regionTarget}
                onChange={(e) => setForm((f) => ({ ...f, regionTarget: e.target.value }))}
                placeholder="e.g. Banaadir"
                className="mt-1"
              />
            </label>
            <label>
              <span className="text-xs font-medium text-muted-foreground">Max views / customer</span>
              <Input
                value={form.maxViewsPerUser}
                onChange={(e) => setForm((f) => ({ ...f, maxViewsPerUser: e.target.value }))}
                placeholder="3 or empty for 3"
                className="mt-1"
              />
            </label>
            <label>
              <span className="text-xs font-medium text-muted-foreground">Popup delay (ms)</span>
              <Input
                value={form.popupDelayMs}
                onChange={(e) => setForm((f) => ({ ...f, popupDelayMs: e.target.value }))}
                className="mt-1"
              />
            </label>
            <label className="flex items-center gap-2 pt-6">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
              />
              <span className="text-sm">Active</span>
            </label>
            <div className="flex flex-wrap gap-2 sm:col-span-2">
              <Button type="submit" disabled={saving} className="rounded-xl">
                {saving ? "Saving…" : editingId ? "Update" : "Create"}
              </Button>
              {editingId ? (
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-xl"
                  onClick={() => {
                    setEditingId(null);
                    setForm(emptyForm);
                  }}
                >
                  Cancel edit
                </Button>
              ) : null}
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Megaphone className="size-5 text-brand-secondary" />
            All campaigns
          </CardTitle>
        </CardHeader>
        <CardContent>
          {ads.length === 0 ? (
            <p className="text-sm text-muted-foreground">No ads yet.</p>
          ) : (
            <ul className="space-y-3">
              {ads.map((a) => (
                <li
                  key={a.id}
                  className={cn(
                    "flex flex-col gap-4 rounded-xl border border-border p-4 sm:flex-row sm:items-center sm:justify-between",
                    !a.isActive && "opacity-60",
                  )}
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground">{a.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {a.type} · {a.pageTarget}
                      {a.regionTarget ? ` · ${a.regionTarget}` : " · all regions"}
                    </p>
                    <p className="mt-1 text-xs tabular-nums text-muted-foreground">
                      Views {a.views} · Clicks {a.clicks} · CTR {a.ctr.toFixed(2)}%
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="outline" size="sm" className="rounded-lg" onClick={() => void toggleActive(a)}>
                      {a.isActive ? "Deactivate" : "Activate"}
                    </Button>
                    <Button type="button" variant="outline" size="sm" className="rounded-lg" onClick={() => startEdit(a)}>
                      <Pencil className="size-4" />
                    </Button>
                    <Button type="button" variant="destructive" size="sm" className="rounded-lg" onClick={() => void remove(a.id)}>
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
