import { createEslintConfig } from "@hyperleda/eslint-config";

export default createEslintConfig({
  tsconfigRootDir: import.meta.dirname,
});
