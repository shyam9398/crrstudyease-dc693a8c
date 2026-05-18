import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, PlusCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const CreateCollege = () => {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [location, setLocation] = useState('');
  const [affiliation, setAffiliation] = useState('');
  const [adminUserId, setAdminUserId] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim() || !adminUserId.trim() || !adminPassword.trim()) {
      toast.error('Please fill all required fields');
      return;
    }
    if (adminPassword.length < 6) {
      toast.error('Admin password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      let logo_url: string | null = null;
      if (logoFile) {
        const ext = logoFile.name.split('.').pop();
        const path = `${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from('college-logos').upload(path, logoFile, { upsert: false });
        if (upErr) {
          toast.error('Logo upload failed: ' + upErr.message);
          setLoading(false);
          return;
        }
        const { data: pub } = supabase.storage.from('college-logos').getPublicUrl(path);
        logo_url = pub.publicUrl;
      }

      const { data, error } = await supabase.functions.invoke('create-college', {
        body: {
          name: name.trim(),
          logo_url,
          location: location.trim(),
          affiliation: affiliation.trim(),
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
      navigate('/college-login', { replace: true });
    } catch {
      toast.error('Something went wrong. Please try again.');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen p-4 flex items-center justify-center">
      <div className="w-full max-w-lg">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back
        </Button>

        <Card className="glass-card rounded-2xl">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-primary/30 rounded-full flex items-center justify-center mb-3">
              <PlusCircle className="w-8 h-8 text-primary-foreground" />
            </div>
            <CardTitle>Create your College</CardTitle>
            <CardDescription>Register a new college on StudyEase</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>College Name *</Label>
              <Input placeholder="e.g. ABC College of Engineering"
                value={name} onChange={(e) => setName(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label>College Logo (optional)</Label>
              <Input type="file" accept="image/*"
                onChange={(e) => setLogoFile(e.target.files?.[0] ?? null)} />
            </div>

            <div className="space-y-2">
              <Label>Location</Label>
              <Input placeholder="City, State"
                value={location} onChange={(e) => setLocation(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label>Affiliation</Label>
              <Input placeholder="e.g. Affiliated to JNTU, Autonomous"
                value={affiliation} onChange={(e) => setAffiliation(e.target.value)} />
            </div>

            <div className="pt-3 border-t border-border/60">
              <p className="text-sm font-semibold mb-3">Initial Admin Credentials</p>
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label>Admin User ID *</Label>
                  <Input placeholder="e.g. ADMIN001"
                    value={adminUserId} onChange={(e) => setAdminUserId(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Admin Password *</Label>
                  <Input type="password" placeholder="Min 6 characters"
                    value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} />
                </div>
              </div>
            </div>

            <Button className="w-full rounded-xl" onClick={handleSubmit} disabled={loading}>
              {loading ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" />Creating...</>) : 'Create College'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CreateCollege;
