/**
 * Mastery Mapper - bridges PracticeAttempt data to concept graph nodes.
 * Maps question topics to knowledge graph nodes and computes per-node mastery scores.
 */

import type { PracticeAttempt } from '@/features/question-bank/types/attempt';
import type { NodeMasteryStatus } from '../types';
import { CONCEPT_NODES } from '../data/concept-map';
import { computeNodeMastery } from './graph-analyzer';

interface QuestionResult {
  correct: boolean;
  timestamp: string;
  topic: string | null;
  subject: string;
}

/**
 * Extract all individual question results from practice attempts,
 * normalizing them into a flat array with topic/subject info.
 */
function extractQuestionResults(attempts: PracticeAttempt[]): QuestionResult[] {
  const results: QuestionResult[] = [];

  for (const attempt of attempts) {
    for (const moduleResult of attempt.moduleResults) {
      for (const qa of moduleResult.questionAttempts) {
        results.push({
          correct: qa.correct,
          timestamp: attempt.completedAt,
          topic: moduleResult.moduleName,
          subject: attempt.subjectName,
        });
      }
    }
  }

  return results;
}

/**
 * Map a question result to the most appropriate concept node.
 * Uses topic name matching against node topics and names.
 */
function findMatchingNode(result: QuestionResult): string | null {
  // Direct topic match
  for (const node of CONCEPT_NODES) {
    if (
      node.topic.toLowerCase() === result.topic?.toLowerCase() ||
      node.name.toLowerCase() === result.topic?.toLowerCase()
    ) {
      return node.id;
    }
  }

  // Partial topic match (topic contains node name or vice versa)
  const topicLower = (result.topic ?? '').toLowerCase();
  for (const node of CONCEPT_NODES) {
    if (node.subject !== result.subject) continue;
    if (
      topicLower.includes(node.name.toLowerCase()) ||
      node.name.toLowerCase().includes(topicLower) ||
      topicLower.includes(node.topic.toLowerCase()) ||
      node.topic.toLowerCase().includes(topicLower)
    ) {
      return node.id;
    }
  }

  // Subject-based fuzzy match using keyword overlap
  const keywords = topicLower.split(/[\s,\-/]+/).filter((w) => w.length > 3);
  let bestMatch: string | null = null;
  let bestScore = 0;

  for (const node of CONCEPT_NODES) {
    if (node.subject !== result.subject) continue;
    const nodeKeywords = [
      ...node.name.toLowerCase().split(/[\s,\-/]+/),
      ...node.topic.toLowerCase().split(/[\s,\-/]+/),
      ...node.description.toLowerCase().split(/[\s,\-/]+/),
    ].filter((w) => w.length > 3);

    let score = 0;
    for (const kw of keywords) {
      if (nodeKeywords.some((nk) => nk.includes(kw) || kw.includes(nk))) {
        score++;
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestMatch = node.id;
    }
  }

  return bestScore >= 1 ? bestMatch : null;
}

/**
 * Compute mastery for all concept nodes from practice attempt data.
 * Maps each question result to a concept node and aggregates mastery scores.
 */
export function computeAllNodeMastery(attempts: PracticeAttempt[]): NodeMasteryStatus[] {
  const results = extractQuestionResults(attempts);

  // Group results by node ID
  const nodeResults = new Map<string, Array<{ correct: boolean; timestamp: string }>>();

  for (const result of results) {
    const nodeId = findMatchingNode(result);
    if (!nodeId) continue;

    if (!nodeResults.has(nodeId)) {
      nodeResults.set(nodeId, []);
    }
    nodeResults.get(nodeId)!.push({
      correct: result.correct,
      timestamp: result.timestamp,
    });
  }

  // Compute mastery for all nodes (including those with no data)
  const masteryStatuses: NodeMasteryStatus[] = [];

  for (const node of CONCEPT_NODES) {
    const questResults = nodeResults.get(node.id) ?? [];
    masteryStatuses.push(computeNodeMastery(node.id, questResults));
  }

  return masteryStatuses;
}

/**
 * Get mastery status for a single concept node from practice data.
 */
export function getNodeMasteryFromAttempts(
  nodeId: string,
  attempts: PracticeAttempt[]
): NodeMasteryStatus {
  const results = extractQuestionResults(attempts);
  const matchingResults: Array<{ correct: boolean; timestamp: string }> = [];

  for (const result of results) {
    const matchedNodeId = findMatchingNode(result);
    if (matchedNodeId === nodeId) {
      matchingResults.push({
        correct: result.correct,
        timestamp: result.timestamp,
      });
    }
  }

  return computeNodeMastery(nodeId, matchingResults);
}

/**
 * Get a mastery map (nodeId -> NodeMasteryStatus) for quick lookups.
 */
export function getMasteryMap(
  attempts: PracticeAttempt[]
): Map<string, NodeMasteryStatus> {
  const statuses = computeAllNodeMastery(attempts);
  return new Map(statuses.map((s) => [s.nodeId, s]));
}
