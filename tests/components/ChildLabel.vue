<script setup lang="ts">
import type {TranslationHandle} from '../../src'

defineProps<{ label: TranslationHandle }>()
</script>

<template>
    <span data-testid="child">{{ label }}</span>
</template>
