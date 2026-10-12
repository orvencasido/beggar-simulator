# Lifetime game verification

Unit, rules, real SQL and Edge handler integration:

```sh
npm test
npm run lint
npm run typecheck
```

Browser tests use an exported static bundle. They start their own temporary localhost server, close it and Chromium in `finally`, and never start Expo. Clear Metro's cache when switching `EXPO_PUBLIC_GAME_MODE`; otherwise an export can reuse the other mode's inlined environment values.

```sh
EXPO_PUBLIC_GAME_MODE=demo npx expo export --clear --platform web --output-dir /tmp/beggar-v2-demo
TEST_STATIC_DIR=/tmp/beggar-v2-demo npm run test:browser-v2

EXPO_PUBLIC_GAME_MODE=cloud npx expo export --clear --platform web --output-dir /tmp/beggar-v2-cloud
RUN_CLOUD_TESTS=1 TEST_STATIC_DIR=/tmp/beggar-v2-cloud npm run test:browser-cloud-v2
```

The demo checks 320/393 widths, light/dark views, work/care, college, shopping, banking, Journey and Leaders. Fixture balances affect only isolated local practice saves. Screenshots land in `/tmp/beggar-v2-preview/`.

The cloud check creates a fresh isolated guest in the configured Supabase project. It verifies a local tap sends no gameplay request, drops a response after the real server commits, then cold-reloads and checks the exact receipt credits one day once. It also checks the automatically earned legacy title and that deliberately hiding the title persists. It does not reuse an existing player's session or edit ranked balances. Its guest remains private; clean test identities through an administrative lifecycle if needed.

Native bundle verification (no dev server or signed installable build):

```sh
EXPO_PUBLIC_GAME_MODE=cloud npx expo export --clear --platform all --output-dir /tmp/beggar-v2-all
```

Native exports prove bundling, not physical-device interaction. Device testing remains a separate release check.
