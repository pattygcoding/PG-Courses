<script setup lang="ts">
/**
 * A single icon button that opens an external page.  Used for the portfolio
 * escape hatch and the repository link, so both share one look.
 */
defineProps<{
  href: string
  /** Accessible name for the link. */
  label: string
  /** Tooltip text; falls back to the accessible name. */
  title?: string
}>()
</script>

<template>
  <a
    :href="href"
    target="_blank"
    rel="noopener noreferrer"
    :title="title ?? label"
    :aria-label="label"
    class="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-line/10 bg-ink-950 text-fg-muted transition hover:border-accent/40 hover:text-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent/40"
  >
    <slot />
  </a>
</template>
