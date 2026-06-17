/** Default: highest-quality model for notes/previous-year supplement (override via ANTHROPIC_MODEL). */
export const DEFAULT_ANTHROPIC_MODEL = 'claude-opus-4-8';

export function getAnthropicModel(): string {
  const override = Deno.env.get('ANTHROPIC_MODEL')?.trim();
  return override || DEFAULT_ANTHROPIC_MODEL;
}
