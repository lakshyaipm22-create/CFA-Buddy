'use client';

/**
 * Knowledge Graph Visualization - Interactive SVG-based concept dependency map.
 * Nodes colored by mastery level using theme colors.
 * Clicking a node shows prerequisites and recommended study path.
 */

import { useState, useMemo, useCallback } from 'react';
import type { ConceptNode, NodeMasteryStatus, MasteryLevel } from '../types';
import { getMasteryLevel } from '../types';
import { CONCEPT_NODES, NODE_MAP } from '../data/concept-map';
import { CFA_SUBJECTS_ORDERED } from '@/shared/config/subjects';
import { getDirectPrerequisites, getDependents } from '../utils/graph-analyzer';
import { PrerequisiteAlert } from './prerequisite-alert';
import { StudyPath } from './study-path';
import type { PracticeAttempt } from '@/features/question-bank/types/attempt';
import { computeAllNodeMastery } from '../utils/mastery-mapper';
import { getRecommendedPath, findWeakPrerequisites } from '../utils/graph-analyzer';
import { getAllAttempts } from '@/features/question-bank/utils/attempt-storage';

/** Theme colors for mastery levels */
const MASTERY_COLORS: Record<MasteryLevel, string> = {
  mastered: '#00843D',
  partial: '#C5A258',
  weak: '#DC2626',
  untouched: '#4B5563',
};

const MASTERY_LABELS: Record<MasteryLevel, string> = {
  mastered: 'Mastered (75%+)',
  partial: 'Partial (50-74%)',
  weak: 'Weak (<50%)',
  untouched: 'Not Started',
};

/** Layout computation for the graph nodes organized by subject */
interface NodePosition {
  x: number;
  y: number;
  node: ConceptNode;
}

function computeLayout(nodes: ConceptNode[], subjectFilter: string | null): NodePosition[] {
  const filteredNodes = subjectFilter
    ? nodes.filter((n) => n.subject === subjectFilter)
    : nodes;

  const subjects = subjectFilter
    ? [subjectFilter]
    : [...new Set(filteredNodes.map((n) => n.subject))];

  const positions: NodePosition[] = [];
  const subjectSpacing = 200;
  const nodeSpacing = 140;
  const startX = 80;
  const startY = 80;

  let currentY = startY;

  for (const subject of subjects) {
    const subjectNodes = filteredNodes.filter((n) => n.subject === subject);
    // Sort by prerequisite depth (nodes with no prereqs first)
    const sorted = sortByPrerequisiteDepth(subjectNodes);

    let currentX = startX;
    const rowHeight = 100;
    let maxRowWidth = 0;
    let col = 0;
    const maxCols = subjectFilter ? 4 : 3;

    for (const node of sorted) {
      positions.push({
        x: currentX + col * nodeSpacing,
        y: currentY,
        node,
      });
      col++;
      if (col >= maxCols) {
        col = 0;
        currentY += rowHeight;
      }
      maxRowWidth = Math.max(maxRowWidth, (col + 1) * nodeSpacing);
    }

    currentY += subjectSpacing - (col === 0 ? rowHeight : 0);
  }

  return positions;
}

function sortByPrerequisiteDepth(nodes: ConceptNode[]): ConceptNode[] {
  const nodeIds = new Set(nodes.map((n) => n.id));
  const depth = new Map<string, number>();

  function getDepth(nodeId: string, visited: Set<string>): number {
    if (depth.has(nodeId)) return depth.get(nodeId)!;
    if (visited.has(nodeId)) return 0;
    visited.add(nodeId);

    const node = NODE_MAP.get(nodeId);
    if (!node) return 0;

    const prereqDepths = node.prerequisites
      .filter((id) => nodeIds.has(id))
      .map((id) => getDepth(id, visited));

    const d = prereqDepths.length > 0 ? Math.max(...prereqDepths) + 1 : 0;
    depth.set(nodeId, d);
    return d;
  }

  for (const node of nodes) {
    getDepth(node.id, new Set());
  }

  return [...nodes].sort((a, b) => (depth.get(a.id) ?? 0) - (depth.get(b.id) ?? 0));
}

export function KnowledgeGraphView() {
  const [attempts] = useState<PracticeAttempt[]>(() => getAllAttempts());
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [subjectFilter, setSubjectFilter] = useState<string | null>(null);

  const masteryData = useMemo(() => computeAllNodeMastery(attempts), [attempts]);
  const masteryMap = useMemo(
    () => new Map(masteryData.map((m) => [m.nodeId, m])),
    [masteryData]
  );

  const positions = useMemo(
    () => computeLayout(CONCEPT_NODES, subjectFilter),
    [subjectFilter]
  );

  const positionMap = useMemo(
    () => new Map(positions.map((p) => [p.node.id, p])),
    [positions]
  );

  const selectedConceptNode = selectedNode ? NODE_MAP.get(selectedNode) : null;

  const weakPrereqs = useMemo(() => {
    if (!selectedNode) return [];
    return findWeakPrerequisites(selectedNode, masteryData);
  }, [selectedNode, masteryData]);

  const studyPath = useMemo(
    () => getRecommendedPath(masteryData).slice(0, 10),
    [masteryData]
  );

  const handleNodeClick = useCallback((nodeId: string) => {
    setSelectedNode((prev) => (prev === nodeId ? null : nodeId));
  }, []);

  // Compute SVG dimensions
  const maxX = Math.max(...positions.map((p) => p.x), 600) + 200;
  const maxY = Math.max(...positions.map((p) => p.y), 400) + 120;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>
            Concept Map
          </h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--foreground-secondary)' }}>
            Visual concept dependency map - click nodes to explore prerequisites
          </p>
        </div>
      </div>

      {/* Subject Filter */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setSubjectFilter(null)}
          className="rounded-md px-3 py-1.5 text-xs font-medium transition-colors"
          style={{
            background: subjectFilter === null ? '#C5A258' : 'var(--card-bg)',
            color: subjectFilter === null ? '#0a0e14' : 'var(--foreground-secondary)',
            border: '1px solid var(--card-border)',
          }}
        >
          All Subjects
        </button>
        {CFA_SUBJECTS_ORDERED.map((subject) => (
          <button
            key={subject}
            onClick={() => setSubjectFilter(subject === subjectFilter ? null : subject)}
            className="rounded-md px-3 py-1.5 text-xs font-medium transition-colors"
            style={{
              background: subjectFilter === subject ? '#C5A258' : 'var(--card-bg)',
              color: subjectFilter === subject ? '#0a0e14' : 'var(--foreground-secondary)',
              border: '1px solid var(--card-border)',
            }}
          >
            {subject.length > 20 ? subject.slice(0, 18) + '...' : subject}
          </button>
        ))}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 rounded-lg border p-3" style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)' }}>
        {(Object.entries(MASTERY_COLORS) as [MasteryLevel, string][]).map(([level, color]) => (
          <div key={level} className="flex items-center gap-2">
            <div
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: color }}
            />
            <span className="text-xs" style={{ color: 'var(--foreground-secondary)' }}>
              {MASTERY_LABELS[level]}
            </span>
          </div>
        ))}
      </div>

      {/* SVG Graph */}
      <div
        className="overflow-auto rounded-lg border"
        style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)' }}
      >
        <svg
          width={maxX}
          height={maxY}
          viewBox={`0 0 ${maxX} ${maxY}`}
          className="min-w-full"
          role="img"
          aria-label="CFA Concept Knowledge Graph"
        >
          {/* Draw edges */}
          {positions.map((pos) =>
            pos.node.prerequisites
              .filter((prereqId) => positionMap.has(prereqId))
              .map((prereqId) => {
                const fromPos = positionMap.get(prereqId)!;
                const isHighlighted =
                  selectedNode === pos.node.id || selectedNode === prereqId;
                return (
                  <line
                    key={`${prereqId}-${pos.node.id}`}
                    x1={fromPos.x + 55}
                    y1={fromPos.y + 20}
                    x2={pos.x + 55}
                    y2={pos.y + 20}
                    stroke={isHighlighted ? '#C5A258' : '#374151'}
                    strokeWidth={isHighlighted ? 2 : 1}
                    strokeOpacity={isHighlighted ? 0.9 : 0.4}
                    markerEnd="url(#arrowhead)"
                  />
                );
              })
          )}

          {/* Arrow marker definition */}
          <defs>
            <marker
              id="arrowhead"
              markerWidth="8"
              markerHeight="6"
              refX="8"
              refY="3"
              orient="auto"
            >
              <polygon points="0 0, 8 3, 0 6" fill="#6B7280" />
            </marker>
          </defs>

          {/* Draw nodes */}
          {positions.map((pos) => {
            const mastery = masteryMap.get(pos.node.id);
            const score = mastery?.mastery ?? 0;
            const answered = mastery?.questionsAnswered ?? 0;
            const level = getMasteryLevel(score, answered);
            const color = MASTERY_COLORS[level];
            const isSelected = selectedNode === pos.node.id;
            const isPrereq = selectedConceptNode?.prerequisites.includes(pos.node.id);

            return (
              <g
                key={pos.node.id}
                onClick={() => handleNodeClick(pos.node.id)}
                className="cursor-pointer"
                role="button"
                aria-label={`${pos.node.name}: ${level}, ${score}% mastery`}
                tabIndex={0}
              >
                <rect
                  x={pos.x}
                  y={pos.y}
                  width={110}
                  height={40}
                  rx={6}
                  fill={color}
                  fillOpacity={isSelected ? 1 : 0.85}
                  stroke={isSelected ? '#ffffff' : isPrereq ? '#C5A258' : 'transparent'}
                  strokeWidth={isSelected ? 2 : isPrereq ? 1.5 : 0}
                />
                <text
                  x={pos.x + 55}
                  y={pos.y + 16}
                  textAnchor="middle"
                  fill="#ffffff"
                  fontSize={9}
                  fontWeight={600}
                >
                  {truncateText(pos.node.name, 16)}
                </text>
                <text
                  x={pos.x + 55}
                  y={pos.y + 30}
                  textAnchor="middle"
                  fill="#ffffffcc"
                  fontSize={8}
                >
                  {answered > 0 ? `${score}%` : 'No data'}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Selected Node Detail */}
      {selectedConceptNode && (
        <div
          className="rounded-lg border p-4 space-y-4"
          style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)' }}
        >
          <div>
            <h3 className="text-lg font-semibold" style={{ color: 'var(--foreground)' }}>
              {selectedConceptNode.name}
            </h3>
            <p className="text-xs mt-1" style={{ color: '#C5A258' }}>
              {selectedConceptNode.subject} - {selectedConceptNode.topic}
            </p>
            <p className="text-sm mt-2" style={{ color: 'var(--foreground-secondary)' }}>
              {selectedConceptNode.description}
            </p>
          </div>

          {/* Prerequisites */}
          {selectedConceptNode.prerequisites.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-2" style={{ color: 'var(--foreground)' }}>
                Prerequisites
              </h4>
              <div className="flex flex-wrap gap-2">
                {getDirectPrerequisites(selectedConceptNode.id).map((prereq) => {
                  const pm = masteryMap.get(prereq.id);
                  const pLevel = getMasteryLevel(pm?.mastery ?? 0, pm?.questionsAnswered ?? 0);
                  return (
                    <button
                      key={prereq.id}
                      onClick={() => setSelectedNode(prereq.id)}
                      className="rounded px-2 py-1 text-xs font-medium"
                      style={{
                        background: MASTERY_COLORS[pLevel],
                        color: '#ffffff',
                      }}
                    >
                      {prereq.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Dependents */}
          {getDependents(selectedConceptNode.id).length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-2" style={{ color: 'var(--foreground)' }}>
                Unlocks
              </h4>
              <div className="flex flex-wrap gap-2">
                {getDependents(selectedConceptNode.id).map((dep) => (
                  <button
                    key={dep.id}
                    onClick={() => setSelectedNode(dep.id)}
                    className="rounded px-2 py-1 text-xs"
                    style={{
                      background: 'var(--card-border)',
                      color: 'var(--foreground-secondary)',
                    }}
                  >
                    {dep.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Prerequisite Alert */}
          {weakPrereqs.length > 0 && (
            <PrerequisiteAlert
              targetNodeName={selectedConceptNode.name}
              weakPrerequisites={weakPrereqs}
            />
          )}
        </div>
      )}

      {/* Study Path */}
      <StudyPath recommendations={studyPath} masteryMap={masteryMap} />
    </div>
  );
}

function truncateText(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen - 1) + '\u2026';
}
