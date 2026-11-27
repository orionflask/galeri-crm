import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  // "prettier" last: turns off rules that conflict with Prettier formatting.
  ...compat.extends("next/core-web-vitals", "next/typescript", "prettier"),
  {
    // Tenant isolation (CLAUDE.md §5): tenant data must go through the tenant-scoped
    // client from "@/server/tenant". The global client is only allowed in the files
    // listed in the override below.
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@/lib/db",
              message:
                'Use getTenantDb(ctx) from "@/server/tenant". The global client is only for allowlisted cross-tenant code.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ["src/server/tenant/tenant-db.ts", "tests/integration/**"],
    rules: { "no-restricted-imports": "off" },
  },
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "coverage/**",
      "playwright-report/**",
      "test-results/**",
      "src/generated/**",
      "next-env.d.ts",
    ],
  },
];

export default eslintConfig;
