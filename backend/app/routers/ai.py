from fastapi import APIRouter
from app.schemas.ai import (
    AiResponse,
    CodeExplanationRequest,
    CodeOptimizationRequest,
    CodingHintRequest,
    ErrorExplanationRequest,
    TestGenerationRequest,
)

router = APIRouter(prefix="/ai", tags=["AI Assistant"])


@router.post("/hint", response_model=AiResponse)
async def get_coding_hint(request: CodingHintRequest):
    """Request a progressive algorithmic hint for active coding problem."""
    return AiResponse(
        title="Algorithmic Hint: Doubly Linked List with Hash Map",
        markdownContent=(
            "To achieve **O(1)** time complexity for both `get` and `put` operations in an LRU Cache:\n"
            "1. Use a **Hash Map** to store keys mapped directly to node references for instant lookup.\n"
            "2. Use a **Doubly Linked List** where head contains Most Recently Used item and tail contains LRU item.\n"
            "3. Upon accessing a key via `get`, detach the node and re-insert it at head."
        ),
        suggestedCodeSnippet="type Node struct {\n    key, val   int\n    prev, next *Node\n}",
    )


@router.post("/explain-error", response_model=AiResponse)
async def explain_error(request: ErrorExplanationRequest):
    """Explain compilation or runtime execution error with recommendations."""
    return AiResponse(
        title="Error Diagnostic & Root Cause",
        markdownContent=(
            f"### Analysis of Runtime Exception:\n```text\n{request.errorOutput or 'nil pointer dereference'}\n```\n"
            "**Root Cause**: In eviction logic, when cache reaches capacity, sentinel boundaries are unchecked.\n"
            "**Resolution**: Initialize dummy `head` and `tail` sentinel nodes to eliminate nil checks."
        ),
        suggestedCodeSnippet="func (this *LRUCache) removeNode(node *Node) {\n    node.prev.next = node.next\n    node.next.prev = node.prev\n}",
    )


@router.post("/explain-code", response_model=AiResponse)
async def explain_code(request: CodeExplanationRequest):
    """Step-by-step walkthrough of submitted code."""
    return AiResponse(
        title="Code Architectural Breakdown",
        markdownContent=(
            "### Complexity Audit\n"
            "- **Time Complexity**: O(1) amortized for `get` and `put` operations.\n"
            "- **Space Complexity**: O(C) where C is cache capacity.\n\n"
            "### Invariant Flow\n"
            "1. **Sentinel Nodes**: Head and tail sentinels remove boundary edge cases.\n"
            "2. **Atomic Lookup**: Hash map lookup avoids linear traversal."
        ),
    )


@router.post("/optimize", response_model=AiResponse)
async def optimize_code(request: CodeOptimizationRequest):
    """Suggest optimizations for space/time complexity."""
    return AiResponse(
        title="Performance Optimization & Memory Compaction",
        markdownContent=(
            "### Memory Allocation Optimization\n"
            "- Pre-allocate hash map bucket capacity during initialization to prevent resizing allocations.\n"
            "- Align struct fields by size to eliminate CPU memory alignment padding."
        ),
        suggestedCodeSnippet="type LRUCache struct {\n    cache    map[int]*Node\n    head     *Node\n    tail     *Node\n    capacity int\n    size     int\n}",
    )


@router.post("/generate-tests", response_model=AiResponse)
async def generate_tests(request: TestGenerationRequest):
    """Synthesize edge-case unit test scenarios."""
    return AiResponse(
        title="Generated Boundary & Stress Test Cases",
        markdownContent=(
            "### Edge Cases Generated:\n"
            "1. **Capacity One**: Eviction immediately on second insertion.\n"
            "2. **Key Overwrite**: Updating an existing key refreshes recency without increasing size.\n"
            "3. **Missing Keys**: Queries on non-existent keys must return sentinel -1."
        ),
        suggestedCodeSnippet="func TestLRUCache_CapacityOne(t *testing.T) {\n    cache := Constructor(1)\n    cache.Put(2, 1)\n    if val := cache.Get(2); val != 1 { t.Fail() }\n    cache.Put(3, 2)\n    if val := cache.Get(2); val != -1 { t.Fail() }\n}",
    )
