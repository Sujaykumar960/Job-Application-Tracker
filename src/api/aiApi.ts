import { apiClient, withFallback } from './client';

export interface AiResponse {
  title: string;
  markdownContent: string;
  suggestedCodeSnippet?: string;
}

export const aiApi = {
  /**
   * Request a progressive algorithmic hint for the active coding problem
   */
  getCodingHint: async (problemId: string, userCode: string, language: string): Promise<AiResponse> => {
    const fallback: AiResponse = {
      title: 'Algorithmic Hint: Doubly Linked List with Hash Map',
      markdownContent: `To achieve **O(1)** time complexity for both \`get\` and \`put\` operations in an LRU Cache:
1. Use a **Hash Map** to store keys mapped directly to node references for instant lookup.
2. Use a **Doubly Linked List** where the head contains the *Most Recently Used (MRU)* item, and the tail contains the *Least Recently Used (LRU)* item.
3. Upon accessing an existing key via \`get\`, detach the node and re-insert it at the head.`,
      suggestedCodeSnippet: `type Node struct {\n    key, val   int\n    prev, next *Node\n}`,
    };

    return withFallback(
      apiClient.post<AiResponse>('/ai/hint', { problemId, userCode, language }),
      fallback
    );
  },

  /**
   * Explain compilation or runtime execution error with fix recommendations
   */
  explainError: async (code: string, errorOutput: string, language: string): Promise<AiResponse> => {
    const fallback: AiResponse = {
      title: 'Error Diagnostic & Root Cause',
      markdownContent: `### Analysis of Runtime Panic:
\`\`\`text
${errorOutput || 'nil pointer dereference'}
\`\`\`
**Root Cause**: In \`put()\`, when the cache reaches capacity, the tail eviction logic does not verify if \`tail.prev\` is nil.
**Resolution**: Initialize dummy \`head\` and \`tail\` sentinel nodes in the constructor to eliminate nil boundary checks.`,
      suggestedCodeSnippet: `func (this *LRUCache) removeNode(node *Node) {\n    node.prev.next = node.next\n    node.next.prev = node.prev\n}`,
    };

    return withFallback(
      apiClient.post<AiResponse>('/ai/explain-error', { code, errorOutput, language }),
      fallback
    );
  },

  /**
   * Step-by-step walkthrough of submitted code
   */
  explainCode: async (code: string, language: string): Promise<AiResponse> => {
    const fallback: AiResponse = {
      title: 'Code Architectural Breakdown',
      markdownContent: `### Complexity Audit
- **Time Complexity**: \\(O(1)\\) amortized for \`get\` and \`put\`.
- **Space Complexity**: \\(O(C)\\) where \\(C\\) is cache capacity.

### Structural Flow
1. **Node Mutex Protection**: Safe for single-goroutine execution.
2. **Sentinel Invariant**: The dummy head and tail guarantee that insertions never encounter null pointer exceptions.`,
    };

    return withFallback(
      apiClient.post<AiResponse>('/ai/explain-code', { code, language }),
      fallback
    );
  },

  /**
   * Suggest optimizations for space/time complexity
   */
  optimizeCode: async (code: string, language: string): Promise<AiResponse> => {
    const fallback: AiResponse = {
      title: 'Performance Optimization & Memory Compaction',
      markdownContent: `### Memory Allocation Optimization
- Pre-allocate the hash map capacity during initialization: \`make(map[int]*Node, capacity)\` to avoid re-hashing overhead during runtime bursts.
- Reduce struct padding by ordering struct fields by memory alignment.`,
      suggestedCodeSnippet: `type LRUCache struct {\n    cache    map[int]*Node\n    head     *Node\n    tail     *Node\n    capacity int\n    size     int\n}`,
    };

    return withFallback(
      apiClient.post<AiResponse>('/ai/optimize', { code, language }),
      fallback
    );
  },

  /**
   * Synthesize edge-case unit test scenarios
   */
  generateTests: async (code: string, language: string): Promise<AiResponse> => {
    const fallback: AiResponse = {
      title: 'Generated Boundary & Stress Test Cases',
      markdownContent: `### Edge Cases Generated:
1. **Zero / Single Capacity**: Eviction with capacity = 1.
2. **Key Overwrite**: Updating an existing key must refresh its recency without changing size.
3. **Repeated Lookups**: Interleaved sequential lookups on non-existent keys.`,
      suggestedCodeSnippet: `func TestLRUCache_CapacityOne(t *testing.T) {\n    cache := Constructor(1)\n    cache.Put(2, 1)\n    if val := cache.Get(2); val != 1 { t.Fail() }\n    cache.Put(3, 2)\n    if val := cache.Get(2); val != -1 { t.Fail() }\n}`,
    };

    return withFallback(
      apiClient.post<AiResponse>('/ai/generate-tests', { code, language }),
      fallback
    );
  },
};

export default aiApi;
