import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { RecommendationCard } from '@/components/dashboard/RecommendationCard';
import { aiRecommendations, AIRecommendation } from '@/lib/mockData';
import { Brain, CheckCircle, Clock, FileText, XCircle, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

const statusFilters = [
  { label: 'All', value: 'all' },
  { label: 'Pending', value: 'pending' },
  { label: 'Drafted', value: 'drafted' },
  { label: 'Approved', value: 'approved' },
  { label: 'Rejected', value: 'rejected' },
];

const AIDecisions = () => {
  const [recommendations, setRecommendations] = useState<AIRecommendation[]>(aiRecommendations);
  const [activeFilter, setActiveFilter] = useState('all');

  const filteredRecommendations = activeFilter === 'all' 
    ? recommendations 
    : recommendations.filter(r => r.status === activeFilter);

  const handleApprove = (id: string) => {
    setRecommendations(prev => 
      prev.map(r => r.id === id ? { ...r, status: 'approved' as const } : r)
    );
    toast({
      title: "Recommendation Approved",
      description: "The AI recommendation has been approved and queued for execution.",
    });
  };

  const handleReject = (id: string) => {
    setRecommendations(prev => 
      prev.map(r => r.id === id ? { ...r, status: 'rejected' as const } : r)
    );
    toast({
      title: "Recommendation Rejected",
      description: "The AI recommendation has been rejected.",
      variant: "destructive",
    });
  };

  const statusCounts = {
    pending: recommendations.filter(r => r.status === 'pending').length,
    drafted: recommendations.filter(r => r.status === 'drafted').length,
    approved: recommendations.filter(r => r.status === 'approved').length,
    rejected: recommendations.filter(r => r.status === 'rejected').length,
  };

  const totalRevenueProtected = recommendations
    .filter(r => r.status === 'approved')
    .reduce((acc, r) => acc + r.revenueProtected, 0);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="animate-fade-up">
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Brain className="w-6 h-6 text-primary" />
            AI-Driven Decisions
          </h2>
          <p className="text-muted-foreground mt-1">Review and approve AI-generated operational recommendations</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 animate-fade-up" style={{ animationDelay: '0.1s' }}>
          <div className="bg-card rounded-xl border p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center">
              <Clock className="w-5 h-5 text-warning" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{statusCounts.pending}</p>
              <p className="text-sm text-muted-foreground">Pending Approval</p>
            </div>
          </div>
          <div className="bg-card rounded-xl border p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
              <FileText className="w-5 h-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{statusCounts.drafted}</p>
              <p className="text-sm text-muted-foreground">Drafts</p>
            </div>
          </div>
          <div className="bg-card rounded-xl border p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-success" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{statusCounts.approved}</p>
              <p className="text-sm text-muted-foreground">Approved</p>
            </div>
          </div>
          <div className="bg-card rounded-xl border p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
              <Brain className="w-5 h-5 text-success" />
            </div>
            <div>
              <p className="text-2xl font-bold text-success">${(totalRevenueProtected / 1000).toFixed(0)}K</p>
              <p className="text-sm text-muted-foreground">Revenue Protected</p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 animate-fade-up" style={{ animationDelay: '0.15s' }}>
          <Filter className="w-4 h-4 text-muted-foreground" />
          <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
            {statusFilters.map((filter) => (
              <Button
                key={filter.value}
                variant="ghost"
                size="sm"
                onClick={() => setActiveFilter(filter.value)}
                className={cn(
                  "h-8 px-3 text-xs font-medium",
                  activeFilter === filter.value 
                    ? "bg-background shadow-sm text-foreground" 
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {filter.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Recommendations Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredRecommendations.map((recommendation, index) => (
            <div 
              key={recommendation.id} 
              className="animate-fade-up"
              style={{ animationDelay: `${0.2 + index * 0.05}s` }}
            >
              <RecommendationCard
                recommendation={recommendation}
                onApprove={handleApprove}
                onReject={handleReject}
                onViewDetails={(id) => {
                  toast({
                    title: "View Details",
                    description: `Opening details for recommendation ${id}`,
                  });
                }}
              />
            </div>
          ))}
        </div>

        {filteredRecommendations.length === 0 && (
          <div className="text-center py-12 bg-card rounded-xl border">
            <Brain className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-lg font-medium text-foreground">No recommendations found</p>
            <p className="text-sm text-muted-foreground">There are no recommendations matching the selected filter.</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default AIDecisions;
