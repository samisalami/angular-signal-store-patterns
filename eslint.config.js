import tseslint from 'typescript-eslint';

// The layer boundaries from WHERE-DOES-IT-GO.md as lint rules.
// Each layer is recognised by its file name, so the rules need no per-project wiring:
//   post.ts, user.ts               -> domain
//   *.store.ts, with-*.ts          -> store and store features
//   inject-*.ts, *.component.ts    -> view side
export default tseslint.config(
  { ignores: ['node_modules/**'] },
  {
    files: ['**/*.ts'],
    languageOptions: { parser: tseslint.parser },
  },

  // Domain functions: plain TypeScript, nothing else.
  {
    files: ['01-domain-functions/**/post.ts', 'shared/user.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@angular/*', '@ngrx/*', 'rxjs', 'rxjs/*'],
              message: 'Domain functions are plain TypeScript. Code that needs Angular or NgRx belongs in a store or an inject function.',
            },
          ],
        },
      ],
    },
  },

  // Stores and store features: state only, no view concerns.
  {
    files: ['**/*.store.ts', '**/with-*.ts', '**/create-*.ts'],
    // Option B of chapter 3 breaks this rule on purpose: it is the example of what not to do.
    ignores: ['03-component-access/b-store-view-methods/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@angular/router'],
              message: 'Stores do not navigate. Put navigation in an inject function or a component.',
            },
            {
              group: ['**/*.component', '**/inject-*'],
              message: 'Stores must not depend on the view side.',
            },
          ],
        },
      ],
    },
  },

  // View side: components, inject functions and component services.
  // They read stores and call store methods, but never change state or talk to the server themselves.
  {
    files: ['**/*.component.ts', '**/inject-*.ts', '**/*.service.ts'],
    ignores: ['**/*.spec.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@ngrx/signals',
              importNames: ['patchState'],
              message: 'Only stores change state. Add a store method and call that.',
            },
          ],
          patterns: [
            {
              group: ['**/*-api'],
              message: 'Only stores talk to the server. Add a store method and call that.',
            },
          ],
        },
      ],
    },
  },
);
