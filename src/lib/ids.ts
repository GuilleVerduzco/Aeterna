import { customAlphabet } from "nanoid";

const alphabet = "0123456789abcdefghijklmnopqrstuvwxyz";
const nanoid = customAlphabet(alphabet, 12);

export function newJobId(): string {
  return `job_${nanoid()}`;
}

export function newFindingId(category: string, slug: string): string {
  return `${category}.${slug}`;
}
