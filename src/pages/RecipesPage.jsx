// ...existing code...
import React, { useEffect, useState, useCallback } from "react";
import { Container, Heading, Text, Button, Card, Flex } from "@radix-ui/themes";
import { useAuth } from "../auth/hooks/useAuth.js";
import { fetchRecipes, fetchCategories, upsertRecipe, deleteRecipe, uploadImage } from "../api/recipes.js";

export default function RecipesPage() {
  const { user } = useAuth();
  const [recipes, setRecipes] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedCats, setSelectedCats] = useState([]);
  const [loading, setLoading] = useState(false);

  // form state
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ title: "", description: "", category_ids: [], imageFile: null, image_url: "" });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const loadAll = useCallback(async () => {
    // Debug: show auth state
    console.log("loadAll start, user:", user);
    setErr("");
    setLoading(true);
    try {
      // allow public load even when not signed in
      const uid = user?.id ?? null;
      const [cats, recs] = await Promise.all([
        fetchCategories(uid),
        fetchRecipes(uid, { search, categoryIds: selectedCats }),
      ]);
      console.log("categories:", cats);
      console.log("recipes:", recs);
      setCategories(cats || []);
      setRecipes(recs || []);
    } catch (e) {
      console.error("loadAll error:", e);
      setErr(e?.message || JSON.stringify(e));
      setCategories([]);
      setRecipes([]);
    } finally {
      setLoading(false);
    }
  }, [user, search, selectedCats]);

  useEffect(() => { loadAll(); }, [loadAll]);

  function toggleCategory(catId) {
    setSelectedCats((s) => (s.includes(catId) ? s.filter((c) => c !== catId) : [...s, catId]));
  }

  function startAdd() {
    if (!user) {
      setErr("Sign in to add recipes.");
      return;
    }
    setErr("");
    setEditing(null);
    setForm({ title: "", description: "", category_ids: [], imageFile: null, image_url: "" });
  }

  function startEdit(r) {
    if (!r) return;
    if (r.user_id && r.user_id !== user?.id) {
      setErr("You can only edit your own recipes.");
      return;
    }
    setEditing(r.id);
    setForm({ title: r.title || "", description: r.description || "", category_ids: r.category_ids || [], imageFile: null, image_url: r.image_url || "" });
  }

  async function handleSave(e) {
    e?.preventDefault();
    if (!user) { setErr("Sign in to save."); return; }
    setSaving(true); setErr("");
    try {
      let imageUrl = form.image_url;
      if (form.imageFile) {
        const path = `user_${user.id}/${Date.now()}_${form.imageFile.name}`;
        imageUrl = await uploadImage(form.imageFile, path);
      }
      const payload = {
        id: editing || undefined,
        user_id: user.id,
        title: form.title,
        description: form.description,
        image_url: imageUrl,
        category_ids: form.category_ids,
      };
      await upsertRecipe(payload);
      await loadAll();
      setEditing(null);
    } catch (e) {
      console.error("handleSave error:", e);
      setErr(e?.message || String(e));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    if (!user) { setErr("Sign in to delete."); return; }
    if (!confirm("Delete this recipe?")) return;
    try {
      await deleteRecipe(id, user.id);
      await loadAll();
    } catch (e) {
      console.error("handleDelete error:", e);
      setErr(e?.message || String(e));
    }
  }

  return (
    <Container size="3" py="6">
      <Flex justify="between" align="center" style={{ marginBottom: 12 }}>
        <div>
          <Heading>Recipes</Heading>
          <Text size="2" color="gray">Browse, add and manage your recipes (public + yours).</Text>
        </div>
        <Button onClick={startAdd}>Add recipe</Button>
      </Flex>

      <Card size="3" style={{ marginBottom: 12 }}>
        <form onSubmit={(e) => { e.preventDefault(); loadAll(); }}>
          <Flex gap="3" align="center">
            <input placeholder="Search title..." value={search} onChange={(e)=>setSearch(e.target.value)} style={{ flex: 1, padding: 8 }} />
            <Button type="button" onClick={()=>{ setSearch(""); setSelectedCats([]); }}>Clear</Button>
          </Flex>

          <div style={{ marginTop: 8 }}>
            <Text size="2" color="gray">Filters</Text>
            <Flex gap="2" wrap style={{ marginTop: 6 }}>
              {categories.map((c) => (
                <Button key={c.id} size="2" variant={selectedCats.includes(c.id) ? "solid" : "soft"} onClick={()=>toggleCategory(c.id)}>
                  {c.name}
                </Button>
              ))}
            </Flex>
          </div>
        </form>
      </Card>

      {/* Editor */}
      {(editing !== null || form.title || form.description) && (
        <Card size="3" style={{ marginBottom: 12 }}>
          <form onSubmit={handleSave}>
            <Flex direction="column" gap="2">
              <Text size="2">Title</Text>
              <input required value={form.title} onChange={(e)=>setForm(f=>({...f, title: e.target.value}))} style={{ padding: 8 }} />
              <Text size="2">Description</Text>
              <textarea value={form.description} onChange={(e)=>setForm(f=>({...f, description: e.target.value}))} rows={4} style={{ padding: 8 }} />
              <Text size="2">Categories</Text>
              <Flex gap="2" wrap>
                {categories.map((c)=>(
                  <Button key={c.id} size="2" variant={form.category_ids?.includes(c.id) ? "solid" : "soft"} onClick={()=>{
                    setForm(f=>({
                      ...f,
                      category_ids: f.category_ids?.includes(c.id) ? f.category_ids.filter(x=>x!==c.id) : [...(f.category_ids||[]), c.id],
                    }));
                  }}>{c.name}</Button>
                ))}
              </Flex>

              <div>
                <Text size="2">Image</Text>
                <input type="file" accept="image/*" onChange={(e)=>setForm(f=>({...f, imageFile: e.target.files?.[0] || null}))} />
                {form.image_url && <div style={{ marginTop: 8 }}><img src={form.image_url} alt="" style={{ height: 80 }} /></div>}
              </div>

              <Flex gap="2">
                <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
                <Button variant="soft" onClick={()=>{ setEditing(null); setForm({ title: "", description: "", category_ids: [], imageFile: null, image_url: "" }); }}>Cancel</Button>
              </Flex>
              {err && <Text color="red">{err}</Text>}
            </Flex>
          </form>
        </Card>
      )}

      {/* Recipe list */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(240px,1fr))", gap: 12 }}>
        {recipes.map((r) => (
          <Card size="3" key={r.id}>
            <Flex direction="column" gap="2">
              {r.image_url && <img src={r.image_url} alt={r.title} style={{ width: "100%", height: 140, objectFit: "cover", borderRadius: 6 }} />}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <Heading size="3" style={{ marginTop: 0 }}>{r.title}</Heading>
                <div style={{ fontSize: 12, color: "#666" }}>{r.user_id ? "You" : "Base"}</div>
              </div>
              <Text size="2" color="gray">{r.description}</Text>

              <Flex gap="2" style={{ marginTop: 8 }}>
                <Button size="2" variant="soft" onClick={()=>startEdit(r)}>Edit</Button>
                {r.user_id && <Button size="2" variant="soft" onClick={()=>handleDelete(r.id)}>Delete</Button>}
              </Flex>
            </Flex>
          </Card>
        ))}
      </div>

      {loading && <Text color="gray">Loading…</Text>}
      {!loading && recipes.length === 0 && <Text color="gray">No recipes yet.</Text>}
    </Container>
  );
}