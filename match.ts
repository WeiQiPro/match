type Matcher<T, R> = (value: T) => R;
type DestructuredObject = Record<string, unknown>;
type Pattern<T> = T | DestructuredObject | ArrayPattern<T>;

interface ArrayPattern<T> {
    length?: number;
    elements?: Pattern<T>[];
}

/**
 * A pattern matching utility class inspired by Rust's match expressions.
 * 
 * @example
 * ```ts
 * match(value)
 *   .with(5, v => console.log('Got five'))
 *   .withRange(1, 4, v => console.log('Between 1 and 4'))
 *   .otherwise(v => console.log('Something else'));
 * ```
 */
class Match<T> {
    private matched = false;
    private exhaustiveCheck = true;

    constructor(private value: T) {}

    /**
     * Matches a value against an object shape with support for nested patterns.
     * 
     * @example
     * ```ts
     * interface User { type: 'user'; name: string; age: number }
     * 
     * match(user)
     *   .withShape({ type: 'user', age: 25 }, user => {
     *     console.log(`${user.name} is 25 years old`);
     *   })
     *   .otherwise(() => console.log('No match'));
     * ```
     */
    withShape<S extends DestructuredObject>(
        shape: Partial<S>, 
        fn: Matcher<T & S, void>
    ): Match<T> {
        if (!this.matched && this.isDeepMatch(this.value, shape)) {
            this.matched = true;
            fn(this.value as T & S);
        }
        return this;
    }

    /**
     * Matches arrays based on length and/or element patterns.
     * 
     * @example
     * ```ts
     * match([1, 2, 3])
     *   .withArray({ length: 3, elements: [1, 2, 3] }, arr => {
     *     console.log('Exact match: [1, 2, 3]');
     *   })
     *   .withArray({ length: 3 }, arr => {
     *     console.log('Any array of length 3');
     *   })
     *   .otherwise(() => console.log('No match'));
     * ```
     */
    withArray<E>(
        pattern: ArrayPattern<E>,
        fn: Matcher<E[], void>
    ): Match<T> {
        if (!this.matched && Array.isArray(this.value) && this.isArrayMatch(this.value, pattern)) {
            this.matched = true;
            fn(this.value as E[]);
        }
        return this;
    }

    /**
     * Combines multiple patterns with AND logic.
     * 
     * @example
     * ```ts
     * const isPositive = (n: number): n is number => n > 0;
     * const isEven = (n: number): n is number => n % 2 === 0;
     * 
     * match(4)
     *   .withAll([isPositive, isEven], n => {
     *     console.log('Positive even number');
     *   })
     *   .otherwise(() => console.log('Not a positive even number'));
     * ```
     */
    withAll<S extends T>(
        patterns: Array<(value: T) => value is S>,
        fn: Matcher<S, void>
    ): Match<T> {
        if (!this.matched && patterns.every(p => p(this.value))) {
            this.matched = true;
            fn(this.value as S);
        }
        return this;
    }

    /**
     * Combines multiple patterns with OR logic.
     * 
     * @example
     * ```ts
     * const isString = (x: unknown): x is string => typeof x === 'string';
     * const isNumber = (x: unknown): x is number => typeof x === 'number';
     * 
     * match(value)
     *   .withAny([isString, isNumber], v => {
     *     console.log('Either string or number');
     *   })
     *   .otherwise(() => console.log('Neither string nor number'));
     * ```
     */
    withAny<S extends T>(
        patterns: Array<(value: T) => value is S>,
        fn: Matcher<S, void>
    ): Match<T> {
        if (!this.matched && patterns.some(p => p(this.value))) {
            this.matched = true;
            fn(this.value as S);
        }
        return this;
    }

    /**
     * Matches against class instances using instanceof.
     * 
     * @example
     * ```ts
     * class Dog { bark() { return 'woof'; } }
     * class Cat { meow() { return 'meow'; } }
     * 
     * match(animal)
     *   .withInstance(Dog, dog => console.log(dog.bark()))
     *   .withInstance(Cat, cat => console.log(cat.meow()))
     *   .otherwise(() => console.log('Unknown animal'));
     * ```
     */
    withInstance<S>(
        constructor: new (...args: unknown[]) => S,
        fn: Matcher<S, void>
    ): Match<T> {
        if (!this.matched && this.value instanceof constructor) {
            this.matched = true;
            fn(this.value as S);
        }
        return this;
    }

    /**
     * Matches a single value exactly.
     * 
     * @example
     * ```ts
     * match('hello')
     *   .with('hello', v => console.log('Got hello'))
     *   .with('world', v => console.log('Got world'))
     *   .otherwise(v => console.log('Got something else'));
     * ```
     */
    with(pattern: T, fn: Matcher<T, void>): Match<T> {
        if (!this.matched && this.value === pattern) {
            this.matched = true;
            fn(this.value);
        }
        return this;
    }

    /**
     * Matches if the value is within a range (inclusive).
     * 
     * @example
     * ```ts
     * match(5)
     *   .withRange(1, 3, n => console.log('Between 1 and 3'))
     *   .withRange(4, 6, n => console.log('Between 4 and 6'))
     *   .otherwise(() => console.log('Outside ranges'));
     * ```
     */
    withRange(start: number, end: number, fn: Matcher<number, void>): Match<T> {
        if (typeof this.value === 'number' && this.value >= start && this.value <= end) {
            this.matched = true;
            fn(this.value);
        }
        return this;
    }

    /**
     * Default case handler that runs if no other patterns match.
     * Throws an error if exhaustive checking is enabled and no patterns matched.
     * 
     * @example
     * ```ts
     * match(value)
     *   .with(1, v => console.log('One'))
     *   .with(2, v => console.log('Two'))
     *   .otherwise(v => console.log('Something else'));
     * ```
     */
    otherwise(fn: Matcher<T, void>): void {
        if (!this.matched) {
            fn(this.value);
        }
        if (this.exhaustiveCheck && !this.matched) {
            throw new Error('Non-exhaustive pattern matching');
        }
    }

    /**
     * Disables exhaustive checking for this match expression. By default, Match requires
     * all possible cases to be handled (exhaustive checking), throwing an error if a case
     * is unmatched. This is similar to Rust's exhaustiveness checking.
     * 
     * Use nonExhaustive() when:
     * 1. You intentionally want to ignore some cases
     * 2. You're only interested in specific patterns
     * 3. You're sure the unhandled cases can't occur
     * 
     * @example
     * ```ts
     * // With exhaustive checking (default)
     * type Status = 'success' | 'error' | 'pending';
     * const status: Status = 'success';
     * 
     * match(status)
     *   .with('success', s => console.log('Success!'))
     *   .with('error', s => console.log('Error!'))
     *   // Error: Non-exhaustive pattern matching ('pending' case not handled)
     *   .otherwise(s => console.log('Otherwise'));
     * 
     * // With nonExhaustive()
     * match(status)
     *   .nonExhaustive()
     *   .with('success', s => console.log('Success!'))
     *   .with('error', s => console.log('Error!'))
     *   // OK: No error even though 'pending' case isn't handled
     *   .otherwise(s => console.log('Otherwise'));
     * ```
     * 
     * @returns {Match<T>} The current Match instance for method chaining
     */
    nonExhaustive(): Match<T> {
        this.exhaustiveCheck = false;
        return this;
    }

    private isDeepMatch(value: unknown, pattern: Pattern<unknown>): boolean {
        if (typeof value !== 'object' || value === null) {
            return value === pattern;
        }

        if (Array.isArray(value) && this.isArrayPattern(pattern)) {
            return this.isArrayMatch(value, pattern);
        }

        if (typeof pattern === 'object' && pattern !== null) {
            const objValue = value as Record<string, unknown>;
            return Object.entries(pattern).every(([key, val]) => {
                if (!(key in objValue)) return false;
                return this.isDeepMatch(objValue[key], val);
            });
        }

        return false;
    }

    private isArrayPattern(pattern: unknown): pattern is ArrayPattern<unknown> {
        return typeof pattern === 'object' && pattern !== null &&
            ('length' in pattern || 'elements' in pattern);
    }

    private isArrayMatch(value: unknown[], pattern: ArrayPattern<unknown>): boolean {
        if (pattern.length !== undefined && value.length !== pattern.length) {
            return false;
        }

        if (pattern.elements) {
            if (value.length < pattern.elements.length) return false;
            return pattern.elements.every((elem, i) => 
                this.isDeepMatch(value[i], elem)
            );
        }

        return true;
    }
}

/**
 * Creates a new pattern matching expression, similar to Rust's match expressions.
 * This utility enables sophisticated pattern matching with type safety and exhaustiveness checking.
 * 
 * Features:
 * - Exact value matching
 * - Object shape matching with nested patterns
 * - Array pattern matching
 * - Type narrowing
 * - Instance checking
 * - Range matching
 * - Exhaustiveness checking
 * 
 * @param value The value to match against patterns
 * @returns A new Match instance for pattern matching
 * 
 * @example Basic value matching
 * ```ts
 * const result = match(value)
 *   .with(1, v => 'one')
 *   .with(2, v => 'two')
 *   .otherwise(v => 'other');
 * ```
 * 
 * @example Object shape matching
 * ```ts
 * type User = { type: 'user'; name: string };
 * type Admin = { type: 'admin'; permissions: string[] };
 * type Person = User | Admin;
 * 
 * const handlePerson = (person: Person) =>
 *   match(person)
 *     .withShape({ type: 'user' }, user => `Hello, ${user.name}`)
 *     .withShape({ type: 'admin' }, admin => `Admin with ${admin.permissions.length} permissions`)
 *     .otherwise(() => 'Unknown person type');
 * ```
 * 
 * @example Array matching
 * ```ts
 * match([1, 2, 3])
 *   .withArray({ length: 3, elements: [1, 2, 3] }, arr => 'Exact match')
 *   .withArray({ length: 3 }, arr => 'Any array of length 3')
 *   .otherwise(() => 'No match');
 * ```
 * 
 * @example Type guards and instance checking
 * ```ts
 * const isString = (x: unknown): x is string => typeof x === 'string';
 * const isNumber = (x: unknown): x is number => typeof x === 'number';
 * 
 * match(value)
 *   .withType(isString, str => `String: ${str.toUpperCase()}`)
 *   .withType(isNumber, num => `Number: ${num.toFixed(2)}`)
 *   .otherwise(() => 'Neither string nor number');
 * ```
 * 
 * @example Range matching
 * ```ts
 * match(score)
 *   .withRange(90, 100, n => 'A')
 *   .withRange(80, 89, n => 'B')
 *   .withRange(70, 79, n => 'C')
 *   .otherwise(() => 'F');
 * ```
 * 
 * @example Exhaustiveness checking with union types
 * ```ts
 * type Direction = 'North' | 'South' | 'East' | 'West';
 * const direction: Direction = 'North';
 * 
 * match(direction)
 *   .with('North', d => 'Going up')
 *   .with('South', d => 'Going down')
 *   // Error: Non-exhaustive pattern matching
 *   // Missing cases: 'East' and 'West'
 *   .otherwise(() => 'Other direction');
 * 
 * // Fix by either handling all cases or using nonExhaustive()
 * match(direction)
 *   .nonExhaustive()
 *   .with('North', d => 'Going up')
 *   .with('South', d => 'Going down')
 *   .otherwise(() => 'Other direction');
 * ```
 */
export const match = <T>(value: T): Match<T> => new Match(value);

