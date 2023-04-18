module.exports = {
  env: {
    browser: false,
    es2020: true,
  },
  ignorePatterns: ["lib/**"],
  root: true,
  overrides: [
    {
      files: ["src/**/*.ts", "src/**/*.tsx"],
      plugins: ["@typescript-eslint"],
      extends: ["eslint:recommended", "plugin:@typescript-eslint/recommended"],
      parser: "@typescript-eslint/parser",
      parserOptions: {
        project: ["./tsconfig.json"],
      },
    },
  ],
};
