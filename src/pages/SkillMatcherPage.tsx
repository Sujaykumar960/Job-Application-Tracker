import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { GitPullRequest, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';

export const SkillMatcherPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-2 border-b border-[#E8E8E8]">
        <div>
          <h1 className="text-xl font-bold text-[#1D2226] tracking-tight flex items-center gap-2">
            Resume-to-Job Matching & Skill-Gap Analysis
          </h1>
          <p className="text-xs text-[#56687A] mt-0.5">
            Compare your profile against job descriptions to identify missing skills and generate remediation roadmaps.
          </p>
        </div>

        <Badge variant="brand" size="md">
          Targeting: Stripe
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              Matched Skills (8)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {['Go', 'PostgreSQL', 'Docker', 'Distributed Systems', 'System Design', 'React', 'TypeScript', 'Node.js'].map((s) => (
                <Badge key={s} variant="success" size="sm">
                  {s}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400" />
              Skill Gaps to Close (3)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {['Kafka Partitioning', 'Distributed Rate Limiting', 'Kubernetes Helm'].map((s) => (
                <Badge key={s} variant="danger" size="sm">
                  {s}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SkillMatcherPage;
