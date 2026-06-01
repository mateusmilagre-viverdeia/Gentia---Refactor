import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAccount } from '@/hooks/useAccount';
import { useToast } from '@/hooks/use-toast';
import {
  PeoplePerformanceWeights,
  PeoplePerformanceScore,
  DEFAULT_WEIGHTS,
  createPersonKey,
  calculateCulturalScore,
  calculatePerformanceScore,
  calculateMaturityScore,
  calculatePeoplePerformanceIndex,
  getMaturityLevelFromPosition,
} from '@/types/people-performance.types';

interface PeopleAnalysisMember {
  id: string;
  name: string;
  analysis_id: string;
}

interface PeopleAnalysisRating {
  member_id: string;
  score: number;
}

interface PerformancePoint {
  id: string;
  assessment_id: string;
  first_name: string;
  last_name: string;
  x_position: number;
  y_position: number;
}

interface MaturityPoint {
  id: string;
  assessment_id: string;
  first_name: string;
  last_name: string;
  x_position: number;
  y_position: number;
}

export function usePeoplePerformance() {
  const { account, isAdmin, isOwner, isAdminRH } = useAccount();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [weights, setWeights] = useState<PeoplePerformanceWeights>(DEFAULT_WEIGHTS);
  
  // Raw data from each tool
  const [peopleMembers, setPeopleMembers] = useState<PeopleAnalysisMember[]>([]);
  const [peopleRatings, setPeopleRatings] = useState<PeopleAnalysisRating[]>([]);
  const [valuesCount, setValuesCount] = useState(0);
  const [performancePoints, setPerformancePoints] = useState<PerformancePoint[]>([]);
  const [maturityPoints, setMaturityPoints] = useState<MaturityPoint[]>([]);
  
  // Selected assessments for filtering
  const [selectedPeopleAnalysisId, setSelectedPeopleAnalysisId] = useState<string | null>(null);
  const [selectedPerformanceAssessmentId, setSelectedPerformanceAssessmentId] = useState<string | null>(null);
  const [selectedMaturityAssessmentId, setSelectedMaturityAssessmentId] = useState<string | null>(null);

  // Available assessments lists
  const [peopleAnalyses, setPeopleAnalyses] = useState<{ id: string; name: string }[]>([]);
  const [performanceAssessments, setPerformanceAssessments] = useState<{ id: string; name: string }[]>([]);
  const [maturityAssessments, setMaturityAssessments] = useState<{ id: string; name: string }[]>([]);

  const canAccess = isAdmin || isOwner || isAdminRH;

  // Load all assessments lists
  const loadAssessments = useCallback(async () => {
    if (!account?.id) return;

    try {
      const [peopleRes, perfRes, matRes] = await Promise.all([
        supabase
          .from('people_analyses')
          .select('id, name')
          .eq('account_id', account.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('performance_assessments')
          .select('id, name')
          .eq('account_id', account.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('team_maturity_assessments')
          .select('id, name')
          .eq('account_id', account.id)
          .order('created_at', { ascending: false }),
      ]);

      if (peopleRes.data) {
        setPeopleAnalyses(peopleRes.data);
        if (peopleRes.data.length > 0 && !selectedPeopleAnalysisId) {
          setSelectedPeopleAnalysisId(peopleRes.data[0].id);
        }
      }

      if (perfRes.data) {
        setPerformanceAssessments(perfRes.data);
        if (perfRes.data.length > 0 && !selectedPerformanceAssessmentId) {
          setSelectedPerformanceAssessmentId(perfRes.data[0].id);
        }
      }

      if (matRes.data) {
        setMaturityAssessments(matRes.data);
        if (matRes.data.length > 0 && !selectedMaturityAssessmentId) {
          setSelectedMaturityAssessmentId(matRes.data[0].id);
        }
      }
    } catch (error) {
      console.error('Error loading assessments:', error);
    }
  }, [account?.id, selectedPeopleAnalysisId, selectedPerformanceAssessmentId, selectedMaturityAssessmentId]);

  // Load data from selected assessments
  const loadData = useCallback(async () => {
    if (!account?.id) return;

    setLoading(true);
    try {
      // Load people analysis members and ratings
      if (selectedPeopleAnalysisId) {
        const membersRes = await supabase
          .from('people_analysis_members')
          .select('id, name, analysis_id')
          .eq('analysis_id', selectedPeopleAnalysisId);
        
        if (membersRes.data) {
          setPeopleMembers(membersRes.data);
          
          // Load ratings for these members
          if (membersRes.data.length > 0) {
            const memberIds = membersRes.data.map(m => m.id);
            const ratingsRes = await supabase
              .from('people_analysis_ratings')
              .select('member_id, score')
              .in('member_id', memberIds);
            if (ratingsRes.data) setPeopleRatings(ratingsRes.data);
          }
        }

        // Load values count from analysis
        const analysisRes = await supabase
          .from('people_analyses')
          .select('values_snapshot')
          .eq('id', selectedPeopleAnalysisId)
          .single();
        
        if (analysisRes.data?.values_snapshot) {
          const snapshot = analysisRes.data.values_snapshot as { values?: unknown[] };
          setValuesCount(snapshot.values?.length || 0);
        }
      } else {
        setPeopleMembers([]);
        setPeopleRatings([]);
        setValuesCount(0);
      }

      // Load performance points
      if (selectedPerformanceAssessmentId) {
        const perfRes = await supabase
          .from('performance_assessment_points')
          .select('id, assessment_id, first_name, last_name, x_position, y_position')
          .eq('assessment_id', selectedPerformanceAssessmentId);
        
        if (perfRes.data) setPerformancePoints(perfRes.data);
      } else {
        setPerformancePoints([]);
      }

      // Load maturity points
      if (selectedMaturityAssessmentId) {
        const matRes = await supabase
          .from('team_maturity_points')
          .select('id, assessment_id, first_name, last_name, x_position, y_position')
          .eq('assessment_id', selectedMaturityAssessmentId);
        
        if (matRes.data) setMaturityPoints(matRes.data);
      } else {
        setMaturityPoints([]);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: 'Erro ao carregar dados',
        description: 'Não foi possível carregar os dados das avaliações.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [account?.id, selectedPeopleAnalysisId, selectedPerformanceAssessmentId, selectedMaturityAssessmentId, toast]);

  // Calculate scores by matching people across tools
  const scores = useMemo((): PeoplePerformanceScore[] => {
    const personMap = new Map<string, PeoplePerformanceScore>();

    // Process people analysis members
    for (const member of peopleMembers) {
      const key = createPersonKey(member.name);
      const memberRatings = peopleRatings.filter(r => r.member_id === member.id);
      const totalScore = memberRatings.reduce((sum, r) => sum + r.score, 0);
      const culturalScore = valuesCount > 0 
        ? calculateCulturalScore(totalScore, valuesCount) 
        : null;

      personMap.set(key, {
        id: key,
        personKey: key,
        displayName: member.name,
        culturalScore,
        performanceScore: null,
        maturityScore: null,
        peoplePerformanceIndex: 0,
        availableAssessments: culturalScore !== null ? 1 : 0,
        sources: {
          peopleAnalysis: {
            id: member.id,
            parentId: member.analysis_id,
            name: member.name,
          },
        },
      });
    }

    // Process performance points
    for (const point of performancePoints) {
      const key = createPersonKey(point.first_name, point.last_name);
      const displayName = `${point.first_name} ${point.last_name}`;
      const performanceScore = calculatePerformanceScore(point.x_position, point.y_position);

      const existing = personMap.get(key);
      if (existing) {
        existing.performanceScore = performanceScore;
        existing.sources.performanceAssessment = {
          id: point.id,
          parentId: point.assessment_id,
          name: displayName,
        };
      } else {
        personMap.set(key, {
          id: key,
          personKey: key,
          displayName,
          culturalScore: null,
          performanceScore,
          maturityScore: null,
          peoplePerformanceIndex: 0,
          availableAssessments: 1,
          sources: {
            performanceAssessment: {
              id: point.id,
              parentId: point.assessment_id,
              name: displayName,
            },
          },
        });
      }
    }

    // Process maturity points
    for (const point of maturityPoints) {
      const key = createPersonKey(point.first_name, point.last_name);
      const displayName = `${point.first_name} ${point.last_name}`;
      const level = getMaturityLevelFromPosition(point.x_position, point.y_position);
      const maturityScore = calculateMaturityScore(level);

      const existing = personMap.get(key);
      if (existing) {
        existing.maturityScore = maturityScore;
        existing.sources.teamMaturity = {
          id: point.id,
          parentId: point.assessment_id,
          name: displayName,
        };
      } else {
        personMap.set(key, {
          id: key,
          personKey: key,
          displayName,
          culturalScore: null,
          performanceScore: null,
          maturityScore,
          peoplePerformanceIndex: 0,
          availableAssessments: 1,
          sources: {
            teamMaturity: {
              id: point.id,
              parentId: point.assessment_id,
              name: displayName,
            },
          },
        });
      }
    }

    // Calculate People Performance Index for each person
    const result: PeoplePerformanceScore[] = [];
    for (const person of personMap.values()) {
      const { index, availableAssessments } = calculatePeoplePerformanceIndex(
        person.culturalScore,
        person.performanceScore,
        person.maturityScore,
        weights
      );
      person.peoplePerformanceIndex = index;
      person.availableAssessments = availableAssessments;
      result.push(person);
    }

    // Sort by index descending
    return result.sort((a, b) => b.peoplePerformanceIndex - a.peoplePerformanceIndex);
  }, [peopleMembers, peopleRatings, valuesCount, performancePoints, maturityPoints, weights]);

  // Stats
  const stats = useMemo(() => {
    if (scores.length === 0) {
      return {
        average: 0,
        highest: 0,
        lowest: 0,
        totalPeople: 0,
        withAllAssessments: 0,
        belowThreshold: 0,
      };
    }

    const indices = scores.map(s => s.peoplePerformanceIndex);
    return {
      average: Math.round(indices.reduce((a, b) => a + b, 0) / indices.length * 100) / 100,
      highest: Math.max(...indices),
      lowest: Math.min(...indices),
      totalPeople: scores.length,
      withAllAssessments: scores.filter(s => s.availableAssessments === 3).length,
      belowThreshold: scores.filter(s => s.peoplePerformanceIndex < 50).length,
    };
  }, [scores]);

  // Update weights
  const updateWeights = useCallback((newWeights: PeoplePerformanceWeights) => {
    const total = newWeights.cultural + newWeights.performance + newWeights.maturity;
    if (total !== 100) {
      toast({
        title: 'Pesos inválidos',
        description: 'Os pesos devem somar 100%.',
        variant: 'destructive',
      });
      return false;
    }
    setWeights(newWeights);
    return true;
  }, [toast]);

  // Initial load
  useEffect(() => {
    if (account?.id && canAccess) {
      loadAssessments();
    }
  }, [account?.id, canAccess, loadAssessments]);

  // Load data when selected assessments change
  useEffect(() => {
    if (account?.id && canAccess) {
      loadData();
    }
  }, [account?.id, canAccess, loadData]);

  return {
    loading,
    canAccess,
    scores,
    stats,
    weights,
    updateWeights,
    // Assessment selection
    peopleAnalyses,
    performanceAssessments,
    maturityAssessments,
    selectedPeopleAnalysisId,
    selectedPerformanceAssessmentId,
    selectedMaturityAssessmentId,
    setSelectedPeopleAnalysisId,
    setSelectedPerformanceAssessmentId,
    setSelectedMaturityAssessmentId,
    // Reload
    reload: loadData,
  };
}
