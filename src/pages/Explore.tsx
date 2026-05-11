import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Building2 } from 'lucide-react';

interface College {
  id: string;
  name: string;
  logo_url: string | null;
  created_at: string;
}

const Explore = () => {
  const navigate = useNavigate();
  const [colleges, setColleges] = useState<College[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('colleges')
        .select('*')
        .order('name');
      setColleges((data as College[]) || []);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30 p-4">
      <div className="max-w-6xl mx-auto">
        <Button variant="ghost" size="sm" onClick={() => navigate('/')} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back
        </Button>

        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">Explore Colleges</h1>
          <p className="text-muted-foreground">All colleges registered on StudyEase</p>
        </div>

        {loading ? (
          <p className="text-center text-muted-foreground">Loading...</p>
        ) : colleges.length === 0 ? (
          <p className="text-center text-muted-foreground">No colleges yet.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {colleges.map((c) => (
              <Card key={c.id} className="transition-all hover:shadow-md">
                <CardContent className="flex flex-col items-center p-5">
                  {c.logo_url ? (
                    <img
                      src={c.logo_url}
                      alt={`${c.name} logo`}
                      className="w-20 h-20 object-contain rounded-full bg-white p-1 shadow-sm mb-3"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                      <Building2 className="w-10 h-10 text-primary" />
                    </div>
                  )}
                  <p className="text-sm font-semibold text-center line-clamp-2">{c.name}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Explore;
