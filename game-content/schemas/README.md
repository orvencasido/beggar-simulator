# Editor schemas

JSON Schema files provide editor hints for every authoring file and the compiled catalog. Associate each `game-content/<section>.json` with its `schemas/<section>.schema.json` in your editor. Arrays remain plain arrays; do not add a `$schema` record to game content.

The shared TypeScript validator is authoritative. It additionally checks supported behavior versions, monetary limits, unique stable IDs, cross-file references, course offerings, item unlock cycles, experience reachability and available starter food. Run `content:validate` before compilation/publication even when the editor reports no errors.
