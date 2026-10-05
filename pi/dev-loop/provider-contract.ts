export const CONTRACT_VERSION = 1;
export const PROVIDER_REQUEST = "dev-loop:providers";
export const BASE_REQUEST = "dev-loop:base";
export const ACTIONS = [
  "developing",
  "debugging",
  "writing-specs",
  "creating-stories",
  "reviewing-prs",
  "testing-prs",
  "addressing-pr-comments",
] as const;
export type Action = (typeof ACTIONS)[number];
export type SkillName = `dev-loop-${string}`;
export interface Provider {
  version: 1;
  id: string;
  root: string;
  skills: Record<SkillName, string>;
  requiredFiles: string[];
}
export interface ProviderRequest {
  register: (declaration: unknown) => void;
}
export interface BaseDescriptor {
  version: 1;
  skills: Record<`dev-loop-${Action}`, string>;
}
export interface BaseRequest {
  accept: (base: BaseDescriptor) => void;
}
export interface Selection {
  provider: Provider;
  base: BaseDescriptor;
}
