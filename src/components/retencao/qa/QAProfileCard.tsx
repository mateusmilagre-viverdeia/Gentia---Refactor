import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { QAResult, QA_PROFILES, QA_PROFILE_LEVELS, getLevelInfo } from "@/types/qa.types";

interface QAProfileCardProps {
  result: QAResult;
}

export function QAProfileCard({ result }: QAProfileCardProps) {
  const profileInfo = QA_PROFILES[result.profile];
  const levelInfo = getLevelInfo(result.profile_level);

  return (
    <Card className={`${profileInfo.borderColor} border-2`}>
      <CardHeader className="text-center pb-2">
        <div className="text-6xl mb-4">{profileInfo.emoji}</div>
        <h2 className={`text-3xl font-bold ${profileInfo.color}`}>
          {profileInfo.name}
        </h2>
        <Badge variant="outline" className={`mt-2 ${profileInfo.borderColor} ${profileInfo.color}`}>
          Nível: {levelInfo?.name}
        </Badge>
      </CardHeader>
      <CardContent className="text-center space-y-4">
        <div className="p-4 rounded-lg bg-muted/50">
          <div className="text-4xl font-bold text-primary mb-1">
            {result.qa_total}
          </div>
          <div className="text-sm text-muted-foreground">
            QA Total (pontos)
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            Escala: 40 - 200
          </div>
        </div>
        
        <p className="text-muted-foreground">
          {levelInfo?.description}
        </p>
      </CardContent>
    </Card>
  );
}
