import { describe, it, expect } from 'vitest';
import {
  getPrerequisiteChain,
  findWeakPrerequisites,
  getRecommendedPath,
  computeNodeMastery,
  getDirectPrerequisites,
  getDependents,
  isGraphAcyclic,
} from '../utils/graph-analyzer';
import type { NodeMasteryStatus } from '../types';
import { CONCEPT_NODES, NODE_MAP } from '../data/concept-map';

describe('graph-analyzer', () => {
  describe('getPrerequisiteChain', () => {
    it('returns empty chain for nodes with no prerequisites', () => {
      const chain = getPrerequisiteChain('tvm');
      expect(chain).toHaveLength(0);
    });

    it('returns empty chain for nodes with no prerequisites (basic-statistics)', () => {
      const chain = getPrerequisiteChain('basic-statistics');
      expect(chain).toHaveLength(0);
    });

    it('returns correct ordered chain for single prerequisite', () => {
      // probability depends on basic-statistics
      const chain = getPrerequisiteChain('probability');
      expect(chain).toHaveLength(1);
      expect(chain[0].nodeId).toBe('basic-statistics');
    });

    it('returns full chain for deep prerequisite path', () => {
      // hypothesis-testing -> sampling -> distributions -> probability -> basic-statistics
      const chain = getPrerequisiteChain('hypothesis-testing');
      const nodeIds = chain.map((c) => c.nodeId);
      expect(nodeIds).toContain('basic-statistics');
      expect(nodeIds).toContain('probability');
      expect(nodeIds).toContain('distributions');
      expect(nodeIds).toContain('sampling');
      expect(chain.length).toBe(4);
    });

    it('returns chain for bond pricing (depends on TVM and bond-basics)', () => {
      const chain = getPrerequisiteChain('bond-pricing');
      const nodeIds = chain.map((c) => c.nodeId);
      expect(nodeIds).toContain('tvm');
      expect(nodeIds).toContain('bond-basics');
      expect(chain.length).toBe(2);
    });

    it('returns full chain for interest-rate-risk with multiple paths', () => {
      // interest-rate-risk -> duration -> bond-pricing -> tvm, bond-basics
      // interest-rate-risk -> spot-forward-rates -> yield-measures -> bond-pricing -> tvm, bond-basics
      const chain = getPrerequisiteChain('interest-rate-risk');
      const nodeIds = chain.map((c) => c.nodeId);
      expect(nodeIds).toContain('tvm');
      expect(nodeIds).toContain('bond-basics');
      expect(nodeIds).toContain('bond-pricing');
      expect(nodeIds).toContain('duration');
      expect(nodeIds).toContain('yield-measures');
      expect(nodeIds).toContain('spot-forward-rates');
    });

    it('returns empty for unknown node', () => {
      const chain = getPrerequisiteChain('non-existent-node');
      expect(chain).toHaveLength(0);
    });

    it('handles node with multiple prerequisites at same level', () => {
      // regression depends on basic-statistics AND hypothesis-testing
      const chain = getPrerequisiteChain('regression');
      const nodeIds = chain.map((c) => c.nodeId);
      expect(nodeIds).toContain('basic-statistics');
      expect(nodeIds).toContain('hypothesis-testing');
    });
  });

  describe('findWeakPrerequisites', () => {
    it('identifies unmastered prerequisites', () => {
      const masteryData: NodeMasteryStatus[] = [
        { nodeId: 'tvm', mastery: 30, questionsAnswered: 5, accuracy: 0.3 },
        { nodeId: 'bond-basics', mastery: 80, questionsAnswered: 10, accuracy: 0.8 },
      ];

      const weakPrereqs = findWeakPrerequisites('bond-pricing', masteryData);
      expect(weakPrereqs.length).toBe(1);
      expect(weakPrereqs[0].nodeId).toBe('tvm');
      expect(weakPrereqs[0].masteryLevel).toBe('weak');
    });

    it('returns empty when all prerequisites are mastered', () => {
      const masteryData: NodeMasteryStatus[] = [
        { nodeId: 'tvm', mastery: 90, questionsAnswered: 10, accuracy: 0.9 },
        { nodeId: 'bond-basics', mastery: 85, questionsAnswered: 8, accuracy: 0.85 },
      ];

      const weakPrereqs = findWeakPrerequisites('bond-pricing', masteryData);
      expect(weakPrereqs).toHaveLength(0);
    });

    it('identifies untouched prerequisites', () => {
      const masteryData: NodeMasteryStatus[] = [
        { nodeId: 'tvm', mastery: 0, questionsAnswered: 0, accuracy: 0 },
      ];

      const weakPrereqs = findWeakPrerequisites('bond-pricing', masteryData);
      const tvmPrereq = weakPrereqs.find((wp) => wp.nodeId === 'tvm');
      expect(tvmPrereq).toBeDefined();
      expect(tvmPrereq!.masteryLevel).toBe('untouched');
    });

    it('returns empty for nodes with no prerequisites', () => {
      const masteryData: NodeMasteryStatus[] = [];
      const weakPrereqs = findWeakPrerequisites('tvm', masteryData);
      expect(weakPrereqs).toHaveLength(0);
    });

    it('finds deep weak prerequisites', () => {
      // hypothesis-testing chain: basic-statistics -> probability -> distributions -> sampling
      const masteryData: NodeMasteryStatus[] = [
        { nodeId: 'basic-statistics', mastery: 20, questionsAnswered: 3, accuracy: 0.2 },
        { nodeId: 'probability', mastery: 80, questionsAnswered: 10, accuracy: 0.8 },
        { nodeId: 'distributions', mastery: 75, questionsAnswered: 8, accuracy: 0.75 },
        { nodeId: 'sampling', mastery: 90, questionsAnswered: 12, accuracy: 0.9 },
      ];

      const weakPrereqs = findWeakPrerequisites('hypothesis-testing', masteryData);
      expect(weakPrereqs.length).toBe(1);
      expect(weakPrereqs[0].nodeId).toBe('basic-statistics');
    });
  });

  describe('getRecommendedPath', () => {
    it('recommends foundational concepts first when everything is untouched', () => {
      const masteryData: NodeMasteryStatus[] = [];
      const path = getRecommendedPath(masteryData);

      expect(path.length).toBeGreaterThan(0);
      // Foundational concepts (no prereqs) should be among the top recommendations
      const topNodes = path.slice(0, 15).map((r) => r.nodeId);
      const foundationalIds = CONCEPT_NODES
        .filter((n) => n.prerequisites.length === 0)
        .map((n) => n.id);

      const foundationalInTop = topNodes.filter((id) => foundationalIds.includes(id));
      expect(foundationalInTop.length).toBeGreaterThan(0);
    });

    it('prioritizes concepts with satisfied prerequisites', () => {
      const masteryData: NodeMasteryStatus[] = [
        { nodeId: 'tvm', mastery: 90, questionsAnswered: 10, accuracy: 0.9 },
        { nodeId: 'basic-statistics', mastery: 85, questionsAnswered: 8, accuracy: 0.85 },
        { nodeId: 'bond-basics', mastery: 80, questionsAnswered: 7, accuracy: 0.8 },
      ];

      const path = getRecommendedPath(masteryData);
      // bond-pricing (prereqs: tvm, bond-basics) should be recommended since prereqs are satisfied
      const bondPricingRec = path.find((r) => r.nodeId === 'bond-pricing');
      expect(bondPricingRec).toBeDefined();
      expect(bondPricingRec!.prerequisitesSatisfied).toBe(true);
    });

    it('excludes already mastered concepts', () => {
      const masteryData: NodeMasteryStatus[] = [
        { nodeId: 'tvm', mastery: 90, questionsAnswered: 10, accuracy: 0.9 },
      ];

      const path = getRecommendedPath(masteryData);
      const tvmRec = path.find((r) => r.nodeId === 'tvm');
      expect(tvmRec).toBeUndefined();
    });

    it('returns empty when all concepts are mastered', () => {
      const masteryData: NodeMasteryStatus[] = CONCEPT_NODES.map((n) => ({
        nodeId: n.id,
        mastery: 90,
        questionsAnswered: 15,
        accuracy: 0.9,
      }));

      const path = getRecommendedPath(masteryData);
      expect(path).toHaveLength(0);
    });
  });

  describe('computeNodeMastery', () => {
    it('returns zero mastery for empty results', () => {
      const result = computeNodeMastery('tvm', []);
      expect(result.mastery).toBe(0);
      expect(result.questionsAnswered).toBe(0);
      expect(result.accuracy).toBe(0);
    });

    it('computes high mastery for all correct answers', () => {
      const results = Array.from({ length: 10 }, (_, i) => ({
        correct: true,
        timestamp: new Date(Date.now() - i * 86400000).toISOString(),
      }));

      const result = computeNodeMastery('tvm', results);
      expect(result.mastery).toBe(100);
      expect(result.accuracy).toBe(1.0);
      expect(result.questionsAnswered).toBe(10);
    });

    it('computes low mastery for all incorrect answers', () => {
      const results = Array.from({ length: 10 }, (_, i) => ({
        correct: false,
        timestamp: new Date(Date.now() - i * 86400000).toISOString(),
      }));

      const result = computeNodeMastery('tvm', results);
      expect(result.mastery).toBe(0);
      expect(result.accuracy).toBe(0);
    });

    it('weighs recent answers more heavily', () => {
      // Old answers wrong, recent answers correct
      const results = [
        { correct: true, timestamp: new Date(Date.now()).toISOString() },
        { correct: true, timestamp: new Date(Date.now() - 86400000).toISOString() },
        { correct: false, timestamp: new Date(Date.now() - 86400000 * 30).toISOString() },
        { correct: false, timestamp: new Date(Date.now() - 86400000 * 60).toISOString() },
        { correct: false, timestamp: new Date(Date.now() - 86400000 * 90).toISOString() },
      ];

      const result = computeNodeMastery('tvm', results);
      // Recent correct answers should give higher mastery than 40% raw accuracy
      expect(result.mastery).toBeGreaterThan(40);
    });

    it('applies confidence multiplier for few questions', () => {
      // Only 2 questions (below confidence threshold of 5)
      const results = [
        { correct: true, timestamp: new Date().toISOString() },
        { correct: true, timestamp: new Date().toISOString() },
      ];

      const result = computeNodeMastery('tvm', results);
      // Should be less than 100 due to low confidence
      expect(result.mastery).toBeLessThan(100);
      expect(result.mastery).toBeGreaterThan(0);
    });
  });

  describe('getDirectPrerequisites', () => {
    it('returns direct prerequisites for bond-pricing', () => {
      const prereqs = getDirectPrerequisites('bond-pricing');
      expect(prereqs).toHaveLength(2);
      const ids = prereqs.map((p) => p.id);
      expect(ids).toContain('tvm');
      expect(ids).toContain('bond-basics');
    });

    it('returns empty for foundational nodes', () => {
      const prereqs = getDirectPrerequisites('tvm');
      expect(prereqs).toHaveLength(0);
    });

    it('returns empty for unknown nodes', () => {
      const prereqs = getDirectPrerequisites('nonexistent');
      expect(prereqs).toHaveLength(0);
    });
  });

  describe('getDependents', () => {
    it('returns nodes that depend on TVM', () => {
      const deps = getDependents('tvm');
      expect(deps.length).toBeGreaterThan(0);
      const ids = deps.map((d) => d.id);
      expect(ids).toContain('wacc');
      expect(ids).toContain('bond-pricing');
    });

    it('returns empty for leaf nodes with no dependents', () => {
      const deps = getDependents('time-series');
      expect(deps).toHaveLength(0);
    });
  });

  describe('isGraphAcyclic', () => {
    it('confirms the concept graph has no circular dependencies', () => {
      expect(isGraphAcyclic()).toBe(true);
    });
  });

  describe('concept graph validation', () => {
    it('has at least 40 concept nodes', () => {
      expect(CONCEPT_NODES.length).toBeGreaterThanOrEqual(40);
    });

    it('covers all 10 CFA subjects', () => {
      const subjects = new Set(CONCEPT_NODES.map((n) => n.subject));
      expect(subjects.size).toBe(10);
    });

    it('all prerequisite references point to existing nodes', () => {
      for (const node of CONCEPT_NODES) {
        for (const prereqId of node.prerequisites) {
          expect(NODE_MAP.has(prereqId)).toBe(true);
        }
      }
    });

    it('has no duplicate node IDs', () => {
      const ids = CONCEPT_NODES.map((n) => n.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });
  });
});
