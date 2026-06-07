export function createProductKey(value: string) {
  const cyrillicTranslit: Record<string, string> = {
    а: "a",
    б: "b",
    в: "v",
    г: "g",
    д: "d",
    е: "e",
    ё: "e",
    ж: "zh",
    з: "z",
    и: "i",
    й: "y",
    к: "k",
    л: "l",
    м: "m",
    н: "n",
    о: "o",
    п: "p",
    р: "r",
    с: "s",
    т: "t",
    у: "u",
    ф: "f",
    х: "h",
    ц: "c",
    ч: "ch",
    ш: "sh",
    щ: "sch",
    ы: "y",
    э: "e",
    ю: "yu",
    я: "ya"
  };

  return value
    .trim()
    .toLowerCase()
    .replace(/[а-яё]/g, (letter) => cyrillicTranslit[letter] ?? letter)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
