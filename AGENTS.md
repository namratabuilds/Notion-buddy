<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Bloom architecture
- Persist local-first planner state in a versioned Dexie IndexedDB store, updated transactionally with a shared event log, so offline records survive refreshes without account setup.
- Keep pure capacity, timer, health and milestone calculations separate from React views so critical rules can be tested independently.
- Mount the shared Bloom provider and navigation shell in the root route, with each of the five screens as a metadata-owning leaf route, so navigation preserves one consistent state.
- Use controllable semantic-token SVG botanical artwork for plant growth, so leaves and flowers correspond to recorded activity rather than decorative random progress.
