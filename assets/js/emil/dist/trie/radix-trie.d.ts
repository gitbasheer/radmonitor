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
export declare class RadixTrie<T> {
    private root;
    private size;
    constructor();
    private createNode;
    /**
     * Insert a key-value pair into the trie
     */
    insert(key: string, value: T): void;
    /**
     * Search for exact match
     */
    search(key: string): T | undefined;
    /**
     * Find all keys with given prefix
     * Returns results sorted by frequency and relevance
     */
    prefixSearch(prefix: string, maxResults?: number): SearchResult<T>[];
    /**
     * Fuzzy search with scoring
     */
    fuzzySearch(query: string, maxResults?: number): SearchResult<T>[];
    private fuzzySearchHelper;
    private calculateFuzzyScore;
    private findNode;
    private collectAllWords;
    /**
     * Get all keys in the trie
     */
    getAllKeys(): string[];
    private getAllKeysHelper;
    /**
     * Update frequency for a key (for hot EID tracking)
     */
    updateFrequency(key: string, increment?: number): void;
    getSize(): number;
    clear(): void;
}
//# sourceMappingURL=radix-trie.d.ts.map