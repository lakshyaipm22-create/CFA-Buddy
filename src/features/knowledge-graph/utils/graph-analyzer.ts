/**
 * Graph Analyzer - prerequisite chain analysis, weak prerequisite detection,
 * and recommended study path generation for the CFA knowledge graph.
 */

import type {
  ConceptNode,
  NodeMasteryStatus,
  PrerequisiteChainEntry,
  WeakPrerequisite,
  StudyPathRecommendation,
} from '../types';
import { getMasteryLevel } from '../types';
import { CONCEPT_NODES, NODE_MAP, getPrerequisiteEdges } from '../data/concept-map';
import { CFA_CURRICULUM_WEIGHTS } from '@/shared/config/subjects';

/**
 * Get the full prerequisite chain for a concept node (depth-first, ordered).
 * Returns all ancestors in topological order (deepest prerequisites first).
 * Handles cycles gracefully by tracking visited nodes.
 */
export function getPrerequisiteChain(nodeId: string): PrerequisiteChainEntry[] {
  const chain: PrerequisiteChainEntry[] = [];
  const visited = new Set<string>();

  function traverse(currentId: string, depth: number): void {
    if (visited.has(currentId)) return;
    visited.add(currentId);

    const node = NODE_MAP.get(currentId);
    if (!node) return;

    for (const prereqId of node.prerequisites) {
      traverse(prereqId, depth + 1);
    }

    // Add current node to chain (post-order ensures prerequisites come first)
    if (currentId !== nodeId) {
      const prereqNode = NODE_MAP.get(currentId);
      if (prereqNode) {
        chain.push({
          nodeId: currentId,
          nodeName: prereqNode.name,
          depth,
        });
      }
    }
  }

  const startNode = NODE_MAP.get(nodeId);
  if (!startNode) return [];

  for (const prereqId of startNode.prerequisites) {
    traverse(prereqId, 1);
  }

  // Sort by depth descending so deepest prerequisites come first
  return chain.sort((a, b) => b.depth - a.depth);
}

/**
 * Find weak (unmastered) prerequisites for a given concept.
 * Returns prerequisites that are below the mastery threshold,
 * explaining why the student may struggle with the target concept.
 */
export function findWeakPrerequisites(
  nodeId: string,
  masteryData: NodeMasteryStatus[]
): WeakPrerequisite[] {
  const masteryMap = new Map(masteryData.map((m) => [m.nodeId, m]));
  const chain = getPrerequisiteChain(nodeId);

  const weakPrereqs: WeakPrerequisite[] = [];

  for (const entry of chain) {
    const mastery = masteryMap.get(entry.nodeId);
    const score = mastery ? mastery.mastery : 0;
    const answered = mastery ? mastery.questionsAnswered : 0;
    const level = getMasteryLevel(score, answered);

    if (level === 'weak' || level === 'untouched') {
      weakPrereqs.push({
        nodeId: entry.nodeId,
        nodeName: entry.nodeName,
        mastery: score,
        masteryLevel: level,
      });
    }
  }

  return weakPrereqs;
}

/**
 * Get recommended study path based on current mastery.
 * Prioritizes:
 * 1. Foundational concepts with no prerequisites (if unmastered)
 * 2. Concepts whose prerequisites are already satisfied
 * 3. Higher curriculum-weight subjects
 */
export function getRecommendedPath(
  masteryData: NodeMasteryStatus[]
): StudyPathRecommendation[] {
  const masteryMap = new Map(masteryData.map((m) => [m.nodeId, m]));
  const recommendations: StudyPathRecommendation[] = [];

  for (const node of CONCEPT_NODES) {
    const mastery = masteryMap.get(node.id);
    const score = mastery ? mastery.mastery : 0;
    const answered = mastery ? mastery.questionsAnswered : 0;
    const level = getMasteryLevel(score, answered);

    // Skip already mastered concepts
    if (level === 'mastered') continue;

    // Check if all prerequisites are satisfied
    const prereqsSatisfied = node.prerequisites.every((prereqId) => {
      const prereqMastery = masteryMap.get(prereqId);
      if (!prereqMastery) return false;
      return getMasteryLevel(prereqMastery.mastery, prereqMastery.questionsAnswered) !== 'weak'
        && getMasteryLevel(prereqMastery.mastery, prereqMastery.questionsAnswered) !== 'untouched';
    });

    // Compute priority score
    const curriculumWeight = CFA_CURRICULUM_WEIGHTS[node.subject] ?? 0.05;
    const isFoundational = node.prerequisites.length === 0;
    const dependentCount = countDependents(node.id);

    let priority = 0;
    priority += curriculumWeight * 100; // subject weight
    priority += isFoundational ? 30 : 0; // bonus for foundational
    priority += prereqsSatisfied ? 50 : 0; // big bonus for ready-to-learn
    priority += dependentCount * 5; // bonus for enabling other concepts

    let reason: string;
    if (isFoundational && level === 'untouched') {
      reason = `Foundational concept in ${node.subject} - no prerequisites needed`;
    } else if (prereqsSatisfied && level === 'untouched') {
      reason = `Prerequisites satisfied - ready to learn`;
    } else if (prereqsSatisfied && level === 'weak') {
      reason = `Needs improvement - prerequisites are strong`;
    } else if (prereqsSatisfied && level === 'partial') {
      reason = `Almost there - a bit more practice needed`;
    } else {
      reason = `Work on prerequisites first for better understanding`;
    }

    recommendations.push({
      nodeId: node.id,
      nodeName: node.name,
      subject: node.subject,
      reason,
      priority,
      prerequisitesSatisfied: prereqsSatisfied || node.prerequisites.length === 0,
    });
  }

  // Sort by priority descending
  return recommendations.sort((a, b) => b.priority - a.priority);
}

/**
 * Compute mastery score for a single concept node from practice attempts data.
 * Uses accuracy weighted by recency and question count.
 */
export function computeNodeMastery(
  nodeId: string,
  questionResults: Array<{ correct: boolean; timestamp: string }>
): NodeMasteryStatus {
  if (questionResults.length === 0) {
    return { nodeId, mastery: 0, questionsAnswered: 0, accuracy: 0 };
  }

  // Sort by timestamp descending (most recent first)
  const sorted = [...questionResults].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  // Weighted accuracy: recent questions count more
  let weightedCorrect = 0;
  let totalWeight = 0;
  const decayFactor = 0.9; // Each older question is 90% as important

  for (let i = 0; i < sorted.length; i++) {
    const weight = Math.pow(decayFactor, i);
    weightedCorrect += sorted[i].correct ? weight : 0;
    totalWeight += weight;
  }

  const weightedAccuracy = totalWeight > 0 ? weightedCorrect / totalWeight : 0;

  // Scale mastery: minimum questions for confidence
  const confidenceMultiplier = Math.min(1, questionResults.length / 5);
  const mastery = Math.round(weightedAccuracy * 100 * confidenceMultiplier);

  const totalCorrect = questionResults.filter((q) => q.correct).length;
  const accuracy = totalCorrect / questionResults.length;

  return {
    nodeId,
    mastery: Math.min(100, mastery),
    questionsAnswered: questionResults.length,
    accuracy,
  };
}

/**
 * Count how many other nodes depend on a given node (directly or transitively).
 */
function countDependents(nodeId: string): number {
  const edges = getPrerequisiteEdges();
  const directDependents = edges.filter((e) => e.from === nodeId);
  const visited = new Set<string>();

  function countTransitive(id: string): void {
    const deps = edges.filter((e) => e.from === id);
    for (const dep of deps) {
      if (!visited.has(dep.to)) {
        visited.add(dep.to);
        countTransitive(dep.to);
      }
    }
  }

  for (const dep of directDependents) {
    if (!visited.has(dep.to)) {
      visited.add(dep.to);
      countTransitive(dep.to);
    }
  }

  return visited.size;
}

/**
 * Get the direct prerequisites for a node (not the full chain).
 */
export function getDirectPrerequisites(nodeId: string): ConceptNode[] {
  const node = NODE_MAP.get(nodeId);
  if (!node) return [];
  return node.prerequisites
    .map((id) => NODE_MAP.get(id))
    .filter((n): n is ConceptNode => n !== undefined);
}

/**
 * Get concepts that directly depend on a given node.
 */
export function getDependents(nodeId: string): ConceptNode[] {
  return CONCEPT_NODES.filter((n) => n.prerequisites.includes(nodeId));
}

/**
 * Check if the graph has circular dependencies (for validation).
 * Returns true if graph is acyclic (valid).
 */
export function isGraphAcyclic(): boolean {
  const visited = new Set<string>();
  const recursionStack = new Set<string>();

  function hasCycle(nodeId: string): boolean {
    visited.add(nodeId);
    recursionStack.add(nodeId);

    const node = NODE_MAP.get(nodeId);
    if (!node) return false;

    // Check dependents (nodes that list this as prerequisite)
    const dependents = CONCEPT_NODES.filter((n) => n.prerequisites.includes(nodeId));
    for (const dep of dependents) {
      if (!visited.has(dep.id)) {
        if (hasCycle(dep.id)) return true;
      } else if (recursionStack.has(dep.id)) {
        return true;
      }
    }

    recursionStack.delete(nodeId);
    return false;
  }

  for (const node of CONCEPT_NODES) {
    if (!visited.has(node.id)) {
      if (hasCycle(node.id)) return false;
    }
  }

  return true;
}
