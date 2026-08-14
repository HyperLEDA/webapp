import texts from "../assets/texts.json";

export interface Resource {
  Title: string;
}

export function getResource(key: string): Resource {
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
