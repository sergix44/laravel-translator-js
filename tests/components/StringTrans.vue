<script setup lang="ts">
import {__, trans_choice} from '../../src/vue'
import TypedProp from './TypedProp.vue'
</script>

<template>
    <h1 data-testid="title">{{ __('Welcome!') }}</h1>
    <p data-testid="cars">{{ trans_choice('domain.car.car', 2) }}</p>

    <!-- The case that failed to type-check with a handle. -->
    <TypedProp :title="__('Welcome!')"/>

    <!-- Attribute binding needs no .value now: strings compare by value. -->
    <input data-testid="input" :placeholder="__('Welcome!')">
</template>
