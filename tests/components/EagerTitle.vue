<script setup lang="ts">
// Coercing in setup snapshots the string once: setup does not re-run, so this
// deliberately does NOT track the locale. Used to pin that documented footgun.
import {trans} from '../../src'

const title = trans('Welcome!').value
</script>

<template>
    <h1 data-testid="title">{{ title }}</h1>
</template>
