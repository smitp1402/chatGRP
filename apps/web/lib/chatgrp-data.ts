export type NodeRole = 'user' | 'ai' | 'fork'

export type ModelId = 'gpt-4o' | 'claude-3.7' | 'gemini-2.0' | 'gpt-4o-mini'

export type AIModel = {
  id: ModelId
  name: string
  provider: 'OpenAI' | 'Anthropic' | 'Gemini'
  credits: number
  /** css color token used for the model dot */
  dot: string
}

export const MODELS: AIModel[] = [
  { id: 'gpt-4o', name: 'GPT-4o', provider: 'OpenAI', credits: 4, dot: 'var(--chart-5)' },
  { id: 'claude-3.7', name: 'Claude 3.7 Sonnet', provider: 'Anthropic', credits: 5, dot: 'var(--chart-3)' },
  { id: 'gemini-2.0', name: 'Gemini 2.0 Flash', provider: 'Gemini', credits: 2, dot: 'var(--chart-4)' },
  { id: 'gpt-4o-mini', name: 'GPT-4o mini', provider: 'OpenAI', credits: 1, dot: 'var(--chart-2)' },
]

export function modelById(id: ModelId): AIModel {
  return MODELS.find((m) => m.id === id) ?? MODELS[0]
}

export type GraphNode = {
  id: string
  role: NodeRole
  parentId: string | null
  question: string
  answer: string
  model: ModelId
  credits: number
  x: number
  y: number
}

export type GraphEdge = {
  from: string
  to: string
}

export type SessionGroup = 'Pinned' | 'Today' | 'Yesterday' | 'Last 7 days'

export type Session = {
  id: string
  name: string
  nodeCount: number
  updatedAt: string
  pinned: boolean
  group: Exclude<SessionGroup, 'Pinned'>
}

export const SESSIONS: Session[] = [
  { id: 'graph-theory', name: 'Distributed systems design', nodeCount: 14, updatedAt: '4m', pinned: true, group: 'Today' },
  { id: 'rag-eval', name: 'RAG evaluation strategy', nodeCount: 9, updatedAt: '1h', pinned: true, group: 'Today' },
  { id: 'onboarding-copy', name: 'Onboarding copy variations', nodeCount: 6, updatedAt: '2h', pinned: false, group: 'Today' },
  { id: 'pricing-model', name: 'Credit pricing model', nodeCount: 11, updatedAt: '5h', pinned: false, group: 'Today' },
  { id: 'db-schema', name: 'Multi-tenant DB schema', nodeCount: 18, updatedAt: '1d', pinned: false, group: 'Yesterday' },
  { id: 'ml-paper', name: 'Reading: attention is all you need', nodeCount: 7, updatedAt: '1d', pinned: false, group: 'Yesterday' },
  { id: 'launch-plan', name: 'Launch checklist Q3', nodeCount: 22, updatedAt: '3d', pinned: false, group: 'Last 7 days' },
  { id: 'brand-voice', name: 'Brand voice exploration', nodeCount: 5, updatedAt: '5d', pinned: false, group: 'Last 7 days' },
  { id: 'api-design', name: 'Public API surface design', nodeCount: 13, updatedAt: '6d', pinned: false, group: 'Last 7 days' },
]

/**
 * A directed graph for the active session. Coordinates are in an abstract
 * SVG space; the canvas viewbox is 900x640.
 */
export const GRAPH_NODES: GraphNode[] = [
  {
    id: 'n1',
    role: 'user',
    parentId: null,
    question: 'How should I shard a multi-region write workload?',
    answer: 'There are three common strategies for sharding writes across regions...',
    model: 'gpt-4o',
    credits: 4,
    x: 70,
    y: 40,
  },
  {
    id: 'n2',
    role: 'ai',
    parentId: 'n1',
    question: 'Sharding strategies overview',
    answer: 'Use hash-based sharding for even distribution, or geo-partitioning to keep data close to users. Trade-offs depend on your consistency needs.',
    model: 'gpt-4o',
    credits: 4,
    x: 70,
    y: 230,
  },
  {
    id: 'n3',
    role: 'user',
    parentId: 'n2',
    question: 'What about consistency with geo-partitioning?',
    answer: 'Follow-up on consistency guarantees...',
    model: 'claude-3.7',
    credits: 5,
    x: 70,
    y: 420,
  },
  {
    id: 'n4',
    role: 'ai',
    parentId: 'n3',
    question: 'Consistency in geo-partitioned systems',
    answer: 'You typically get strong consistency within a region and eventual consistency across regions. Consider a consensus protocol like Raft per shard.',
    model: 'claude-3.7',
    credits: 5,
    x: 70,
    y: 610,
  },
  {
    id: 'n5',
    role: 'fork',
    parentId: 'n2',
    question: 'Compare to hash-based sharding instead',
    answer: 'Forked branch exploring hash sharding trade-offs.',
    model: 'gemini-2.0',
    credits: 2,
    x: 400,
    y: 340,
  },
  {
    id: 'n6',
    role: 'ai',
    parentId: 'n5',
    question: 'Hash sharding trade-offs',
    answer: 'Hash sharding gives even load but makes range scans expensive and rebalancing harder when adding nodes.',
    model: 'gemini-2.0',
    credits: 2,
    x: 400,
    y: 530,
  },
]

export const GRAPH_EDGES: GraphEdge[] = GRAPH_NODES.filter((n) => n.parentId).map((n) => ({
  from: n.parentId as string,
  to: n.id,
}))

/** Linear thread for the currently selected branch (n1 -> n2 -> n3 -> n4). */
export const ACTIVE_BRANCH_IDS = ['n1', 'n2', 'n3', 'n4']

export const CREDITS = {
  used: 6420,
  total: 10000,
}
