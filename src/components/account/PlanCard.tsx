
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CreditCard } from 'lucide-react';
import { t } from '@/lib/localization';

interface UserPlan {
  plan_type: string;
  status: string;
  expires_at: string | null;
}

interface PlanCardProps {
  plan: UserPlan | null;
  onUpgrade: () => void;
}

const PlanCard = ({ plan, onUpgrade }: PlanCardProps) => {
  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <CreditCard className="w-5 h-5" />
          {t.account.subscriptionPlan}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex justify-between items-start mb-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Badge variant={plan?.plan_type === 'pro' ? 'default' : 'secondary'} className="capitalize">
                {plan?.plan_type === 'pro' ? t.account.proPlan : t.account.freePlan}
              </Badge>
              <Badge variant={plan?.status === 'active' ? 'default' : 'destructive'} className="capitalize">
                {plan?.status === 'active' ? t.account.active : t.account.inactive}
              </Badge>
            </div>
            <p className="text-gray-400">
              {plan?.plan_type === 'pro' ? t.account.premiumUnlocked : t.account.limitedFeatures}
            </p>
            {plan?.expires_at && (
              <p className="text-sm text-gray-500">
                {t.account.expires} {new Date(plan.expires_at).toLocaleDateString('fa-IR')}
              </p>
            )}
          </div>
          {plan?.plan_type === 'free' && (
            <Button onClick={onUpgrade} className="bg-green-600 hover:bg-green-700">
              {t.account.upgradeToPro}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default PlanCard;
