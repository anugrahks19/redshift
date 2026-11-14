export type EvidenceClassification =
  | 'Direct measurement'
  | 'Derived measurement'
  | 'Orbital observation'
  | 'Rover observation'
  | 'Published interpretation'
  | 'Qualitative context'
  | 'Not available';

export interface EvidenceRecord {
  id: string;
  title: string;
  claim: string;
  location: string;
  planet: 'Earth' | 'Mars' | 'Cross-Planetary';
  instrumentOrMethod: string;
  sourceTitle: string;
  sourceInstitution: string;
  sourceUrl: string;
  date: string;
  units?: string;
  classification: EvidenceClassification;
  verificationStatus: 'Verified' | 'Published peer-reviewed' | 'Dataset verified' | 'Requires site check';
  limitations: string;
  objectiveIds: ResearchObjectiveId[];
}

export type FeasibilityStatus = 'Verified' | 'Needs verification' | 'Unknown' | 'Not applicable';

export interface FieldFeasibilityItem {
  id: string;
  category:
    | 'Access'
    | 'Land ownership or management'
    | 'Permits'
    | 'Environmental restrictions'
    | 'Hazards'
    | 'Seasonality'
    | 'Logistics'
    | 'Infrastructure and facilities';
  status: FeasibilityStatus;
  summary: string;
  sourceNote: string;
  verificationDate: string;
}

export type ReadinessCategory =
  | 'Research-ready candidate'
  | 'Remote-study candidate'
  | 'Further scientific investigation needed'
  | 'Insufficient information';

export interface TwoAxisReadinessResult {
  scientificEvidenceScore: number; // 0..100 internal axis coordinate only (never a similarity score)
  scientificEvidenceTier: 'High' | 'Moderate' | 'Low';
  fieldFeasibilityScore: number; // 0..100 internal axis coordinate only
  fieldFeasibilityTier: 'High' | 'Partial' | 'Low';
  category: ReadinessCategory;
  supportingEvidence: string[];
  missingInformation: string[];
  unverifiedConditions: string[];
  rationale: string;
}

export type ResearchObjectiveId =
  | 'astrobiology-geology'
  | 'geological-processes'
  | 'rover-mobility'
  | 'instrument-testing'
  | 'resource-exploration'
  | 'human-operations';

export interface ResearchObjectiveConfig {
  id: ResearchObjectiveId;
  label: string;
  shortLabel: string;
  description: string;
  recommendedLayers: string[];
  keyVariables: string[];
  caveats: string[];
}

