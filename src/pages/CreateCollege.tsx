import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, PlusCircle } from 'lucide-react';
import { toast } from 'sonner';

const CreateCollege = () => {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [adminUserId, setAdminUserId] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [branchName, setBranchName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim() || !adminUserId.trim() || !adminPassword.trim() || !branchName.trim()) {
      toast.error('Please fill all required fields');
      return;
    }
    if (adminPassword.length < 6) {
      toast.error('Admin password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      // 1. Upload logo if provided
      let logo_url: string | null = null;
      if (logoFile) {
        const ext = logoFile.name.split('.').pop();
        const path = `${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from('college-logos')
          .upload(path, logoFile, { upsert: false });
        if (upErr) {
          toast.error('Logo upload failed: ' + upErr.message);
          setLoading(false);
          return;
        }
        const { data: pub } = supabase.storage.from('college-logos').getPublicUrl(path);
        logo_url = pub.publicUrl;
      }

      // 2. Create college + branch + admin via secure edge function
      const { data, error } = await supabase.functions.invoke('create-college', {
        body: {
          name: name.trim(),
          logo_url,
          branchName: branchName.trim(),
          adminUserId: adminUserId.trim(),
          adminPassword,
        },
      });

      if (error || !data?.success) {
        toast.error(data?.error || error?.message || 'Failed to create college');
        setLoading(false);
        return;
      }

      toast.success('College created! You can now log in.');
      navigate('/college-login');
    } catch (e) {
      toast.error('Something went wrong. Please try again.');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30 p-4 flex items-center justify-center">
      <div className="w-full max-w-lg">
        <Button variant="ghost" size="sm" onClick={() => navigate('/colleges')} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back
        </Button>

        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-3">
              <PlusCircle className="w-8 h-8 text-primary" />
            </div>
            <CardTitle>Create your College</CardTitle>
            <CardDescription>Register a new college and its first admin</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>College Name *</Label>
              <Input
                placeholder="e.g. ABC College of Engineering"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>College Logo (optional)</Label>
              <Input
                type="file"
                accept="image/*"
                onChange={(e) => setLogoFile(e.target.files?.[0] ?? null)}
              />
            </div>

            <div className="space-y-2">
              <Label>First Branch / Department *</Label>
              <Input
                placeholder="e.g. CSE"
                value={branchName}
                onChange={(e) => setBranchName(e.target.value)}
              />
              <p className="text-[11px] text-muted-foreground">
                You can add more branches later from the admin dashboard.
              </p>
            </div>

            <div className="pt-2 border-t border-border/50">
              <p className="text-sm font-semibold mb-3">First Admin Credentials</p>
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label>Admin User ID *</Label>
                  <Input
                    placeholder="e.g. ADMIN001"
                    value={adminUserId}
                    onChange={(e) => setAdminUserId(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Admin Password *</Label>
                  <Input
                    type="password"
                    placeholder="Min 6 characters"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <Button className="w-full" onClick={handleSubmit} disabled={loading}>
              {loading ? 'Creating...' : 'Create College'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CreateCollege;
