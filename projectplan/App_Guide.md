## Grill the user relentlessly about a plan or design. Used when the user wants to stress-test a plan before building, or uses any 'grill' trigger phrases.


# This will be invoked when the user wants to create a PRD. You may skip steps if you don't consider them necessary.

5. Ask the user for a long, detailed description of the problem they want to solve and any potential ideas for solutions.

6. Explore the repo to verify their assertions and understand the current state of the codebase.

7. Interview the user relentlessly about every aspect of this plan until you reach a shared understanding. Walk down each branch of the design tree, resolving dependencies between decisions one-by-one.

8. Sketch out the major modules you will need to build or modify to complete the implementation. Actively look for opportunities

# Test-Driven Development

9. Focus on Test-driven development. Usd when the user wants to build features or fix bugs test-first, mentions "red-green-refactor", or wants integration tests.

10. When exploring the codebase, read `CONTEXT.md` (if it exists) so test names and interface vocabulary match the project's domain language, and respect ADRs in the area you're touching.

**vertical slices** instead — one test → one implementation → repeat, each test a 
**tracer bullet** that responds to what the last cycle taught you.

## Rules of the loop

11. Write the failing test first, then only enough code to pass it. Don't anticipate future tests or add speculative features.


