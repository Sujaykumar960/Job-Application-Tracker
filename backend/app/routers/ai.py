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

HINTS_BY_PROBLEM = {
    "prob-two-sum": {
        "title": "Algorithmic Hint: Hash Map Complement Lookup",
        "markdownContent": (
            "### Optimal Single-Pass Strategy\n"
            "To achieve **O(n)** time complexity:\n"
            "1. Iterate through `nums` while maintaining a hash map of `{value: index}`.\n"
            "2. For each number `n`, compute complement: `diff = target - n`.\n"
            "3. If `diff` exists in your hash map, you have found the pair! Return `[lookup[diff], current_index]`.\n"
            "4. Otherwise, insert `n` into the hash map and proceed."
        ),
        "suggestedCodeSnippet": "lookup = {}\nfor i, n in enumerate(nums):\n    diff = target - n\n    if diff in lookup:\n        return [lookup[diff], i]\n    lookup[n] = i\nreturn []",
    },
    "prob-valid-parentheses": {
        "title": "Algorithmic Hint: LIFO Stack Invariant",
        "markdownContent": (
            "### Optimal Stack Matching\n"
            "1. Map closing brackets to opening brackets: `mapping = {')': '(', '}': '{', ']': '['}`.\n"
            "2. Push open brackets onto a LIFO stack.\n"
            "3. When encountering a closing bracket, pop from the stack and verify that it matches.\n"
            "4. Finally, the stack must be completely empty."
        ),
        "suggestedCodeSnippet": "stack = []\nmapping = {')': '(', '}': '{', ']': '['}\nfor char in s:\n    if char in mapping:\n        top = stack.pop() if stack else '#'\n        if mapping[char] != top:\n            return False\n    else:\n        stack.append(char)\nreturn not stack",
    },
    "prob-best-time-stock": {
        "title": "Algorithmic Hint: Single-Pass Peak-Valley Tracking",
        "markdownContent": (
            "### Greedy Optimal Invariant\n"
            "1. Maintain `min_price` initialized to infinity and `max_profit` initialized to 0.\n"
            "2. For every price, update `min_price = min(min_price, price)`.\n"
            "3. Calculate current profit `price - min_price` and maximize `max_profit`."
        ),
        "suggestedCodeSnippet": "min_price = float('inf')\nmax_profit = 0\nfor p in prices:\n    min_price = min(min_price, p)\n    max_profit = max(max_profit, p - min_price)\nreturn max_profit",
    },
    "prob-climbing-stairs": {
        "title": "Algorithmic Hint: Dynamic Programming Recurrence",
        "markdownContent": (
            "### DP State Transition\n"
            "To reach step `n`, you can only arrive from step `n-1` (1 step) or step `n-2` (2 steps).\n"
            "- Recurrence: `ways(n) = ways(n-1) + ways(n-2)` with base cases `ways(1) = 1, ways(2) = 2`.\n"
            "- Space optimization: Only keep two previous variables `a` and `b` in **O(1)** memory."
        ),
        "suggestedCodeSnippet": "if n <= 2:\n    return n\na, b = 1, 2\nfor _ in range(3, n + 1):\n    a, b = b, a + b\nreturn b",
    },
    "prob-longest-substring": {
        "title": "Algorithmic Hint: Sliding Window with Dynamic Left Pointer",
        "markdownContent": (
            "### Sliding Window Two-Pointer Approach\n"
            "1. Maintain a set or hash map of characters currently in the window `[left, right]`.\n"
            "2. If `s[right]` is already in the set, increment `left` and remove `s[left]` until no duplicate remains.\n"
            "3. Record `max(max_len, right - left + 1)` at each step."
        ),
        "suggestedCodeSnippet": "char_set = set()\nleft = 0\nres = 0\nfor right in range(len(s)):\n    while s[right] in char_set:\n        char_set.remove(s[left])\n        left += 1\n    char_set.add(s[right])\n    res = max(res, right - left + 1)\nreturn res",
    },
    "prob-1": {
        "title": "Algorithmic Hint: Doubly Linked List with Hash Map",
        "markdownContent": (
            "To achieve **O(1)** time complexity for both `get` and `put` operations in an LRU Cache:\n"
            "1. Use a **Hash Map** to store keys mapped directly to node references for instant lookup.\n"
            "2. Use a **Doubly Linked List** where head contains Most Recently Used item and tail contains LRU item.\n"
            "3. Upon accessing a key via `get`, detach the node and re-insert it at head."
        ),
        "suggestedCodeSnippet": "class DLinkedNode:\n    def __init__(self, key=0, value=0):\n        self.key, self.value = key, value\n        self.prev = self.next = None",
    },
    "prob-number-of-islands": {
        "title": "Algorithmic Hint: Grid DFS/BFS Connected Components",
        "markdownContent": (
            "### Grid Traversal Invariant\n"
            "1. Iterate through each cell `(r, c)` of the grid.\n"
            "2. When encountering `'1'`, increment island count and initiate a DFS or BFS.\n"
            "3. During DFS/BFS, mark visited cells by mutating them to `'0'` to avoid revisiting."
        ),
        "suggestedCodeSnippet": "def dfs(r, c):\n    if r < 0 or r >= len(grid) or c < 0 or c >= len(grid[0]) or grid[r][c] != '1':\n        return\n    grid[r][c] = '0'\n    for dr, dc in [(0,1), (0,-1), (1,0), (-1,0)]:\n        dfs(r + dr, c + dc)",
    },
    "prob-search-rotated": {
        "title": "Algorithmic Hint: Modified Binary Search O(log n)",
        "markdownContent": (
            "### Sorted Half Identification\n"
            "In any rotated sorted array, at least one half `[left, mid]` or `[mid, right]` is guaranteed to be strictly sorted.\n"
            "1. If `nums[left] <= nums[mid]`, left half is sorted.\n"
            "2. Check if `target` falls inside `[nums[left], nums[mid])`. If yes, search left; else search right.\n"
            "3. Otherwise, right half is sorted: check if target is inside `(nums[mid], nums[right]]`."
        ),
        "suggestedCodeSnippet": "while l <= r:\n    mid = (l + r) // 2\n    if nums[mid] == target:\n        return mid\n    if nums[l] <= nums[mid]:\n        if nums[l] <= target < nums[mid]:\n            r = mid - 1\n        else:\n            l = mid + 1\n    else:\n        if nums[mid] < target <= nums[r]:\n            l = mid + 1\n        else:\n            r = mid - 1\nreturn -1",
    },
    "prob-maximum-subarray": {
        "title": "Algorithmic Hint: Kadane's Local Maximum Recurrence",
        "markdownContent": (
            "### Local vs Global Maximum\n"
            "- At each index `i`, decide: should we extend the previous subarray sum `current_sum + nums[i]`, or start a new subarray at `nums[i]`?\n"
            "- Recurrence: `current_sum = max(nums[i], current_sum + nums[i])`.\n"
            "- Update `max_sum = max(max_sum, current_sum)`."
        ),
        "suggestedCodeSnippet": "cur_sum = max_sum = nums[0]\nfor n in nums[1:]:\n    cur_sum = max(n, cur_sum + n)\n    max_sum = max(max_sum, cur_sum)\nreturn max_sum",
    },
    "prob-trapping-rain-water": {
        "title": "Algorithmic Hint: Two-Pointer Height Bounding",
        "markdownContent": (
            "### Two-Pointer Linear Scan O(n)\n"
            "Water trapped on any bar is determined by `min(max_left, max_right) - height[i]`.\n"
            "1. Initialize `l = 0, r = len(height) - 1`, tracking `left_max` and `right_max`.\n"
            "2. Advance the pointer with the smaller max height inward, adding `max - height[curr]` to total water."
        ),
        "suggestedCodeSnippet": "l, r = 0, len(height) - 1\nleft_max, right_max = height[l], height[r]\nwater = 0\nwhile l < r:\n    if left_max < right_max:\n        l += 1\n        left_max = max(left_max, height[l])\n        water += left_max - height[l]\n    else:\n        r -= 1\n        right_max = max(right_max, height[r])\n        water += right_max - height[r]\nreturn water",
    },
    "prob-2": {
        "title": "Algorithmic Hint: Monotonic Decreasing Deque",
        "markdownContent": (
            "### Monotonic Deque Invariant\n"
            "1. Store indices in a double-ended queue `collections.deque`.\n"
            "2. Maintain values in descending order: pop smaller elements from the back before inserting current index.\n"
            "3. Pop indices that fall outside the active window `[i - k + 1, i]` from the front.\n"
            "4. The front of the deque always holds the maximum for the window."
        ),
        "suggestedCodeSnippet": "from collections import deque\nq = deque()\nres = []\nfor i, n in enumerate(nums):\n    while q and nums[q[-1]] < n:\n        q.pop()\n    q.append(i)\n    if q[0] <= i - k:\n        q.popleft()\n    if i >= k - 1:\n        res.append(nums[q[0]])\nreturn res",
    },
}


@router.post("/hint", response_model=AiResponse)
async def get_coding_hint(request: CodingHintRequest):
    """Request a progressive algorithmic hint for active coding problem."""
    hint = HINTS_BY_PROBLEM.get(request.problemId)
    if hint:
        return AiResponse(
            title=hint["title"],
            markdownContent=hint["markdownContent"],
            suggestedCodeSnippet=hint.get("suggestedCodeSnippet"),
        )

    return AiResponse(
        title="Algorithmic Hint: Problem Structure & Invariants",
        markdownContent=(
            "### Recommended Problem-Solving Steps\n"
            "1. Identify the input data structure and constraints.\n"
            "2. Determine whether a Hash Map, Two Pointers, or Dynamic Programming reduces time complexity.\n"
            "3. Write down 2 edge cases (empty input, minimum constraint) before writing code."
        ),
        suggestedCodeSnippet="# Focus on reducing nested loops to O(n) or O(n log n)",
    )


@router.post("/explain-error", response_model=AiResponse)
async def explain_error(request: ErrorExplanationRequest):
    """Explain compilation or runtime execution error with recommendations."""
    return AiResponse(
        title="Error Diagnostic & Root Cause",
        markdownContent=(
            f"### Analysis of Runtime Exception:\n```text\n{request.errorOutput or 'Unhandled Runtime Exception'}\n```\n"
            "### Root Cause Identification\n"
            "- Boundary index violation or missing key lookup in dictionary.\n"
            "- Unchecked edge cases when array length is 0 or 1.\n"
            "### Recommended Resolution\n"
            "- Add pre-flight boundary guards and check variable types."
        ),
        suggestedCodeSnippet="if not nums or len(nums) < 2:\n    return []",
    )


@router.post("/explain-code", response_model=AiResponse)
async def explain_code(request: CodeExplanationRequest):
    """Step-by-step walkthrough of submitted code."""
    return AiResponse(
        title="Code Architectural Breakdown",
        markdownContent=(
            "### Complexity Audit\n"
            "- **Time Complexity**: **O(n)** single pass linear scan.\n"
            "- **Space Complexity**: **O(n)** auxiliary hash map / stack memory.\n\n"
            "### Invariant Flow\n"
            "1. **Pre-Conditions**: Validates inputs within specified problem constraints.\n"
            "2. **State Updates**: Invariant maintained at each iteration.\n"
            "3. **Termination**: Guarantees optimal return with zero infinite loops."
        ),
    )


@router.post("/optimize", response_model=AiResponse)
async def optimize_code(request: CodeOptimizationRequest):
    """Suggest optimizations for space/time complexity."""
    return AiResponse(
        title="Performance Optimization & Memory Compaction",
        markdownContent=(
            "### Memory Allocation Optimization\n"
            "- Pre-allocate container capacity during initialization to prevent resizing allocations.\n"
            "- Replace auxiliary hash sets with in-place two-pointer scans where applicable to achieve **O(1)** auxiliary space.\n"
            "- Use generator expressions or iterators rather than materializing full intermediate lists."
        ),
        suggestedCodeSnippet="# In-place two-pointer traversal avoids O(n) memory allocation\nl, r = 0, len(arr) - 1",
    )


@router.post("/generate-tests", response_model=AiResponse)
async def generate_tests(request: TestGenerationRequest):
    """Synthesize edge-case unit test scenarios."""
    return AiResponse(
        title="Generated Boundary & Stress Test Cases",
        markdownContent=(
            "### Edge Cases Synthesized:\n"
            "1. **Minimum Constraint**: Array with 1 or 2 elements.\n"
            "2. **Duplicate Values**: Elements with identical keys or values.\n"
            "3. **Negative & Zero Values**: Testing mathematical boundary signs.\n"
            "4. **Already Sorted & Reverse Sorted**: Verifying monotonic edge behavior."
        ),
        suggestedCodeSnippet="def test_edge_cases():\n    assert solution([0, 0], 0) is not None\n    assert solution([-1, -2, -3], -5) is not None",
    )
