import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Building2, Compass } from 'lucide-react';

const Landing = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30 flex flex-col items-center justify-center p-4">
      <div className="text-center mb-10">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-3">StudyEase</h1>
        <p className="text-muted-foreground text-lg">A unified learning platform for colleges</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-3xl">
        <Card
          className="cursor-pointer transition-all hover:shadow-lg hover:ring-2 hover:ring-primary/50 hover:-translate-y-1"
          onClick={() => navigate('/colleges')}
        >
          <CardContent className="flex flex-col items-center justify-center p-10">
            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-5">
              <Building2 className="w-10 h-10 text-primary" />
            </div>
            <h2 className="font-semibold text-2xl mb-1">Colleges</h2>
            <p className="text-sm text-muted-foreground text-center">
              Create or sign in to your college account
            </p>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer transition-all hover:shadow-lg hover:ring-2 hover:ring-primary/50 hover:-translate-y-1"
          onClick={() => navigate('/explore')}
        >
          <CardContent className="flex flex-col items-center justify-center p-10">
            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-5">
              <Compass className="w-10 h-10 text-primary" />
            </div>
            <h2 className="font-semibold text-2xl mb-1">Explore</h2>
            <p className="text-sm text-muted-foreground text-center">
              Browse all colleges on StudyEase
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Landing;
