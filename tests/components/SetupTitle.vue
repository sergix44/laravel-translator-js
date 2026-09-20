<script setup lang="ts">
import {trans, trans_choice} from '../../src'

const title = trans('Welcome!')
const greeting = trans('Welcome, :name!', {name: 'John'})
const cars = trans_choice('domain.car.car', 2)
</script>

<template>
    <!-- Text interpolation re-reads the handle on every render. -->
    <h1 data-testid="title">{{ title }}</h1>
    <p data-testid="greeting">{{ greeting }}</p>
    <p data-testid="cars">{{ cars }}</p>

    <!-- Attribute bindings are diffed by reference, so a hoisted handle never
         looks changed to Vue. These three forms are what works. -->
    <input data-testid="by-value" :placeholder="title.value">
    <input data-testid="by-inline" :placeholder="trans('Welcome!')">
    <input data-testid="by-string" :placeholder="String(title)">

    <!-- The form that silently does not update. -->
    <input data-testid="by-handle" :placeholder="title">
</template>
