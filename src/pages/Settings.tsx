import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Key, Copy, Trash2, ShieldOff, Plus, Settings as SettingsIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface ApiKey {
  id: string;
  name: string;
  key_prefix: string;
  scopes: string[];
  is_active: boolean;
  last_used_at: string | null;
  expires_at: string | null;
  rate_limit_per_minute: number;
  created_at: string;
}

const Settings = () => {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyRateLimit, setNewKeyRateLimit] = useState(60);
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (!session?.user) navigate("/auth");
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (!session?.user) navigate("/auth");
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (user) fetchKeys();
  }, [user]);

  const fetchKeys = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/api-keys?action=list`,
        { headers: { Authorization: `Bearer ${session?.access_token}` } }
      );
      const json = await res.json();
      if (json.keys) setKeys(json.keys);
    } catch {
      toast.error("Failed to load API keys");
    } finally {
      setLoading(false);
    }
  };

  const createKey = async () => {
    if (!newKeyName.trim()) { toast.error("Please enter a key name"); return; }
    setCreating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/api-keys?action=create`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session?.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ name: newKeyName, rate_limit_per_minute: newKeyRateLimit }),
        }
      );
      const json = await res.json();
      if (json.key) {
        setRevealedKey(json.key);
        setNewKeyName("");
        setNewKeyRateLimit(60);
        fetchKeys();
        toast.success("API key created! Copy it now — it won't be shown again.");
      } else {
        toast.error(json.error || "Failed to create key");
      }
    } catch {
      toast.error("Failed to create API key");
    } finally {
      setCreating(false);
    }
  };

  const revokeKey = async (keyId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/api-keys?action=revoke`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session?.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ key_id: keyId }),
        }
      );
      toast.success("Key revoked");
      fetchKeys();
    } catch {
      toast.error("Failed to revoke key");
    }
  };

  const deleteKey = async (keyId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/api-keys?action=delete`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${session?.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ key_id: keyId }),
        }
      );
      toast.success("Key deleted");
      fetchKeys();
    } catch {
      toast.error("Failed to delete key");
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-4xl mx-auto p-6 space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <SettingsIcon className="h-6 w-6" /> Settings
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage your account settings and API access
          </p>
        </div>

        {/* API Keys Section */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 border-b border-border pb-2">
            <Key className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">API Key Management</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Generate and manage API keys for programmatic access to MiXCOM AI.
          </p>

          {/* Revealed key banner */}
          {revealedKey && (
            <Card className="border-destructive/50 bg-destructive/10">
              <CardContent className="p-4 space-y-2">
                <p className="text-sm font-semibold text-destructive">⚠️ Copy your API key now. It won't be shown again!</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-muted p-2 rounded text-xs break-all font-mono">
                    {revealedKey}
                  </code>
                  <Button size="sm" variant="outline" onClick={() => copyToClipboard(revealedKey)}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <Button size="sm" variant="ghost" onClick={() => setRevealedKey(null)} className="text-xs">
                  Dismiss
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Create key */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Create New API Key</CardTitle>
              <CardDescription>Generate a new key for API access</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-3">
                <Input
                  placeholder="Key name (e.g., Production App)"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  maxLength={100}
                  className="flex-1"
                />
                <Input
                  type="number"
                  placeholder="Rate limit/min"
                  value={newKeyRateLimit}
                  onChange={(e) => setNewKeyRateLimit(Number(e.target.value))}
                  min={1}
                  max={1000}
                  className="w-32"
                />
                <Button onClick={createKey} disabled={creating}>
                  <Plus className="h-4 w-4 mr-1" />
                  {creating ? "Creating..." : "Create Key"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Keys list */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Your API Keys</CardTitle>
              <CardDescription>{keys.length} key{keys.length !== 1 ? "s" : ""}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {loading ? (
                <p className="text-sm text-muted-foreground">Loading...</p>
              ) : keys.length === 0 ? (
                <p className="text-sm text-muted-foreground">No API keys yet. Create one above.</p>
              ) : (
                keys.map((k) => (
                  <div
                    key={k.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-lg border border-border bg-muted/30"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{k.name}</span>
                        <Badge variant={k.is_active ? "default" : "destructive"} className="text-xs">
                          {k.is_active ? "Active" : "Revoked"}
                        </Badge>
                      </div>
                      <code className="text-xs text-muted-foreground font-mono">
                        {k.key_prefix}...
                      </code>
                      <div className="flex gap-3 text-xs text-muted-foreground">
                        <span>{k.rate_limit_per_minute} req/min</span>
                        <span>Created {new Date(k.created_at).toLocaleDateString()}</span>
                        {k.last_used_at && (
                          <span>Last used {new Date(k.last_used_at).toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {k.is_active && (
                        <Button size="sm" variant="outline" onClick={() => revokeKey(k.id)}>
                          <ShieldOff className="h-3 w-3 mr-1" /> Revoke
                        </Button>
                      )}
                      <Button size="sm" variant="destructive" onClick={() => deleteKey(k.id)}>
                        <Trash2 className="h-3 w-3 mr-1" /> Delete
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Usage example */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Usage Example</CardTitle>
              <CardDescription>How to authenticate with your API key</CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="bg-muted/50 p-4 rounded-lg text-xs overflow-x-auto font-mono">
{`curl -X POST \\
  ${import.meta.env.VITE_SUPABASE_URL}/functions/v1/validate-api-key \\
  -H "Authorization: Bearer mix-ai_live_YOUR_KEY_HERE" \\
  -H "Content-Type: application/json"`}
              </pre>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
};

export default Settings;
