---
title: "Your AI Agent Will Write `amount: number`. Here's Why That's a Problem."
description: "Part 1 of “Made Unrepresentable” — a series checking whether the first principles behind academic type systems can earn their place in mainstream code."
series: "Made Unrepresentable"
part: 1
pubDate: 2026-06-29
tags: [typescript, type-driven-design, functional-programming, software-design]
draft: false
---

# Your AI Agent Will Write `amount: number`. Here's Why That's a Problem.

*Part 1 of "Made Unrepresentable" — a series checking whether the first principles behind academic type systems can earn their place in mainstream code.*

## The bug nobody reviewed

It's Friday. 5 PM. It's been a tough week, full of production deployments fed by an avalanche of agent-created code. A new pull request comes in. A new `transfer` endpoint. The diff is small, the tests pass, CI is green. Nothing about it looks different from the hundred other diffs this week. Somewhere, the body of the function reads:

```typescript
function transfer(sourceAccountId: string, destinationAccountId: string, amount: number) {
  // ...
}
```

It looks fine. It *is* fine, most of the time. Then, months later, a client calls it with `amount: -500`. Nothing in the type signature stopped them. This is the kind of check that's easy to *assume* is handled somewhere — surely the agent added a guard, surely someone would catch this in review. But a diff this small, in a queue this long, on a Friday afternoon, doesn't announce what it's missing. There's no red flag in a clean-looking function that simply never considered the case. Depending on what's downstream, that's either a crash, a silent corruption, or — worse — a transfer that quietly succeeds in a state that should never have existed.

This isn't a hypothetical bred in a classroom. It's the most common shape of bug in financial code: a value that was *possible* to construct but was never supposed to exist. The type system had every opportunity to make it impossible and didn't, because nobody asked it to.

Here's what makes this moment different from five years ago: that function signature above is exactly what a coding agent generates by default, instantly, indistinguishable from what a human would write under deadline pressure. The agent isn't being careless. It's matching the dominant style in its training distribution — and the dominant style treats `number` as a valid representation of "amount of money," because almost everyone does.

The agent will write the bug as confidently as it writes everything else. The pull request will look clean. The reviewer, under their own pressure to keep the queue moving, will likely approve it. Nobody in that loop was wrong to do their job the way they did it. The gap is structural, not personal.

But there is a way to close that gap before the code is ever written — not by reviewing harder, or adding more defensive lines that throw errors here and there; but by making the bug impossible to express in the first place.

## Make the illegal state unrepresentable

The idea isn't new. It has a name and a lineage: **type-driven design**, and its sharpest summary is a phrase from [Alexis King](https://lexi-lambda.github.io/) — *parse, don't validate*. The companion idea, popularized for working developers by Richard Feldman, is just as direct: **make impossible states impossible**.

The core move is simple to state and surprisingly disciplined to practice: instead of accepting a loosely-typed value and checking it's valid every time you use it, you check it *once*, at the boundary, and from that point on the type itself is the proof. A `number` can be negative. A `PositiveNumber` — a type that can only be constructed by a function that already checked — cannot. The compiler doesn't trust your comment saying "this should always be positive." It trusts a type it can verify.

This is the discipline behind dependently-typed languages like Idris, where the type system can express constraints rich enough to make entire categories of bugs not compile. Most production languages don't have that machinery. But the question worth asking honestly — not as marketing, as an actual experiment — is how far the *spirit* of that discipline travels into a language nobody needs permission to use: TypeScript, sitting on top of JavaScript, the most-used language in the world.

That's the premise of this series. Not "rewrite your stack in Idris." Check whether the underlying principle survives the trip into the language you already use, and be honest about where it doesn't.

## The case study: a small currency command language

To test the idea against something concrete, I built a tiny slice of a payments domain — five commands a caller might issue: open an account, close an account, transfer funds, convert currency, request a payment. Deliberately small. Deliberately *not* a payments platform.

The constraint that made it useful as a test: each command is **data**, not a function. A `TransferCommand` doesn't execute anything — it's a description of an intention, sitting inert until something else (an interpreter) decides what to do with it. That separation is what later lets the same command run through multiple interpreters — execute it, log it, dry-run it, document it — without rewriting anything. It's also what keeps the type-level story clean: there's no need to reason about sequencing or control flow yet, only about whether a given piece of data can represent something that shouldn't exist.

Two invariants turned out to be worth modeling carefully:

1. **Not every currency is legal in every jurisdiction.** A whitelist problem.
2. **A transfer amount cannot be negative.** A constraint on a single value, not a combination of fields.

These two needed genuinely different techniques — which is the whole point of choosing them.

## Building it: the whitelist problem

The naive encoding is two independent enums — `Jurisdiction` and `Currency` — combined freely. That's wrong on day one: some pairings are illegal (a regulator might not recognize a given currency in a given jurisdiction), and nothing in two separate string unions can express that the *pairing* is the constraint, not the individual values.

The fix is to derive both types from a single source of truth — a `const` array describing every *valid pairing*, with everything else implicitly banned:

```typescript
const ALLOWED_ACCOUNT_SETUPS = [
  { jurisdiction: "US", currency: "USD" },
  { jurisdiction: "IT", currency: "USD" },
  { jurisdiction: "IN", currency: "USD" },
  { jurisdiction: "CA", currency: "USD" },
  { jurisdiction: "US", currency: "EUR" },
  { jurisdiction: "IT", currency: "EUR" },
  { jurisdiction: "IN", currency: "EUR" },
  { jurisdiction: "CA", currency: "EUR" },
  { jurisdiction: "US", currency: "CAD" },
  { jurisdiction: "IT", currency: "CAD" },
  { jurisdiction: "CA", currency: "CAD" },
  // note: IN + CAD is deliberately absent
] as const;

type AccountSetup = (typeof ALLOWED_ACCOUNT_SETUPS)[number];
type Jurisdiction = (typeof ALLOWED_ACCOUNT_SETUPS)[number]["jurisdiction"];
type Currency = (typeof ALLOWED_ACCOUNT_SETUPS)[number]["currency"];
```

`AccountSetup` is now the union of exactly the eleven valid pairings — nothing more. `Jurisdiction` and `Currency` are derived from the same array, so there's a single place to update if a regulatory rule changes. No duplication, no risk of the enum and the validation logic drifting apart, because there is no separate validation logic — the type *is* the rule.

The command itself is plain data with a discriminant tag — the shape that later makes it a proper member of a discriminated union alongside the other four commands:

```typescript
type CreateAccountCommand = {
  action: "create_account";
  ownerId: string;
  setup: AccountSetup;
};

const validCommand: CreateAccountCommand = {
  action: "create_account",
  ownerId: "John Doe - 1234567HHH",
  setup: { jurisdiction: "IN", currency: "EUR" },
};
```

Attempt the banned pairing and the compiler stops you before the program runs:

```typescript
const invalidCommand: CreateAccountCommand = {
  action: "create_account",
  ownerId: "John Doe - 1234567HHH",
  setup: { jurisdiction: "IN", currency: "CAD" },
};
// Type '"CAD"' is not assignable to type '"USD" | "EUR"'.
```

No `if` statement checked this. No test caught it. The combination simply has no type that describes it, so there is no way to write it down.

## Building it: the single-value constraint

The jurisdiction/currency pairing is a *structural* invariant — about how fields combine. A transfer amount is a different kind of problem entirely: a constraint on a single value, and TypeScript's structural typing makes this trickier than it looks. Two `number`s are always interchangeable to the compiler, whether or not either one was ever checked. There is no way to tell, from the type alone, "this particular number has been validated as positive" from "this one hasn't."

The technique that solves this is a **branded type** — attaching a phantom marker that exists only at compile time, just enough to make an otherwise identical type distinct:

```typescript
type PositiveNumber = number & { readonly _brand: "PositiveNumber" };
```

No object ever actually carries a `_brand` field at runtime. It vanishes on compilation. Its only job is to make `PositiveNumber` a type the compiler will *not* silently accept a plain `number` into.

The only way to produce one is through a constructor that performs the real check once, and casts:

```typescript
type AppError = { _kind: "app_error"; msg: string };

function mkPositiveNumber(n: number): PositiveNumber | AppError {
  return n > 0
    ? (n as PositiveNumber)
    : { _kind: "app_error", msg: `${n} is not a positive amount` };
}

function isAppError(e: unknown): e is AppError {
  return typeof e === "object" && e !== null && "_kind" in e && (e as any)._kind === "app_error";
}
```

`AppError` needs its own discriminant — `_kind` — for the opposite reason `PositiveNumber`'s brand has no runtime trace: this type *does* need to be told apart from other values at runtime, so the tag has to actually exist on the object. The brand is a compile-time-only fiction; the error tag is a real, checkable field. Two techniques, deployed for two different needs, in the same ten lines.

Once a value clears `mkPositiveNumber`, the command that holds it is unconditionally safe to construct:

```typescript
type TransferCommand = {
  sourceAccountId: string;
  destinationAccountId: string;
  amount: PositiveNumber;
};

const validAmount = mkPositiveNumber(100);

if (!isAppError(validAmount)) {
  const validTransferCommand: TransferCommand = {
    sourceAccountId: "acc1",
    destinationAccountId: "acc2",
    amount: validAmount, // narrowed to PositiveNumber here
  };
} else {
  // validAmount is narrowed to AppError in this branch —
  // the line below will not compile, by construction:
  //
  // const invalidTransferCommand: TransferCommand = {
  //   sourceAccountId: "acc1",
  //   destinationAccountId: "acc2",
  //   amount: validAmount,
  // };
}
```

Inside the `else` branch, the compiler has narrowed `validAmount` to `AppError`. Trying to use it where a `PositiveNumber` is required is not a runtime failure waiting to happen in production — it's a line that cannot be written. The negative-amount bug from the opening of this post has nowhere to hide.

## What this actually buys you

The headline payoff is the one already shown twice: an entire category of bug becomes a compiler error instead of a production incident. That's not a small thing in a domain where the incident is somebody's money.

There's a second, quieter payoff worth naming. Once `PositiveNumber` and `AccountSetup` exist as real types, the editor starts doing more of the thinking for you. Autocomplete only offers jurisdiction/currency pairs that are actually legal. A function expecting `PositiveNumber` makes it visibly, immediately obvious — without reading a single comment — that negative values were considered and excluded on purpose. The API becomes harder to misuse not because anyone wrote a warning, but because the wrong usage doesn't typecheck. Documentation rots. Types don't, as long as the build is green.

## Where it leaks — and it does

None of this is free, and an honest account has to say where the floor gives out.

**The runtime boundary is the real edge.** Every guarantee above holds *inside* TypeScript's static world. The instant a jurisdiction code or an amount arrives from outside — an HTTP request, a form, a row from a database — it's an untyped string or number again, and the compiler has nothing to say about it. Something has to parse and validate at that boundary; this is exactly the job libraries like Zod already do well, and there's no reason to reinvent it. The branded type doesn't replace that step. It's what the validated value becomes *after* that step, so the proof can travel inward instead of being re-checked at every function call.

**The invariant is implicit, not visible.** Look again at `ALLOWED_ACCOUNT_SETUPS`: India paired with Canadian dollars is invalid because it's *absent* from the list — there's no line of code anywhere that says why. A reviewer encountering this for the first time has to know to ask "what's missing?" rather than "what's wrong?" A blacklist would name the rule explicitly but can't be enforced by the compiler unless it's known statically — and a real compliance blacklist usually isn't; it lives in a database and changes on a timeline the type system cannot see. The whitelist is the only version the compiler can check, and that constrains how the rule has to be expressed, not just how it's implemented.

**The proof rests entirely on one cast.** `n as PositiveNumber` is the single point in this whole design where the type system is told to trust a claim it cannot itself verify. If `mkPositiveNumber` had a bug — an off-by-one, a wrong comparison — every `PositiveNumber` in the system would silently be lying, and nothing would warn you. The type system doesn't eliminate the need for correct runtime logic. It narrows *where* that logic has to be correct down to one small, auditable place, instead of scattering the same check across every call site that touches an amount.

**Some invariants simply don't live here.** Whether an account is already closed, whether a source account actually has the balance to cover a transfer — none of that is available at the point a command is constructed. It's state, and state belongs to whatever interprets the command, not to the command's type. Forcing it into the type would be dishonest; the type system should claim exactly the guarantees it can keep.

**And the trade-off itself is real, not rhetorical.** This is more machinery than `amount: number`. For a CRUD form with low stakes and short shelf life, this is almost certainly the wrong amount of ceremony. The case for paying this cost gets stronger exactly in proportion to two things: how expensive a violated invariant actually is, and how long the code is expected to live and be extended by people who didn't write it. A payments API, a library other teams build on, a protocol implementation — different calculus than an internal admin tool nobody will touch again in six months.

## This is not anti-agent. It's pro-judgment.

None of the above requires turning away from AI-assisted development, and that's worth being explicit about, because it's easy to mistake an argument for careful types as an argument for writing everything by hand.

An agent can absolutely generate code against `AccountSetup` and `PositiveNumber` once they exist. It can extend the command language, add the next command, even propose new branded types by following the pattern already established in the file. What it's far less likely to do *unprompted* is decide, on its own initiative, that "amount" deserves to be its own type in the first place — because the overwhelmingly common shape in its training data is `amount: number`, and matching the common shape is what these models are good at. The decision that a category of error is worth this much ceremony is a judgment call about a specific domain's stakes. That judgment is the part that doesn't show up for free.

Put differently: the constraint isn't a wall against automation, it's a rail the automation runs on. Once the type exists, every subsequent line — human-written or agent-written — has to satisfy it. The discipline doesn't compete with agentic speed. It directs it.

## The actual claim

This is a small case study, deliberately. Five commands, two invariants, a handful of techniques most TypeScript developers have at least encountered, recombined toward an end most don't reach for by default.

The claim isn't that every codebase needs this. It's narrower and, I think, more defensible: the judgment to know *when* an invariant deserves to live in the type system, and the skill to encode it honestly — leaks named, not hidden — is exactly the kind of work that doesn't commoditize, in an era when generating the unconsidered version is nearly free. The code in this post compiles. The illegal states it talks about really don't exist as values. That's the falsifiable part. Everything else is an invitation to check it yourself.

---

*Code shown here is illustrative; the full module is available [here](https://gist.github.com/marianudo/ed58e0421b481e4cc19ab5dfd0bd03c8).*
