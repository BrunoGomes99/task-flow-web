// @ts-check
const fs = require('fs');
const path = require('path');
const eslint = require('@eslint/js');
const { defineConfig } = require('eslint/config');
const tseslint = require('typescript-eslint');
const angular = require('angular-eslint');
const eslintConfigPrettier = require('eslint-config-prettier/flat');

const featuresRoot = path.join(__dirname, 'src/app/features');

/** @returns {string[]} */
function featureNames() {
  if (!fs.existsSync(featuresRoot)) {
    return [];
  }

  return fs
    .readdirSync(featuresRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);
}

/**
 * @param {string} value
 * @returns {string}
 */
function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Feature names come from the folder tree, so a new feature is covered without
// editing a hand-maintained allow-list.
function featureBoundaryConfigs() {
  const names = featureNames();

  return names.flatMap((feature) => {
    const others = names.filter((name) => name !== feature);
    if (others.length === 0) {
      return [];
    }

    const alternation = others.map((name) => escapeRegex(name)).join('|');
    const message =
      'A feature cannot import another feature. Put app-wide code in core and generic code in shared.';

    return [
      {
        files: [`src/app/features/${feature}/**/*.ts`],
        rules: {
          'no-restricted-imports': [
            'error',
            {
              patterns: [
                {
                  regex: `^@features/(?:${alternation})(?:/|$)`,
                  message,
                },
                {
                  regex: `^(?:\\.\\./)+(?:${alternation})(?:/|$)`,
                  message,
                },
              ],
            },
          ],
        },
      },
    ];
  });
}

module.exports = defineConfig([
  {
    ignores: ['dist/**', 'coverage/**', '.angular/**', 'out-tsc/**', 'tmp/**'],
  },
  {
    files: ['**/*.ts'],
    extends: [
      eslint.configs.recommended,
      tseslint.configs.recommended,
      tseslint.configs.stylistic,
      angular.configs.tsRecommended,
      eslintConfigPrettier,
    ],
    processor: angular.processInlineTemplates,
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@angular-eslint/directive-selector': [
        'error',
        {
          type: 'attribute',
          prefix: 'app',
          style: 'camelCase',
        },
      ],
      '@angular-eslint/component-selector': [
        'error',
        {
          type: 'element',
          prefix: 'app',
          style: 'kebab-case',
        },
      ],
    },
  },
  {
    files: ['src/app/shared/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              regex: '^@(?:core|features)(?:/|$)',
              message: 'shared cannot import core or features. It must stay app-agnostic.',
            },
            {
              regex: '^(?:\\.\\./)+(?:core|features)(?:/|$)',
              message: 'shared cannot import core or features. It must stay app-agnostic.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/app/core/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              regex: '^@features(?:/|$)',
              message:
                'core cannot import features. Put app-wide code in core and generic code in shared.',
            },
            {
              regex: '^(?:\\.\\./)+features(?:/|$)',
              message:
                'core cannot import features. Put app-wide code in core and generic code in shared.',
            },
          ],
        },
      ],
    },
  },
  ...featureBoundaryConfigs(),
  {
    files: ['**/*.html'],
    extends: [
      angular.configs.templateRecommended,
      angular.configs.templateAccessibility,
      eslintConfigPrettier,
    ],
    rules: {},
  },
]);
