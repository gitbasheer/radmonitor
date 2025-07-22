/**
 * RadixTrie implementation for sub-millisecond EID search
 * Optimized for GoDaddy's RAD naming patterns
 */

export interface TrieNode<T> {
  children: Map<string, TrieNode<T>>;
  isEnd: boolean;
  value?: T;
  frequency: number;
}

export interface SearchResult<T> {
  key: string;
  value: T;
  score: number;
}

export class RadixTrie<T> {
  private root: TrieNode<T>;
  private size: number;

  constructor() {
    this.root = this.createNode();
    this.size = 0;
  }

  private createNode(): TrieNode<T> {
    return {
      children: new Map(),
      isEnd: false,
      frequency: 0
    };
  }

  /**
   * Insert a key-value pair into the trie
   */
  insert(key: string, value: T): void {
    if (!key) return;

    let node = this.root;
    const chars = key.split('');

    for (const char of chars) {
      if (!node.children.has(char)) {
        node.children.set(char, this.createNode());
      }
      node = node.children.get(char)!;
      node.frequency++;
    }

    if (!node.isEnd) {
      this.size++;
    }
    
    node.isEnd = true;
    node.value = value;
  }

  /**
   * Search for exact match
   */
  search(key: string): T | undefined {
    const node = this.findNode(key);
    return node?.isEnd ? node.value : undefined;
  }

  /**
   * Find all keys with given prefix
   * Returns results sorted by frequency and relevance
   */
  prefixSearch(prefix: string, maxResults: number = 10): SearchResult<T>[] {
    const results: SearchResult<T>[] = [];
    const prefixNode = this.findNode(prefix);

    if (!prefixNode) {
      return results;
    }

    // If prefix itself is a complete key
    if (prefixNode.isEnd && prefixNode.value) {
      results.push({
        key: prefix,
        value: prefixNode.value,
        score: 100 + prefixNode.frequency
      });
    }

    // DFS to find all completions
    this.collectAllWords(prefixNode, prefix, results, maxResults);

    // Sort by score (frequency + relevance)
    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, maxResults);
  }

  /**
   * Fuzzy search with scoring
   */
  fuzzySearch(query: string, maxResults: number = 10): SearchResult<T>[] {
    const results: SearchResult<T>[] = [];
    const queryLower = query.toLowerCase();

    this.fuzzySearchHelper(this.root, '', queryLower, 0, results);

    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, maxResults);
  }

  private fuzzySearchHelper(
    node: TrieNode<T>,
    currentKey: string,
    query: string,
    queryIndex: number,
    results: SearchResult<T>[]
  ): void {
    if (node.isEnd && node.value) {
      const score = this.calculateFuzzyScore(currentKey, query);
      if (score > 0) {
        results.push({
          key: currentKey,
          value: node.value,
          score: score + node.frequency * 0.1
        });
      }
    }

    for (const [char, childNode] of node.children) {
      const newKey = currentKey + char;
      
      // Continue if character matches or we haven't exhausted query
if (queryIndex < query.length && query[queryIndex] && char.toLowerCase() === query[queryIndex].toLowerCase()) {
        this.fuzzySearchHelper(childNode, newKey, query, queryIndex + 1, results);
      } else {
        this.fuzzySearchHelper(childNode, newKey, query, queryIndex, results);
      }
    }
  }

  private calculateFuzzyScore(key: string, query: string): number {
    const keyLower = key.toLowerCase();
    const queryLower = query.toLowerCase();

    // Exact match
    if (keyLower === queryLower) return 100;

    // Starts with
    if (keyLower.startsWith(queryLower)) return 90;

    // Contains at word boundary
    const wordBoundaryIndex = keyLower.search(new RegExp(`\\b${queryLower}`));
    if (wordBoundaryIndex !== -1) return 80 - wordBoundaryIndex;

    // Contains anywhere
    if (keyLower.includes(queryLower)) {
      const index = keyLower.indexOf(queryLower);
      return 70 - index;
    }

    // Character-by-character matching
    let matchCount = 0;
    let queryIndex = 0;
    for (let i = 0; i < keyLower.length && queryIndex < queryLower.length; i++) {
      if (keyLower[i] === queryLower[queryIndex]) {
        matchCount++;
        queryIndex++;
      }
    }

    if (matchCount === queryLower.length) {
      return 60 - (keyLower.length - queryLower.length);
    }

    return 0;
  }

  private findNode(key: string): TrieNode<T> | null {
    let node = this.root;
    const chars = key.split('');

    for (const char of chars) {
      if (!node.children.has(char)) {
        return null;
      }
      node = node.children.get(char)!;
    }

    return node;
  }

  private collectAllWords(
    node: TrieNode<T>,
    prefix: string,
    results: SearchResult<T>[],
    maxResults: number
  ): void {
    if (results.length >= maxResults) return;

    for (const [char, childNode] of node.children) {
      const newPrefix = prefix + char;

      if (childNode.isEnd && childNode.value) {
        results.push({
          key: newPrefix,
          value: childNode.value,
          score: childNode.frequency
        });
      }

      if (results.length < maxResults) {
        this.collectAllWords(childNode, newPrefix, results, maxResults);
      }
    }
  }

  /**
   * Get all keys in the trie
   */
  getAllKeys(): string[] {
    const keys: string[] = [];
    this.getAllKeysHelper(this.root, '', keys);
    return keys;
  }

  private getAllKeysHelper(node: TrieNode<T>, prefix: string, keys: string[]): void {
    if (node.isEnd) {
      keys.push(prefix);
    }

    for (const [char, childNode] of node.children) {
      this.getAllKeysHelper(childNode, prefix + char, keys);
    }
  }

  /**
   * Update frequency for a key (for hot EID tracking)
   */
  updateFrequency(key: string, increment: number = 1): void {
    let node = this.root;
    const chars = key.split('');

    for (const char of chars) {
      if (!node.children.has(char)) {
        return;
      }
      node = node.children.get(char)!;
      node.frequency += increment;
    }
  }

  getSize(): number {
    return this.size;
  }

  clear(): void {
    this.root = this.createNode();
    this.size = 0;
  }
}