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
      go: `package main

type LRUCache struct {
    capacity int
}

func Constructor(capacity int) LRUCache {
    return LRUCache{capacity: capacity}
}

func (this *LRUCache) Get(key int) int {
    // Return -1 if not found
    return -1
}

func (this *LRUCache) Put(key int, value int) {
    // Implement O(1) eviction
}`,
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
    // Implement O(1) retrieval
    return -1;
  }

  put(key: number, value: number): void {
    // Implement O(1) insertion & eviction
  }
}`,
      cpp: `#include <unordered_map>
#include <list>

class LRUCache {
private:
    int cap;
    std::list<std::pair<int, int>> lruList;
    std::unordered_map<int, std::list<std::pair<int, int>>::iterator> cacheMap;

public:
    LRUCache(int capacity) : cap(capacity) {}
    
    int get(int key) {
        // Return -1 if not found
        return -1;
    }
    
    void put(int key, int value) {
        // Implement O(1) eviction
    }
};`,
      java: `import java.util.*;

class LRUCache {
    private final int capacity;

    public LRUCache(int capacity) {
        this.capacity = capacity;
    }
    
    public int get(int key) {
        return -1;
    }
    
    public void put(int key, int value) {
        // Implement O(1) eviction
    }
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
    
    fn get(&mut self, key: i32) -> i32 {
        *self.map.get(&key).unwrap_or(&-1)
    }
    
    fn put(&mut self, key: i32, value: i32) {
        self.map.insert(key, value);
    }
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
        input: 'capacity = 2, operations: [put(1,1), put(2,2), put(3,3), get(2)]',
        expectedOutput: '[null, null, null, -1]',
      },
      {
        id: 'tc-3',
        input: 'capacity = 1, operations: [put(2,1), get(2), put(3,2), get(2), get(3)]',
        expectedOutput: '[null, 1, null, -1, 2]',
      },
    ],
  },
  {
    id: 'prob-2',
    slug: 'sliding-window-maximum',
    title: '239. Sliding Window Maximum',
    difficulty: 'Hard',
    acceptance: '46.8%',
    companies: ['Google', 'Stripe', 'Amazon', 'Meta'],
    tags: ['Array', 'Queue', 'Sliding Window', 'Monotonic Queue'],
    description: `You are given an array of integers \`nums\`, there is a sliding window of size \`k\` which is moving from the very left of the array to the very right. You can only see the \`k\` numbers in the window. Each time the sliding window moves right by one position.

Return the max sliding window.`,
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
    ],
    constraints: [
      '1 <= nums.length <= 10^5',
      '-10^4 <= nums[i] <= 10^4',
      '1 <= k <= nums.length',
    ],
    starterCode: {
      go: `func maxSlidingWindow(nums []int, k int) []int {
    // Implement using monotonic deque
    return nil
}`,
      python: `from collections import deque
from typing import List

class Solution:
    def maxSlidingWindow(self, nums: List[int], k: int) -> List[int]:
        # Implement using monotonic deque
        pass`,
      typescript: `function maxSlidingWindow(nums: number[], k: number): number[] {
  // Implement with deque
  return [];
}`,
      cpp: `#include <vector>
#include <deque>

class Solution {
public:
    std::vector<int> maxSlidingWindow(std::vector<int>& nums, int k) {
        // Monotonic queue solution
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
