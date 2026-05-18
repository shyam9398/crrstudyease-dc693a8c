import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Building2, Compass } from 'lucide-react';

const Landing = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="text-center mb-12">
        <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-3 bg-gradient-to-r from-primary-foreground via-foreground to-primary-foreground bg-clip-text">
          StudyEase
        </h1>
        <p className="text-muted-foreground text-lg">A unified learning platform for colleges</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-3xl">
        <Card
          className="glass-card rounded-2xl cursor-pointer transition-all hover:-translate-y-1 hover:shadow-xl"
          onClick={() => navigate('/colleges')}
        >
          <CardContent className="flex flex-col items-center justify-center p-10">
            <div className="w-20 h-20 bg-primary/40 rounded-2xl flex items-center justify-center mb-5">
              <Building2 className="w-10 h-10 text-primary-foreground" />
            </div>
            <h2 className="font-semibold text-2xl mb-1">Colleges</h2>
            <p className="text-sm text-muted-foreground text-center">Create or sign in to your college</p>
          </CardContent>
        </Card>

        <Card
          className="glass-card rounded-2xl cursor-pointer transition-all hover:-translate-y-1 hover:shadow-xl"
          onClick={() => navigate('/explore')}
        >
          <CardContent className="flex flex-col items-center justify-center p-10">
            <div className="w-20 h-20 bg-secondary rounded-2xl flex items-center justify-center mb-5">
              <Compass className="w-10 h-10 text-secondary-foreground" />
            </div>
            <h2 className="font-semibold text-2xl mb-1">Explore</h2>
            <p className="text-sm text-muted-foreground text-center">Browse all colleges on StudyEase</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Landing;
