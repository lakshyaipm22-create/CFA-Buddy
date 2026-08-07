/**
 * Knowledge Graph types for CFA Level I concept dependency mapping.
 * Defines nodes, edges, mastery status, and graph data structures.
 */

import type { CfaSubject } from '@/shared/config/subjects';

/** A concept node in the knowledge graph */
export interface ConceptNode {
  /** Unique identifier (kebab-case) */
  id: string;
  /** Human-readable concept name */
  name: string;
  /** CFA subject this concept belongs to */
  subject: CfaSubject | string;
  /** Topic within the subject (maps to question topic field) */
  topic: string;
  /** List of prerequisite concept IDs */
  prerequisites: string[];
  /** Brief description of the concept */
  description: string;
}

/** Relationship type between concepts */
export type EdgeRelationship = 'prerequisite' | 'related';

/** An edge connecting two concept nodes */
export interface ConceptEdge {
  /** Source concept node ID (the prerequisite) */
  from: string;
  /** Target concept node ID (depends on the prerequisite) */
  to: string;
  /** Type of relationship */
  relationship: EdgeRelationship;
}

/** Full knowledge graph data structure */
export interface KnowledgeGraphData {
  nodes: ConceptNode[];
  edges: ConceptEdge[];
}

/** Mastery status for a single concept node */
export interface NodeMasteryStatus {
  /** Concept node ID */
  nodeId: string;
  /** Mastery score from 0 to 100 */
  mastery: number;
  /** Total questions answered for this concept */
  questionsAnswered: number;
  /** Accuracy as a decimal (0.0 to 1.0) */
  accuracy: number;
}

/** Mastery level classification for visualization */
export type MasteryLevel = 'mastered' | 'partial' | 'weak' | 'untouched';

/** Thresholds for mastery classification */
export const MASTERY_THRESHOLDS = {
  mastered: 75,
  partial: 50,
  weak: 0,
} as const;

/** Get mastery level from a score */
export function getMasteryLevel(mastery: number, questionsAnswered: number): MasteryLevel {
  if (questionsAnswered === 0) return 'untouched';
  if (mastery >= MASTERY_THRESHOLDS.mastered) return 'mastered';
  if (mastery >= MASTERY_THRESHOLDS.partial) return 'partial';
  return 'weak';
}

/** Prerequisite chain entry for path analysis */
export interface PrerequisiteChainEntry {
  nodeId: string;
  nodeName: string;
  depth: number;
}

/** Weak prerequisite finding */
export interface WeakPrerequisite {
  nodeId: string;
  nodeName: string;
  mastery: number;
  masteryLevel: MasteryLevel;
}

/** Study path recommendation */
export interface StudyPathRecommendation {
  nodeId: string;
  nodeName: string;
  subject: string;
  reason: string;
  priority: number;
  prerequisitesSatisfied: boolean;
}
