import { TestCase } from '../api/codeExecution';

export interface CodingProblem {
  id: string;
  slug: string;
  title: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  acceptance: string;
  companies: string[];
  tags: string[];
  description: string;
  examples: Array<{
    input: string;
    output: string;
    explanation?: string;
  }>;
  constraints: string[];
  starterCode: Record<string, string>;
  testCases: TestCase[];
}

export const CODING_PROBLEMS: CodingProblem[] = [
  // =========================================================================
  // 1. TWO SUM (Easy)
  // =========================================================================
  {
    id: 'prob-two-sum',
    slug: 'two-sum',
    title: '1. Two Sum',
    difficulty: 'Easy',
    acceptance: '52.8%',
    companies: ['Google', 'Meta', 'Amazon', 'Apple', 'Microsoft'],
    tags: ['Array', 'Hash Table'],
    description: `Given an array of integers \`nums\` and an integer \`target\`, return *indices of the two numbers such that they add up to \`target\`*.

You may assume that each input would have **exactly one solution**, and you may not use the *same* element twice.

You can return the answer in any order.`,
    examples: [
      {
        input: 'nums = [2, 7, 11, 15], target = 9',
        output: '[0, 1]',
        explanation: 'Because nums[0] + nums[1] == 9, we return [0, 1].',
      },
      {
        input: 'nums = [3, 2, 4], target = 6',
        output: '[1, 2]',
        explanation: 'Because nums[1] + nums[2] == 6, we return [1, 2].',
      },
      {
        input: 'nums = [3, 3], target = 6',
        output: '[0, 1]',
        explanation: 'Because nums[0] + nums[1] == 6, we return [0, 1].',
      },
    ],
    constraints: [
      '2 <= nums.length <= 10^4',
      '-10^9 <= nums[i] <= 10^9',
      '-10^9 <= target <= 10^9',
      'Only one valid answer exists.',
    ],
    starterCode: {
      python: `from typing import List

class Solution:
    def twoSum(self, nums: List[int], target: int) -> List[int]:
        # Implement hash table single-pass lookup
        pass`,
      go: `package main

func twoSum(nums []int, target int) []int {
    // Implement hash map lookup
    return nil
}`,
      typescript: `function twoSum(nums: number[], target: number): number[] {
  // Implement hash map lookup
  return [];
}`,
      cpp: `#include <vector>
#include <unordered_map>

class Solution {
public:
    std::vector<int> twoSum(std::vector<int>& nums, int target) {
        // Implement hash map lookup
        return {};
    }
};`,
      java: `import java.util.*;

class Solution {
    public int[] twoSum(int[] nums, int target) {
        // Implement hash map lookup
        return new int[0];
    }
}`,
      rust: `use std::collections::HashMap;

impl Solution {
    pub fn two_sum(nums: Vec<i32>, target: i32) -> Vec<i32> {
        vec![]
    }
}`,
    },
    testCases: [
      {
        id: 'tc-1',
        input: 'nums = [2, 7, 11, 15], target = 9',
        expectedOutput: '[0, 1]',
      },
      {
        id: 'tc-2',
        input: 'nums = [3, 2, 4], target = 6',
        expectedOutput: '[1, 2]',
      },
      {
        id: 'tc-3',
        input: 'nums = [3, 3], target = 6',
        expectedOutput: '[0, 1]',
      },
    ],
  },

  // =========================================================================
  // 2. VALID PARENTHESES (Easy)
  // =========================================================================
  {
    id: 'prob-valid-parentheses',
    slug: 'valid-parentheses',
    title: '20. Valid Parentheses',
    difficulty: 'Easy',
    acceptance: '40.5%',
    companies: ['Amazon', 'Meta', 'Bloomberg', 'Microsoft'],
    tags: ['String', 'Stack'],
    description: `Given a string \`s\` containing just the characters \`'('\`, \`')'\`, \`'{'\`, \`'}'\`, \`'['\` and \`']'\`, determine if the input string is valid.

An input string is valid if:
1. Open brackets must be closed by the same type of brackets.
2. Open brackets must be closed in the correct order.
3. Every close bracket has a corresponding open bracket of the same type.`,
    examples: [
      {
        input: 's = "()"',
        output: 'true',
        explanation: 'The brackets match correctly.',
      },
      {
        input: 's = "()[]{}"',
        output: 'true',
        explanation: 'All sets of brackets are closed in the matching sequence.',
      },
      {
        input: 's = "(]"',
        output: 'false',
        explanation: 'Closing bracket does not match open bracket type.',
      },
    ],
    constraints: [
      '1 <= s.length <= 10^4',
      's consists of parentheses only "()[]{}"',
    ],
    starterCode: {
      python: `class Solution:
    def isValid(self, s: str) -> bool:
        # Implement stack matching
        pass`,
      go: `package main

func isValid(s string) bool {
    // Implement stack matching
    return false
}`,
      typescript: `function isValid(s: string): boolean {
  // Implement stack matching
  return false;
}`,
      cpp: `#include <string>
#include <stack>

class Solution {
public:
    bool isValid(std::string s) {
        return false;
    }
};`,
      java: `import java.util.*;

class Solution {
    public boolean isValid(String s) {
        return false;
    }
}`,
      rust: `impl Solution {
    pub fn is_valid(s: String) -> bool {
        false
    }
}`,
    },
    testCases: [
      {
        id: 'tc-1',
        input: 's = "()"',
        expectedOutput: 'true',
      },
      {
        id: 'tc-2',
        input: 's = "()[]{}"',
        expectedOutput: 'true',
      },
      {
        id: 'tc-3',
        input: 's = "(]"',
        expectedOutput: 'false',
      },
    ],
  },

  // =========================================================================
  // 3. BEST TIME TO BUY AND SELL STOCK (Easy)
  // =========================================================================
  {
    id: 'prob-best-time-stock',
    slug: 'best-time-to-buy-and-sell-stock',
    title: '121. Best Time to Buy and Sell Stock',
    difficulty: 'Easy',
    acceptance: '54.1%',
    companies: ['Amazon', 'Apple', 'Meta', 'Google', 'Microsoft'],
    tags: ['Array', 'Dynamic Programming', 'Greedy'],
    description: `You are given an array \`prices\` where \`prices[i]\` is the price of a given stock on the \`i\`-th day.

You want to maximize your profit by choosing a **single day** to buy one stock and choosing a **different day in the future** to sell that stock.

Return *the maximum profit you can achieve from this transaction*. If you cannot achieve any profit, return \`0\`.`,
    examples: [
      {
        input: 'prices = [7, 1, 5, 3, 6, 4]',
        output: '5',
        explanation: 'Buy on day 2 (price = 1) and sell on day 5 (price = 6), profit = 6 - 1 = 5.',
      },
      {
        input: 'prices = [7, 6, 4, 3, 1]',
        output: '0',
        explanation: 'In this case, no transactions are done and the max profit = 0.',
      },
    ],
    constraints: [
      '1 <= prices.length <= 10^5',
      '0 <= prices[i] <= 10^4',
    ],
    starterCode: {
      python: `from typing import List

class Solution:
    def maxProfit(self, prices: List[int]) -> int:
        # Track minimum price seen so far and maximize spread
        pass`,
      go: `package main

func maxProfit(prices []int) int {
    return 0
}`,
      typescript: `function maxProfit(prices: number[]): number {
  return 0;
}`,
      cpp: `#include <vector>
#include <algorithm>

class Solution {
public:
    int maxProfit(std::vector<int>& prices) {
        return 0;
    }
};`,
      java: `class Solution {
    public int maxProfit(int[] prices) {
        return 0;
    }
}`,
      rust: `impl Solution {
    pub fn max_profit(prices: Vec<i32>) -> i32 {
        0
    }
}`,
    },
    testCases: [
      {
        id: 'tc-1',
        input: 'prices = [7, 1, 5, 3, 6, 4]',
        expectedOutput: '5',
      },
      {
        id: 'tc-2',
        input: 'prices = [7, 6, 4, 3, 1]',
        expectedOutput: '0',
      },
    ],
  },

  // =========================================================================
  // 4. CLIMBING STAIRS (Easy)
  // =========================================================================
  {
    id: 'prob-climbing-stairs',
    slug: 'climbing-stairs',
    title: '70. Climbing Stairs',
    difficulty: 'Easy',
    acceptance: '52.6%',
    companies: ['Amazon', 'Google', 'Apple', 'Adobe'],
    tags: ['Math', 'Dynamic Programming', 'Memoization'],
    description: `You are climbing a staircase. It takes \`n\` steps to reach the top.

Each time you can either climb \`1\` or \`2\` steps. In how many distinct ways can you climb to the top?`,
    examples: [
      {
        input: 'n = 2',
        output: '2',
        explanation: 'There are two ways: (1 step + 1 step) or (2 steps).',
      },
      {
        input: 'n = 3',
        output: '3',
        explanation: 'There are three ways: (1+1+1), (1+2), or (2+1).',
      },
    ],
    constraints: [
      '1 <= n <= 45',
    ],
    starterCode: {
      python: `class Solution:
    def climbStairs(self, n: int) -> int:
        # Solve with dynamic programming / Fibonacci recurrence
        pass`,
      go: `package main

func climbStairs(n int) int {
    return 0
}`,
      typescript: `function climbStairs(n: number): number {
  return 0;
}`,
      cpp: `class Solution {
public:
    int climbStairs(int n) {
        return 0;
    }
};`,
      java: `class Solution {
    public int climbStairs(int n) {
        return 0;
    }
}`,
      rust: `impl Solution {
    pub fn climb_stairs(n: i32) -> i32 {
        0
    }
}`,
    },
    testCases: [
      {
        id: 'tc-1',
        input: 'n = 2',
        expectedOutput: '2',
      },
      {
        id: 'tc-2',
        input: 'n = 3',
        expectedOutput: '3',
      },
      {
        id: 'tc-3',
        input: 'n = 5',
        expectedOutput: '8',
      },
    ],
  },

  // =========================================================================
  // 5. LONGEST SUBSTRING WITHOUT REPEATING CHARACTERS (Medium)
  // =========================================================================
  {
    id: 'prob-longest-substring',
    slug: 'longest-substring-without-repeating-characters',
    title: '3. Longest Substring Without Repeating Characters',
    difficulty: 'Medium',
    acceptance: '34.6%',
    companies: ['Amazon', 'Google', 'Microsoft', 'Apple', 'Bloomberg'],
    tags: ['Hash Table', 'String', 'Sliding Window'],
    description: `Given a string \`s\`, find the length of the **longest substring** without repeating characters.`,
    examples: [
      {
        input: 's = "abcabcbb"',
        output: '3',
        explanation: 'The answer is "abc", with the length of 3.',
      },
      {
        input: 's = "bbbbb"',
        output: '1',
        explanation: 'The answer is "b", with the length of 1.',
      },
      {
        input: 's = "pwwkew"',
        output: '3',
        explanation: 'The answer is "wke", with the length of 3. Notice that "pwke" is a subsequence and not a substring.',
      },
    ],
    constraints: [
      '0 <= s.length <= 5 * 10^4',
      's consists of English letters, digits, symbols and spaces.',
    ],
    starterCode: {
      python: `class Solution:
    def lengthOfLongestSubstring(self, s: str) -> int:
        # Implement sliding window with set/map
        pass`,
      go: `package main

func lengthOfLongestSubstring(s string) int {
    return 0
}`,
      typescript: `function lengthOfLongestSubstring(s: string): number {
  return 0;
}`,
      cpp: `#include <string>
#include <unordered_set>

class Solution {
public:
    int lengthOfLongestSubstring(std::string s) {
        return 0;
    }
};`,
      java: `import java.util.*;

class Solution {
    public int lengthOfLongestSubstring(String s) {
        return 0;
    }
}`,
      rust: `impl Solution {
    pub fn length_of_longest_substring(s: String) -> i32 {
        0
    }
}`,
    },
    testCases: [
      {
        id: 'tc-1',
        input: 's = "abcabcbb"',
        expectedOutput: '3',
      },
      {
        id: 'tc-2',
        input: 's = "bbbbb"',
        expectedOutput: '1',
      },
      {
        id: 'tc-3',
        input: 's = "pwwkew"',
        expectedOutput: '3',
      },
    ],
  },

  // =========================================================================
  // 6. LRU CACHE (Medium)
  // =========================================================================
  {
    id: 'prob-1',
    slug: 'lru-cache',
    title: '146. LRU Cache',
    difficulty: 'Medium',
    acceptance: '43.2%',
    companies: ['Google', 'Stripe', 'Amazon', 'Microsoft', 'Bloomberg'],
    tags: ['Hash Table', 'Linked List', 'Design', 'Doubly-Linked List'],
    description: `Design a data structure that follows the constraints of a **Least Recently Used (LRU) cache**.

Implement the \`LRUCache\` class:
* \`LRUCache(int capacity)\`: Initialize the LRU cache with positive size capacity.
* \`int get(int key)\`: Return the value of the key if the key exists, otherwise return \`-1\`.
* \`void put(int key, int value)\`: Update the value of the key if the key exists. Otherwise, add the key-value pair to the cache. If the number of keys exceeds the capacity from this operation, **evict the least recently used key**.

The functions \`get\` and \`put\` must each run in **O(1)** average time complexity.`,
    examples: [
      {
        input: '["LRUCache", "put", "put", "get", "put", "get", "put", "get", "get", "get"]\n[[2], [1, 1], [2, 2], [1], [3, 3], [2], [4, 4], [1], [3], [4]]',
        output: '[null, null, null, 1, null, -1, null, -1, 3, 4]',
        explanation: 'LRUCache lRUCache = new LRUCache(2);\nlRUCache.put(1, 1); // cache is {1=1}\nlRUCache.put(2, 2); // cache is {1=1, 2=2}\nlRUCache.get(1);    // return 1\nlRUCache.put(3, 3); // LRU key was 2, evicts key 2, cache is {1=1, 3=3}\nlRUCache.get(2);    // returns -1 (not found)',
      },
    ],
    constraints: [
      '1 <= capacity <= 3000',
      '0 <= key <= 10^4',
      '0 <= value <= 10^5',
      'At most 2 * 10^5 calls will be made to get and put.',
    ],
    starterCode: {
      python: `class DLinkedNode:
    def __init__(self, key=0, value=0):
        self.key = key
        self.value = value
        self.prev = None
        self.next = None

class LRUCache:
    def __init__(self, capacity: int):
        self.capacity = capacity
        self.cache = {}
        self.head = DLinkedNode()
        self.tail = DLinkedNode()
        self.head.next = self.tail
        self.tail.prev = self.head

    def get(self, key: int) -> int:
        # TODO: Return value and move to head
        return -1

    def put(self, key: int, value: int) -> None:
        # TODO: Add node and evict tail if size > capacity
        pass`,
      go: `package main

type LRUCache struct {
    capacity int
}

func Constructor(capacity int) LRUCache {
    return LRUCache{capacity: capacity}
}

func (this *LRUCache) Get(key int) int {
    return -1
}

func (this *LRUCache) Put(key int, value int) {
}`,
      typescript: `class DNode {
  key: number;
  val: number;
  prev: DNode | null = null;
  next: DNode | null = null;
  constructor(key: number = 0, val: number = 0) {
    this.key = key;
    this.val = val;
  }
}

class LRUCache {
  private capacity: number;
  private map = new Map<number, DNode>();

  constructor(capacity: number) {
    this.capacity = capacity;
  }

  get(key: number): number {
    return -1;
  }

  put(key: number, value: number): void {
  }
}`,
      cpp: `#include <unordered_map>
#include <list>

class LRUCache {
private:
    int cap;

public:
    LRUCache(int capacity) : cap(capacity) {}
    
    int get(int key) {
        return -1;
    }
    
    void put(int key, int value) {
    }
};`,
      java: `import java.util.*;

class LRUCache {
    public LRUCache(int capacity) {}
    public int get(int key) { return -1; }
    public void put(int key, int value) {}
}`,
      rust: `use std::collections::HashMap;

struct LRUCache {
    capacity: usize,
    map: HashMap<i32, i32>,
}

impl LRUCache {
    fn new(capacity: i32) -> Self {
        LRUCache {
            capacity: capacity as usize,
            map: HashMap::new(),
        }
    }
    fn get(&mut self, key: i32) -> i32 { -1 }
    fn put(&mut self, key: i32, value: i32) {}
}`,
    },
    testCases: [
      {
        id: 'tc-1',
        input: 'capacity = 2, operations: [put(1,1), put(2,2), get(1)]',
        expectedOutput: '[null, null, 1]',
      },
      {
        id: 'tc-2',
        input: 'capacity = 2, operations: [put(1,1), put(2,2), get(1), put(3,3), get(2)]',
        expectedOutput: '[null, null, 1, null, -1]',
      },
      {
        id: 'tc-3',
        input: 'capacity = 1, operations: [put(2,1), get(2), put(3,2), get(2), get(3)]',
        expectedOutput: '[null, 1, null, -1, 2]',
      },
    ],
  },

  // =========================================================================
  // 7. NUMBER OF ISLANDS (Medium)
  // =========================================================================
  {
    id: 'prob-number-of-islands',
    slug: 'number-of-islands',
    title: '200. Number of Islands',
    difficulty: 'Medium',
    acceptance: '58.4%',
    companies: ['Amazon', 'Google', 'Meta', 'Bloomberg', 'Microsoft'],
    tags: ['Array', 'Depth-First Search', 'Breadth-First Search', 'Matrix'],
    description: `Given an \`m x n\` 2D binary grid \`grid\` which represents a map of \`'1'\`s (land) and \`'0'\`s (water), return *the number of islands*.

An **island** is surrounded by water and is formed by connecting adjacent lands horizontally or vertically. You may assume all four edges of the grid are all surrounded by water.`,
    examples: [
      {
        input: 'grid = [\n  ["1","1","1","1","0"],\n  ["1","1","0","1","0"],\n  ["1","1","0","0","0"],\n  ["0","0","0","0","0"]\n]',
        output: '1',
        explanation: 'All lands are connected horizontally or vertically into a single island.',
      },
      {
        input: 'grid = [\n  ["1","1","0","0","0"],\n  ["1","1","0","0","0"],\n  ["0","0","1","0","0"],\n  ["0","0","0","1","1"]\n]',
        output: '3',
        explanation: 'There are 3 separate connected components of land.',
      },
    ],
    constraints: [
      'm == grid.length',
      'n == grid[i].length',
      '1 <= m, n <= 300',
      'grid[i][j] is "0" or "1".',
    ],
    starterCode: {
      python: `from typing import List

class Solution:
    def numIslands(self, grid: List[List[str]]) -> int:
        # Implement DFS or BFS connected component traversal
        pass`,
      go: `package main

func numIslands(grid [][]byte) int {
    return 0
}`,
      typescript: `function numIslands(grid: string[][]): number {
  return 0;
}`,
      cpp: `#include <vector>

class Solution {
public:
    int numIslands(std::vector<std::vector<char>>& grid) {
        return 0;
    }
};`,
      java: `class Solution {
    public int numIslands(char[][] grid) {
        return 0;
    }
}`,
      rust: `impl Solution {
    pub fn num_islands(grid: Vec<Vec<char>>) -> i32 {
        0
    }
}`,
    },
    testCases: [
      {
        id: 'tc-1',
        input: 'grid = [["1","1","1","1","0"],["1","1","0","1","0"],["1","1","0","0","0"],["0","0","0","0","0"]]',
        expectedOutput: '1',
      },
      {
        id: 'tc-2',
        input: 'grid = [["1","1","0","0","0"],["1","1","0","0","0"],["0","0","1","0","0"],["0","0","0","1","1"]]',
        expectedOutput: '3',
      },
    ],
  },

  // =========================================================================
  // 8. SEARCH IN ROTATED SORTED ARRAY (Medium)
  // =========================================================================
  {
    id: 'prob-search-rotated',
    slug: 'search-in-rotated-sorted-array',
    title: '33. Search in Rotated Sorted Array',
    difficulty: 'Medium',
    acceptance: '40.9%',
    companies: ['Google', 'Meta', 'Amazon', 'Microsoft', 'ByteDance'],
    tags: ['Array', 'Binary Search'],
    description: `There is an integer array \`nums\` sorted in ascending order (with **distinct** values).

Prior to being passed to your function, \`nums\` is **possibly rotated** at an unknown pivot index \`k\` (\`1 <= k < nums.length\`) such that the resulting array is \`[nums[k], nums[k+1], ..., nums[n-1], nums[0], nums[1], ..., nums[k-1]]\`.

Given the array \`nums\` after the possible rotation and an integer \`target\`, return *the index of \`target\` if it is in \`nums\`, or \`-1\` if it is not in \`nums\`*.

You must write an algorithm with **O(log n)** runtime complexity.`,
    examples: [
      {
        input: 'nums = [4,5,6,7,0,1,2], target = 0',
        output: '4',
        explanation: 'Target 0 is found at index 4.',
      },
      {
        input: 'nums = [4,5,6,7,0,1,2], target = 3',
        output: '-1',
        explanation: 'Target 3 does not exist in the array.',
      },
      {
        input: 'nums = [1], target = 0',
        output: '-1',
        explanation: 'Single element array does not contain target 0.',
      },
    ],
    constraints: [
      '1 <= nums.length <= 5000',
      '-10^4 <= nums[i] <= 10^4',
      'All values of nums are unique.',
      'nums is guaranteed to be rotated at some pivot.',
      '-10^4 <= target <= 10^4',
    ],
    starterCode: {
      python: `from typing import List

class Solution:
    def search(self, nums: List[int], target: int) -> int:
        # Implement modified binary search O(log n)
        pass`,
      go: `package main

func search(nums []int, target int) int {
    return -1
}`,
      typescript: `function search(nums: number[], target: number): number {
  return -1;
}`,
      cpp: `#include <vector>

class Solution {
public:
    int search(std::vector<int>& nums, int target) {
        return -1;
    }
};`,
      java: `class Solution {
    public int search(int[] nums, int target) {
        return -1;
    }
}`,
      rust: `impl Solution {
    pub fn search(nums: Vec<i32>, target: i32) -> i32 {
        -1
    }
}`,
    },
    testCases: [
      {
        id: 'tc-1',
        input: 'nums = [4,5,6,7,0,1,2], target = 0',
        expectedOutput: '4',
      },
      {
        id: 'tc-2',
        input: 'nums = [4,5,6,7,0,1,2], target = 3',
        expectedOutput: '-1',
      },
      {
        id: 'tc-3',
        input: 'nums = [1], target = 0',
        expectedOutput: '-1',
      },
    ],
  },

  // =========================================================================
  // 9. MAXIMUM SUBARRAY (Medium)
  // =========================================================================
  {
    id: 'prob-maximum-subarray',
    slug: 'maximum-subarray',
    title: '53. Maximum Subarray',
    difficulty: 'Medium',
    acceptance: '50.7%',
    companies: ['Amazon', 'Microsoft', 'Apple', 'LinkedIn', 'Cisco'],
    tags: ['Array', 'Divide and Conquer', 'Dynamic Programming'],
    description: `Given an integer array \`nums\`, find the subarray with the largest sum, and return *its sum*.`,
    examples: [
      {
        input: 'nums = [-2,1,-3,4,-1,2,1,-5,4]',
        output: '6',
        explanation: 'The subarray [4,-1,2,1] has the largest sum 6.',
      },
      {
        input: 'nums = [1]',
        output: '1',
        explanation: 'The subarray [1] has the largest sum 1.',
      },
      {
        input: 'nums = [5,4,-1,7,8]',
        output: '23',
        explanation: 'The subarray [5,4,-1,7,8] has the largest sum 23.',
      },
    ],
    constraints: [
      '1 <= nums.length <= 10^5',
      '-10^4 <= nums[i] <= 10^4',
    ],
    starterCode: {
      python: `from typing import List

class Solution:
    def maxSubArray(self, nums: List[int]) -> int:
        # Implement Kadane's algorithm O(n)
        pass`,
      go: `package main

func maxSubArray(nums []int) int {
    return 0
}`,
      typescript: `function maxSubArray(nums: number[]): number {
  return 0;
}`,
      cpp: `#include <vector>

class Solution {
public:
    int maxSubArray(std::vector<int>& nums) {
        return 0;
    }
};`,
      java: `class Solution {
    public int maxSubArray(int[] nums) {
        return 0;
    }
}`,
      rust: `impl Solution {
    pub fn max_sub_array(nums: Vec<i32>) -> i32 {
        0
    }
}`,
    },
    testCases: [
      {
        id: 'tc-1',
        input: 'nums = [-2,1,-3,4,-1,2,1,-5,4]',
        expectedOutput: '6',
      },
      {
        id: 'tc-2',
        input: 'nums = [1]',
        expectedOutput: '1',
      },
      {
        id: 'tc-3',
        input: 'nums = [5,4,-1,7,8]',
        expectedOutput: '23',
      },
    ],
  },

  // =========================================================================
  // 10. TRAPPING RAIN WATER (Hard)
  // =========================================================================
  {
    id: 'prob-trapping-rain-water',
    slug: 'trapping-rain-water',
    title: '42. Trapping Rain Water',
    difficulty: 'Hard',
    acceptance: '61.2%',
    companies: ['Google', 'Goldman Sachs', 'Meta', 'Amazon', 'Bloomberg'],
    tags: ['Array', 'Two Pointers', 'Dynamic Programming', 'Stack'],
    description: `Given \`n\` non-negative integers representing an elevation map where the width of each bar is \`1\`, compute how much water it can trap after raining.`,
    examples: [
      {
        input: 'height = [0,1,0,2,1,0,1,3,2,1,2,1]',
        output: '6',
        explanation: 'The elevation map traps 6 units of rain water.',
      },
      {
        input: 'height = [4,2,0,3,2,5]',
        output: '9',
        explanation: 'The elevation map traps 9 units of rain water.',
      },
    ],
    constraints: [
      'n == height.length',
      '1 <= n <= 2 * 10^4',
      '0 <= height[i] <= 10^5',
    ],
    starterCode: {
      python: `from typing import List

class Solution:
    def trap(self, height: List[int]) -> int:
        # Implement Two-Pointer or Monotonic Stack O(n)
        pass`,
      go: `package main

func trap(height []int) int {
    return 0
}`,
      typescript: `function trap(height: number[]): number {
  return 0;
}`,
      cpp: `#include <vector>

class Solution {
public:
    int trap(std::vector<int>& height) {
        return 0;
    }
};`,
      java: `class Solution {
    public int trap(int[] height) {
        return 0;
    }
}`,
      rust: `impl Solution {
    pub fn trap(height: Vec<i32>) -> i32 {
        0
    }
}`,
    },
    testCases: [
      {
        id: 'tc-1',
        input: 'height = [0,1,0,2,1,0,1,3,2,1,2,1]',
        expectedOutput: '6',
      },
      {
        id: 'tc-2',
        input: 'height = [4,2,0,3,2,5]',
        expectedOutput: '9',
      },
    ],
  },

  // =========================================================================
  // 11. SLIDING WINDOW MAXIMUM (Hard)
  // =========================================================================
  {
    id: 'prob-2',
    slug: 'sliding-window-maximum',
    title: '239. Sliding Window Maximum',
    difficulty: 'Hard',
    acceptance: '46.8%',
    companies: ['Google', 'Stripe', 'Amazon', 'Meta'],
    tags: ['Array', 'Queue', 'Sliding Window', 'Monotonic Queue'],
    description: `You are given an array of integers \`nums\`, there is a sliding window of size \`k\` which is moving from the very left of the array to the very right. You can only see the \`k\` numbers in the window. Each time the sliding window moves right by one position.

Return *the max sliding window*.`,
    examples: [
      {
        input: 'nums = [1,3,-1,-3,5,3,6,7], k = 3',
        output: '[3,3,5,5,6,7]',
        explanation: `Window position                Max
------------------------     -----
[1  3  -1] -3  5  3  6  7       3
 1 [3  -1  -3] 5  3  6  7       3
 1  3 [-1  -3  5] 3  6  7       5
 1  3  -1 [-3  5  3] 6  7       5
 1  3  -1  -3 [5  3  6] 7       6
 1  3  -1  -3  5 [3  6  7]      7`,
      },
      {
        input: 'nums = [1], k = 1',
        output: '[1]',
        explanation: 'Only one sliding window possible.',
      },
    ],
    constraints: [
      '1 <= nums.length <= 10^5',
      '-10^4 <= nums[i] <= 10^4',
      '1 <= k <= nums.length',
    ],
    starterCode: {
      python: `from collections import deque
from typing import List

class Solution:
    def maxSlidingWindow(self, nums: List[int], k: int) -> List[int]:
        # Implement using monotonic deque
        pass`,
      go: `package main

func maxSlidingWindow(nums []int, k int) []int {
    return nil
}`,
      typescript: `function maxSlidingWindow(nums: number[], k: number): number[] {
  return [];
}`,
      cpp: `#include <vector>
#include <deque>

class Solution {
public:
    std::vector<int> maxSlidingWindow(std::vector<int>& nums, int k) {
        return {};
    }
};`,
      java: `import java.util.*;

class Solution {
    public int[] maxSlidingWindow(int[] nums, int k) {
        return new int[0];
    }
}`,
      rust: `impl Solution {
    pub fn max_sliding_window(nums: Vec<i32>, k: i32) -> Vec<i32> {
        vec![]
    }
}`,
    },
    testCases: [
      {
        id: 'tc-1',
        input: 'nums = [1,3,-1,-3,5,3,6,7], k = 3',
        expectedOutput: '[3,3,5,5,6,7]',
      },
      {
        id: 'tc-2',
        input: 'nums = [1], k = 1',
        expectedOutput: '[1]',
      },
    ],
  },
];

export default CODING_PROBLEMS;
