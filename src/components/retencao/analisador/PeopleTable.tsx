import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { MemberRow } from "./MemberRow";
import { AddMemberRow } from "./AddMemberRow";
import type { PeopleAnalysis, PeopleAnalysisMember } from "@/types/people-analysis.types";

interface PeopleTableProps {
  analysis: PeopleAnalysis;
  members: PeopleAnalysisMember[];
  getRating: (memberId: string, valueLabel: string) => number | null;
  setRating: (memberId: string, valueLabel: string, score: number) => Promise<void>;
  getMemberTotal: (memberId: string) => number;
  onAddMember: (name: string, userId?: string, teamId?: string, orgNodeId?: string) => void;
  onUpdateMember: (id: string, name: string) => void;
  onDeleteMember: (id: string) => void;
}

export function PeopleTable({
  analysis,
  members,
  getRating,
  setRating,
  getMemberTotal,
  onAddMember,
  onUpdateMember,
  onDeleteMember,
}: PeopleTableProps) {
  const values = analysis.values_snapshot || [];

  if (values.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>Nenhum valor configurado para esta análise.</p>
        <p className="text-sm mt-1">Edite a análise para adicionar valores.</p>
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="min-w-[200px] bg-muted/50">TIME</TableHead>
            {values.map((value) => (
              <TableHead key={value.label} className="text-center min-w-[100px] bg-muted/50">
                {value.label}
              </TableHead>
            ))}
            <TableHead className="text-center min-w-[100px] bg-muted font-semibold">
              TOTAL
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {members.map((member) => (
            <MemberRow
              key={member.id}
              member={member}
              values={values}
              getRating={getRating}
              setRating={setRating}
              getMemberTotal={getMemberTotal}
              onUpdate={onUpdateMember}
              onDelete={onDeleteMember}
            />
          ))}
          <AddMemberRow 
            valuesCount={values.length} 
            onAdd={onAddMember} 
          />
        </TableBody>
      </Table>
    </div>
  );
}
