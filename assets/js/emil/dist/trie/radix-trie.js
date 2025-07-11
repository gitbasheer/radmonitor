/**
 * RadixTrie implementation for sub-millisecond EID search
 * Optimized for GoDaddy's RAD naming patterns
 */
export class RadixTrie {
    constructor() {
        this.root = this.createNode();
        this.size = 0;
    }
    createNode() {
        return {
            children: new Map(),
            isEnd: false,
            frequency: 0
        };
    }
    /**
     * Insert a key-value pair into the trie
     */
    insert(key, value) {
        if (!key)
            return;
        let node = this.root;
        const chars = key.split('');
        for (const char of chars) {
            if (!node.children.has(char)) {
                node.children.set(char, this.createNode());
            }
            node = node.children.get(char);
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
    search(key) {
        const node = this.findNode(key);
        return node?.isEnd ? node.value : undefined;
    }
    /**
     * Find all keys with given prefix
     * Returns results sorted by frequency and relevance
     */
    prefixSearch(prefix, maxResults = 10) {
        const results = [];
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
    fuzzySearch(query, maxResults = 10) {
        const results = [];
        const queryLower = query.toLowerCase();
        this.fuzzySearchHelper(this.root, '', queryLower, 0, results);
        return results
            .sort((a, b) => b.score - a.score)
            .slice(0, maxResults);
    }
    fuzzySearchHelper(node, currentKey, query, queryIndex, results) {
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
            }
            else {
                this.fuzzySearchHelper(childNode, newKey, query, queryIndex, results);
            }
        }
    }
    calculateFuzzyScore(key, query) {
        const keyLower = key.toLowerCase();
        const queryLower = query.toLowerCase();
        // Exact match
        if (keyLower === queryLower)
            return 100;
        // Starts with
        if (keyLower.startsWith(queryLower))
            return 90;
        // Contains at word boundary
        const wordBoundaryIndex = keyLower.search(new RegExp(`\\b${queryLower}`));
        if (wordBoundaryIndex !== -1)
            return 80 - wordBoundaryIndex;
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
    findNode(key) {
        let node = this.root;
        const chars = key.split('');
        for (const char of chars) {
            if (!node.children.has(char)) {
                return null;
            }
            node = node.children.get(char);
        }
        return node;
    }
    collectAllWords(node, prefix, results, maxResults) {
        if (results.length >= maxResults)
            return;
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
    getAllKeys() {
        const keys = [];
        this.getAllKeysHelper(this.root, '', keys);
        return keys;
    }
    getAllKeysHelper(node, prefix, keys) {
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
    updateFrequency(key, increment = 1) {
        let node = this.root;
        const chars = key.split('');
        for (const char of chars) {
            if (!node.children.has(char)) {
                return;
            }
            node = node.children.get(char);
            node.frequency += increment;
        }
    }
    getSize() {
        return this.size;
    }
    clear() {
        this.root = this.createNode();
        this.size = 0;
    }
}
//# sourceMappingURL=radix-trie.js.map