import texts from "./texts.json";

export interface Resource {
  Title: string;
}

export function getResource(key: string): Resource {
  // SAFETY: `key` is checked with `in` before indexing `texts.title`.
  const titleProp = key as keyof typeof texts.title;

  if (titleProp in texts.title) {
    return {
      Title: String(texts.title[titleProp]),
    };
  }

  return {
    Title: key,
  };
}
