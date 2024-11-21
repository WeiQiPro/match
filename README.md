# match
A robust pattern matching utility for JavaScript/TypeScript, inspired by Rust's match expressions.

## Features
- 🎯 Exact value matching
- 🔍 Object shape matching with nested patterns
- 📚 Array pattern matching
- 🔒 Type narrowing with TypeScript
- 🏗️ Instance checking
- 📏 Range matching
- ✅ Exhaustiveness checking

## Basic Usage
```typescript
import { match } from '@your-package/match';
// Simple value matching
match(value)
.with(1, v => console.log('One'))
.with(2, v => console.log('Two'))
.otherwise(v => console.log('Something else'));
// Range matching
match(score)
.withRange(90, 100, n => 'A')
.withRange(80, 89, n => 'B')
.withRange(70, 79, n => 'C')
.otherwise(() => 'F');
```

## Advanced Features

### Object Shape Matching

```typescript
type User = { type: 'user'; name: string };
type Admin = { type: 'admin'; permissions: string[] };
type Person = User | Admin;
const handlePerson = (person: Person) =>
match(person)
.withShape({ type: 'user' }, user => Hello, ${user.name})
.withShape({ type: 'admin' }, admin => Admin with ${admin.permissions.length} permissions)
.otherwise(() => 'Unknown person type');
```

### Array Matching

```typescript
match([1, 2, 3])
.withArray({ length: 3, elements: [1, 2, 3] }, arr => 'Exact match')
.withArray({ length: 3 }, arr => 'Any array of length 3')
.otherwise(() => 'No match');
```

### Type Guards and Instance Checking
```typescript
class Dog { bark() { return 'woof'; } }
class Cat { meow() { return 'meow'; } }
match(animal)
.withInstance(Dog, dog => console.log(dog.bark()))
.withInstance(Cat, cat => console.log(cat.meow()))
.otherwise(() => console.log('Unknown animal'));
```

### Exhaustiveness Checking
```typescript
type Direction = 'North' | 'South' | 'East' | 'West';
// This will cause a compile-time error because it's not exhaustive
match(direction)
.with('North', d => 'Going up')
.with('South', d => 'Going down')
// Error: Missing 'East' and 'West' cases
.otherwise(() => 'Other direction');
// Use nonExhaustive() to disable exhaustiveness checking
match(direction)
.nonExhaustive()
.with('North', d => 'Going up')
.with('South', d => 'Going down')
.otherwise(() => 'Other direction');
```

### Combined Patterns
```typescript
const isPositive = (n: number): n is number => n > 0;
const isEven = (n: number): n is number => n % 2 === 0;
match(4)
.withAll([isPositive, isEven], n => {
console.log('Positive even number');
})
.otherwise(() => console.log('Not a positive even number'));
```

## API Reference

### `match<T>(value: T): Match<T>`
Creates a new pattern matching expression.

### Methods
- `with(pattern: T, fn: (value: T) => void): Match<T>`
- `withShape<S>(shape: Partial<S>, fn: (value: T & S) => void): Match<T>`
- `withArray<E>(pattern: ArrayPattern<E>, fn: (value: E[]) => void): Match<T>`
- `withInstance<S>(constructor: new (...args: unknown[]) => S, fn: (value: S) => void): Match<T>`
- `withRange(start: number, end: number, fn: (value: number) => void): Match<T>`
- `withAll<S extends T>(patterns: Array<(value: T) => value is S>, fn: (value: S) => void): Match<T>`
- `withAny<S extends T>(patterns: Array<(value: T) => value is S>, fn: (value: S) => void): Match<T>`
- `otherwise(fn: (value: T) => void): void`
- `nonExhaustive(): Match<T>`

## TypeScript Support
This library is written in TypeScript and provides full type safety and inference. It includes:
- Generic type parameters
- Type narrowing
- Exhaustiveness checking
- Type guard support

## Contributing
Contributions are welcome! Please feel free to submit a Pull Request.

## License
No License
This code is free to use, modify, and distribute without attribution.
The author(s) take no responsibility for its maintenance or any issues arising from its use.
Do whatever you want with it.
