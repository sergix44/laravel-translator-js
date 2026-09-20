<script setup lang="ts">
// Declares the prop as a plain string, the way a third-party component would.
defineProps<{ title: string }>()
</script>

<template>
    <h2 data-testid="typed">{{ title }}</h2>
</template>
