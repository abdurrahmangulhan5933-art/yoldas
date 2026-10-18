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

## Application conventions
- Keep content pages in TanStack file routes and share the Turkish platform shell through the platform module so navigation, channels, and radio controls stay consistent.
- Define the visual system and responsive layouts in `src/styles.css`; use semantic tokens for all feature colors so shared pages stay consistent when the palette changes.
- Keep this iteration explicitly frontend-only: sample channels, traffic, news, profiles, and messages must not be represented as verified live services.
- Use manifest-only home-screen support; do not add offline caching or service workers without an explicit offline requirement.
- Keep driver calculations in browser-safe pure functions with focused tests (`src/lib/driver-tools.ts`). Driver tools (trip cost, document tracker, border checklist) are helpers only and must not claim to replace official documents, regulations or a tachograph. The home screen intentionally has no tachograph/drive-time counter.
- User-generated chat content must keep the report (flag) and block actions; reports go to `message_reports` in Supabase. Admin rights come from the `admins` table (`is_admin()`), never from "any signed-in user".
