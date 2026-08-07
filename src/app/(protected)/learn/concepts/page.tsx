import { KnowledgeGraphView } from '@/features/knowledge-graph/components/knowledge-graph-view';

export const metadata = {
  title: 'Concept Map - CFA Buddy',
  description: 'Interactive CFA Level I concept dependency map showing prerequisite relationships and mastery status.',
};

export default function ConceptsPage() {
  return <KnowledgeGraphView />;
}
